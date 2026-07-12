/**
 * 文件同步模块共享常量。
 *
 * 集中存放 file-sync 子模块各文件复用的目录名、默认值与合法值集合，
 * 避免散点维护。原子写入相关的私有常量留在 atomic-write.ts 内部。
 *
 * @author fxbin
 */

import type {
  MaterialType,
  CardType,
  ClaimStatus,
  ParseStatus,
  WorkspaceStage,
} from '@zhijing/shared';
import { EMPTY_STRING } from '../common/constants.js';

/**
 * 卡片子目录名。
 */
const CARDS_DIR_NAME = 'cards';

/**
 * 资料子目录名。
 */
const MATERIALS_DIR_NAME = 'materials';

/**
 * 派生数据目录名（扫描时跳过）。
 */
const ZHIDING_DIR_NAME = '.zhijing';

/**
 * 知识库元数据文件名。
 */
const KNOWLEDGE_BASE_FILE_NAME = 'knowledge-base.md';

/**
 * 知识库默认阶段。
 */
const DEFAULT_KB_STAGE: WorkspaceStage = 'ai_skeleton';

/**
 * 资料默认类型。
 */
const DEFAULT_MATERIAL_TYPE: MaterialType = 'text';

/**
 * 卡片默认类型。
 */
const DEFAULT_CARD_TYPE: CardType = 'concept';

/**
 * 卡片默认主张状态。
 */
const DEFAULT_CLAIM_STATUS: ClaimStatus = 'ai_skeleton';

/**
 * 资料默认解析状态。
 */
const DEFAULT_PARSE_STATUS: ParseStatus = 'ingested';

/**
 * 默认已溯源比例。
 */
const DEFAULT_SOURCED_RATIO = 0;

/**
 * 默认记忆间隔重复 ease 值。
 */
const DEFAULT_RECALL_EASE = 0;

/**
 * 默认记忆间隔重复 interval 值。
 */
const DEFAULT_RECALL_INTERVAL = 0;

/**
 * 默认记忆间隔重复 dueAt 值。
 */
const DEFAULT_RECALL_DUE_AT = EMPTY_STRING;

/**
 * 已溯源主张状态。
 */
const SOURCED_CLAIM_STATUS: ClaimStatus = 'sourced';

/**
 * 同名文件冲突时序号起始值。
 */
const FILE_NAME_DUPLICATE_START = 2;

/**
 * 合法的资料类型集合。
 */
const VALID_MATERIAL_TYPES: readonly string[] = ['link', 'text', 'question', 'topic'];

/**
 * 合法的卡片类型集合。
 */
const VALID_CARD_TYPES: readonly string[] = ['concept', 'method', 'case', 'question', 'step', 'viewpoint'];

/**
 * 合法的主张状态集合。
 */
const VALID_CLAIM_STATUSES: readonly string[] = ['ai_skeleton', 'sourced', 'user_confirmed', 'unsupported'];

/**
 * 合法的解析状态集合。
 */
const VALID_PARSE_STATUSES: readonly string[] = ['saved', 'parsing', 'needs_review', 'ingested', 'failed'];

/**
 * 合法的知识库阶段集合。
 */
const VALID_KB_STAGES: readonly string[] = ['ai_skeleton', 'organizing', 'grounded'];

export {
  CARDS_DIR_NAME,
  MATERIALS_DIR_NAME,
  ZHIDING_DIR_NAME,
  KNOWLEDGE_BASE_FILE_NAME,
  DEFAULT_KB_STAGE,
  DEFAULT_MATERIAL_TYPE,
  DEFAULT_CARD_TYPE,
  DEFAULT_CLAIM_STATUS,
  DEFAULT_PARSE_STATUS,
  DEFAULT_SOURCED_RATIO,
  DEFAULT_RECALL_EASE,
  DEFAULT_RECALL_INTERVAL,
  DEFAULT_RECALL_DUE_AT,
  SOURCED_CLAIM_STATUS,
  FILE_NAME_DUPLICATE_START,
  VALID_MATERIAL_TYPES,
  VALID_CARD_TYPES,
  VALID_CLAIM_STATUSES,
  VALID_PARSE_STATUSES,
  VALID_KB_STAGES,
};
