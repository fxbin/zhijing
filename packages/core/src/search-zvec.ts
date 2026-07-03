/**
 * Zvec 全文检索引擎封装（方案 A：FTS + jieba 分词）。
 *
 * 用 Zvec FTS + jieba 分词器替换 SQLite FTS5 + unicode61，
 * 解决中文长句不分词导致检索命中率近 0 的问题。
 *
 * 设计要点：
 * - in-process 文件型，与 better-sqlite3 同质，零运维
 * - jieba tokenizer 自带词典，无需额外配置
 * - cards / materials 两个集合，各自维护 title+body 合并的 search_text FTS 字段
 * - 标量字段 workspace_id / archived 用于过滤
 * - 索引同步在 SqliteKnowledgeRepository 的写方法里 hook
 * - 检索只返回 id + score，完整记录由调用方从 SQLite 取，职责分离
 *
 * @module search-zvec
 * @author fxbin
 */

import {
  ZVecCollection,
  ZVecCollectionSchema,
  ZVecCreateAndOpen,
  ZVecDataType,
  ZVecIndexType,
  ZVecOpen,
  type ZVecDoc,
} from '@zvec/zvec';
import { mkdirSync, existsSync, writeFileSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Zvec 数据目录环境变量名。
 */
const ZVEC_DATA_DIR_ENV = 'ZHIJING_ZVEC_DIR';

/**
 * core 包模块目录到 monorepo 根目录的上溯层级。
 * packages/core/dist/ 或 packages/core/src/ 到根目录均为 3 级。
 */
const MONOREPO_ROOT_ASCENT = 3;

/**
 * 推导 monorepo 根目录绝对路径。
 * 基于 import.meta.url 解析，避免 process.cwd() 在子目录启动时指向错误位置。
 * @returns monorepo 根目录绝对路径
 * @author fxbin
 */
function resolveProjectRoot(): string {
  const moduleDir = dirname(fileURLToPath(import.meta.url));
  let dir = moduleDir;
  for (let i = 0; i < MONOREPO_ROOT_ASCENT; i += 1) {
    dir = dirname(dir);
  }
  return dir;
}

/**
 * monorepo 根目录缓存，模块加载时计算一次。
 */
const PROJECT_ROOT = resolveProjectRoot();

/**
 * 默认 Zvec 数据目录名（相对 .data）。
 */
const ZVEC_DEFAULT_DIR_NAME = 'zvec';

/**
 * 卡片检索集合名。
 */
const CARDS_COLLECTION_NAME = 'cards_search';

/**
 * 资料检索集合名。
 */
const MATERIALS_COLLECTION_NAME = 'materials_search';

/**
 * FTS 字段名（title + body 合并后索引）。
 */
const SEARCH_TEXT_FIELD = 'search_text';

/**
 * 工作区 id 标量字段名。
 */
const WORKSPACE_ID_FIELD = 'workspace_id';

/**
 * 归档标记标量字段名。
 */
const ARCHIVED_FIELD = 'archived';

/**
 * 卡片类型标量字段名。
 */
const CARD_TYPE_FIELD = 'card_type';

/**
 * 资料类型标量字段名。
 */
const MATERIAL_TYPE_FIELD = 'material_type';

/**
 * 来源平台标量字段名。
 */
const PLATFORM_FIELD = 'platform';

/**
 * jieba 分词器名称。
 */
const JIEBA_TOKENIZER = 'jieba';

/**
 * 小写 token filter。
 */
const LOWERCASE_FILTER = 'lowercase';

/**
 * 默认检索返回条数上限。
 */
const DEFAULT_SEARCH_LIMIT = 8;

/**
 * 检索关键词最大长度，超过则截断，避免超长输入导致 FTS 性能问题。
 */
const ZVEC_QUERY_MAX_LENGTH = 256;

/**
 * Zvec FTS 查询特殊字符正则，匹配后替换为空格，避免查询语法注入。
 */
const ZVEC_SPECIAL_CHARS_PATTERN = /["*:(\-+)^]/g;

/**
 * 多个空白字符合并为单个空格的正则。
 */
const ZVEC_WHITESPACE_PATTERN = /\s+/g;

/**
 * search_text 字段中 title 与 body 的分隔符。
 */
const SEARCH_TEXT_SEPARATOR = '\n';

/**
 * 未归档标记值（archived = 0）。
 */
const ARCHIVED_FALSE = 0;

/**
 * workspaceId 缺失时的兜底值。
 */
const DEFAULT_WORKSPACE_ID = 'default';

/**
 * 索引初始化完成标记文件名。
 */
const INITIALIZED_MARKER_FILENAME = '.zvec-initialized';

/**
 * 清空集合时使用的 filter（匹配所有文档）。
 */
const CLEAR_ALL_FILTER = `${WORKSPACE_ID_FIELD} != ''`;

/**
 * 卡片索引输入（KnowledgeCard 的子集，避免类型耦合）。
 */
export interface CardIndexInput {
  id: string;
  workspaceId?: string;
  type: string;
  title: string;
  body: string;
  archived: boolean;
}

/**
 * 资料索引输入（MaterialRecord 的子集，避免类型耦合）。
 */
export interface MaterialIndexInput {
  id: string;
  workspaceId?: string;
  type: string;
  title: string;
  contentText?: string;
  rawInput?: string;
  platform?: string;
  archived: boolean;
}

/**
 * 检索命中结果（id + BM25 分数）。
 */
export interface ZvecSearchHit {
  id: string;
  score: number;
}

let cardsCollection: ZVecCollection | null = null;
let materialsCollection: ZVecCollection | null = null;
let zvecDir = '';

/**
 * 默认 Zvec 数据目录：优先读 ZHIJING_ZVEC_DIR，否则 .data/zvec。
 * @returns Zvec 数据目录绝对路径
 * @author fxbin
 */
function defaultZvecDataDir(): string {
  return process.env[ZVEC_DATA_DIR_ENV] ?? join(PROJECT_ROOT, '.data', ZVEC_DEFAULT_DIR_NAME);
}

/**
 * 构造卡片检索集合 schema。
 * 标量字段：workspace_id / card_type / archived；FTS 字段：search_text（jieba）。
 * @returns 卡片集合 schema
 * @author fxbin
 */
function buildCardSchema(): ZVecCollectionSchema {
  return new ZVecCollectionSchema({
    name: CARDS_COLLECTION_NAME,
    fields: [
      { name: WORKSPACE_ID_FIELD, dataType: ZVecDataType.STRING, nullable: false },
      { name: CARD_TYPE_FIELD, dataType: ZVecDataType.STRING, nullable: false },
      { name: ARCHIVED_FIELD, dataType: ZVecDataType.INT32, nullable: false },
      {
        name: SEARCH_TEXT_FIELD,
        dataType: ZVecDataType.STRING,
        nullable: false,
        indexParams: {
          indexType: ZVecIndexType.FTS,
          tokenizerName: JIEBA_TOKENIZER,
          filters: [LOWERCASE_FILTER],
        },
      },
    ],
  });
}

/**
 * 构造资料检索集合 schema。
 * 标量字段：workspace_id / material_type / platform / archived；FTS 字段：search_text（jieba）。
 * @returns 资料集合 schema
 * @author fxbin
 */
function buildMaterialSchema(): ZVecCollectionSchema {
  return new ZVecCollectionSchema({
    name: MATERIALS_COLLECTION_NAME,
    fields: [
      { name: WORKSPACE_ID_FIELD, dataType: ZVecDataType.STRING, nullable: false },
      { name: MATERIAL_TYPE_FIELD, dataType: ZVecDataType.STRING, nullable: false },
      { name: PLATFORM_FIELD, dataType: ZVecDataType.STRING, nullable: false },
      { name: ARCHIVED_FIELD, dataType: ZVecDataType.INT32, nullable: false },
      {
        name: SEARCH_TEXT_FIELD,
        dataType: ZVecDataType.STRING,
        nullable: false,
        indexParams: {
          indexType: ZVecIndexType.FTS,
          tokenizerName: JIEBA_TOKENIZER,
          filters: [LOWERCASE_FILTER],
        },
      },
    ],
  });
}

/**
 * 初始化 Zvec 检索引擎（幂等）。
 * 集合目录不存在时创建并打开，已存在时直接打开，避免 path exists 错误。
 *
 * @param dataDir - 可选数据目录；省略时用 defaultZvecDataDir()
 * @author fxbin
 */
export function initZvecSearch(dataDir?: string): void {
  const dir = dataDir ?? defaultZvecDataDir();
  zvecDir = dir;
  mkdirSync(dir, { recursive: true });
  cardsCollection = openOrCreateCollection(join(dir, CARDS_COLLECTION_NAME), buildCardSchema());
  materialsCollection = openOrCreateCollection(join(dir, MATERIALS_COLLECTION_NAME), buildMaterialSchema());
}

function openOrCreateCollection(path: string, schema: ZVecCollectionSchema): ZVecCollection {
  if (existsSync(path)) {
    return ZVecOpen(path);
  }
  return ZVecCreateAndOpen(path, schema);
}

/**
 * 判断 Zvec 检索引擎是否已初始化。
 * @returns 是否就绪
 * @author fxbin
 */
export function isZvecSearchReady(): boolean {
  return cardsCollection !== null && materialsCollection !== null;
}

/**
 * 判断索引是否已标记为初始化完成（用于避免每次启动都全量回填）。
 * @returns 标记文件是否存在
 * @author fxbin
 */
export function isZvecIndexInitialized(): boolean {
  if (!zvecDir) return false;
  return existsSync(join(zvecDir, INITIALIZED_MARKER_FILENAME));
}

/**
 * 标记索引已初始化完成。
 * @author fxbin
 */
export function markZvecIndexInitialized(): void {
  if (!zvecDir) return;
  try {
    writeFileSync(join(zvecDir, INITIALIZED_MARKER_FILENAME), new Date().toISOString());
  } catch {
    // 标记写入失败不阻断，下次启动会重新回填
  }
}

/**
 * 清除初始化标记（下次启动时会触发全量回填）。
 * @author fxbin
 */
export function clearZvecIndexInitializedMarker(): void {
  if (!zvecDir) return;
  try {
    rmSync(join(zvecDir, INITIALIZED_MARKER_FILENAME), { force: true });
  } catch {
    // 静默
  }
}

/**
 * 把一张卡片 upsert 到 Zvec 索引。
 * 失败时仅 warn，不阻断主流程（SQLite 已是数据真相源）。
 *
 * @param card - 卡片索引输入
 * @author fxbin
 */
export function upsertCardInZvec(card: CardIndexInput): void {
  if (!cardsCollection) return;
  try {
    cardsCollection.upsertSync({
      id: card.id,
      fields: {
        [WORKSPACE_ID_FIELD]: card.workspaceId ?? DEFAULT_WORKSPACE_ID,
        [CARD_TYPE_FIELD]: card.type,
        [ARCHIVED_FIELD]: card.archived ? 1 : ARCHIVED_FALSE,
        [SEARCH_TEXT_FIELD]: `${card.title}${SEARCH_TEXT_SEPARATOR}${card.body}`,
      },
    });
  } catch (error) {
    console.warn('[zvec] upsertCard failed', error);
  }
}

/**
 * 把一条资料 upsert 到 Zvec 索引。
 * search_text 由 title + contentText（或 rawInput 兜底）拼接。
 *
 * @param material - 资料索引输入
 * @author fxbin
 */
export function upsertMaterialInZvec(material: MaterialIndexInput): void {
  if (!materialsCollection) return;
  const searchText = [material.title, material.contentText ?? material.rawInput ?? '']
    .filter((part) => part.length > 0)
    .join(SEARCH_TEXT_SEPARATOR);
  try {
    materialsCollection.upsertSync({
      id: material.id,
      fields: {
        [WORKSPACE_ID_FIELD]: material.workspaceId ?? DEFAULT_WORKSPACE_ID,
        [MATERIAL_TYPE_FIELD]: material.type,
        [PLATFORM_FIELD]: material.platform ?? '',
        [ARCHIVED_FIELD]: material.archived ? 1 : ARCHIVED_FALSE,
        [SEARCH_TEXT_FIELD]: searchText,
      },
    });
  } catch (error) {
    console.warn('[zvec] upsertMaterial failed', error);
  }
}

/**
 * 从 Zvec 索引删除指定卡片。
 * @param cardId - 卡片 id
 * @author fxbin
 */
export function deleteCardFromZvec(cardId: string): void {
  if (!cardsCollection) return;
  try {
    cardsCollection.deleteSync(cardId);
  } catch (error) {
    console.warn('[zvec] deleteCard failed', error);
  }
}

/**
 * 从 Zvec 索引删除指定资料。
 * @param materialId - 资料 id
 * @author fxbin
 */
export function deleteMaterialFromZvec(materialId: string): void {
  if (!materialsCollection) return;
  try {
    materialsCollection.deleteSync(materialId);
  } catch (error) {
    console.warn('[zvec] deleteMaterial failed', error);
  }
}

/**
 * 清洗 Zvec FTS 检索关键词。
 * 移除 FTS 查询语法特殊字符，合并多余空白，并截断超长输入。
 * 清洗后为空字符串时表示该查询不应用于检索。
 *
 * @param query - 原始查询字符串
 * @returns 清洗后的查询字符串，可能为空字符串
 * @author fxbin
 */
function sanitizeZvecQuery(query: string): string {
  return query
    .slice(0, ZVEC_QUERY_MAX_LENGTH)
    .replace(ZVEC_SPECIAL_CHARS_PATTERN, ' ')
    .replace(ZVEC_WHITESPACE_PATTERN, ' ')
    .trim();
}

/**
 * 构造工作区 + 未归档的标量过滤表达式。
 * workspaceId 中的单引号会被转义，避免 SQL 注入。
 *
 * @param workspaceId - 工作区 id
 * @returns Zvec filter 字符串
 * @author fxbin
 */
function buildWorkspaceFilter(workspaceId: string): string {
  const ws = (workspaceId ?? DEFAULT_WORKSPACE_ID).replace(/'/g, "''");
  return `${WORKSPACE_ID_FIELD} = '${ws}' AND ${ARCHIVED_FIELD} = ${ARCHIVED_FALSE}`;
}

/**
 * 在指定工作区内按关键词检索卡片（BM25 排序）。
 * 仅返回未归档卡片。失败时返回空数组。
 *
 * @param workspaceId - 工作区 id
 * @param query - 检索关键词（自然语言，jieba 自动分词）
 * @param limit - 返回条数上限，默认 8
 * @returns 命中结果列表（id + score）
 * @author fxbin
 */
export function searchCardsInZvec(
  workspaceId: string,
  query: string,
  limit: number = DEFAULT_SEARCH_LIMIT,
): ZvecSearchHit[] {
  if (!cardsCollection) return [];
  const sanitizedQuery = sanitizeZvecQuery(query);
  if (!sanitizedQuery) return [];
  try {
    const results = cardsCollection.querySync({
      fieldName: SEARCH_TEXT_FIELD,
      fts: { matchString: sanitizedQuery },
      filter: buildWorkspaceFilter(workspaceId),
      topk: limit,
    });
    return results.map((doc: ZVecDoc) => ({ id: doc.id, score: doc.score ?? 0 }));
  } catch (error) {
    console.warn('[zvec] searchCards failed', error);
    return [];
  }
}

/**
 * 在指定工作区内按关键词检索资料（BM25 排序）。
 * 仅返回未归档资料。失败时返回空数组。
 *
 * @param workspaceId - 工作区 id
 * @param query - 检索关键词
 * @param limit - 返回条数上限，默认 8
 * @returns 命中结果列表（id + score）
 * @author fxbin
 */
export function searchMaterialsInZvec(
  workspaceId: string,
  query: string,
  limit: number = DEFAULT_SEARCH_LIMIT,
): ZvecSearchHit[] {
  if (!materialsCollection) return [];
  const sanitizedQuery = sanitizeZvecQuery(query);
  if (!sanitizedQuery) return [];
  try {
    const results = materialsCollection.querySync({
      fieldName: SEARCH_TEXT_FIELD,
      fts: { matchString: sanitizedQuery },
      filter: buildWorkspaceFilter(workspaceId),
      topk: limit,
    });
    return results.map((doc: ZVecDoc) => ({ id: doc.id, score: doc.score ?? 0 }));
  } catch (error) {
    console.warn('[zvec] searchMaterials failed', error);
    return [];
  }
}

/**
 * 重建卡片索引：清空后批量插入，最后 optimize。
 * 用于首次初始化或索引损坏修复。
 *
 * @param cards - 全量卡片列表
 * @returns 成功索引的条数
 * @author fxbin
 */
export function rebuildCardZvecIndex(cards: CardIndexInput[]): number {
  if (!cardsCollection) return 0;
  try {
    cardsCollection.deleteByFilterSync(CLEAR_ALL_FILTER);
  } catch (error) {
    console.warn('[zvec] clear cards before rebuild failed', error);
  }
  for (const card of cards) {
    upsertCardInZvec(card);
  }
  try {
    cardsCollection.optimizeSync();
  } catch (error) {
    console.warn('[zvec] optimize cards failed', error);
  }
  return cards.length;
}

/**
 * 重建资料索引：清空后批量插入，最后 optimize。
 *
 * @param materials - 全量资料列表
 * @returns 成功索引的条数
 * @author fxbin
 */
export function rebuildMaterialZvecIndex(materials: MaterialIndexInput[]): number {
  if (!materialsCollection) return 0;
  try {
    materialsCollection.deleteByFilterSync(CLEAR_ALL_FILTER);
  } catch (error) {
    console.warn('[zvec] clear materials before rebuild failed', error);
  }
  for (const material of materials) {
    upsertMaterialInZvec(material);
  }
  try {
    materialsCollection.optimizeSync();
  } catch (error) {
    console.warn('[zvec] optimize materials failed', error);
  }
  return materials.length;
}

/**
 * 关闭 Zvec 检索引擎（释放集合引用）。
 * @author fxbin
 */
export function closeZvecSearch(): void {
  cardsCollection = null;
  materialsCollection = null;
  zvecDir = '';
}
