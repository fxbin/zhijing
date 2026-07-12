/**
 * Markdown 文件 frontmatter 元数据类型定义。
 *
 * 定义卡片 / 资料 / 知识库三类实体在 Markdown 文件 `---` 块中的结构化字段，
 * 是文件格式层面的类型，对应但区别于应用层 domain 实体。
 *
 * @author fxbin
 */

/**
 * 卡片 frontmatter 元数据结构。
 *
 * 对应 Markdown 文件中 `---` 之间的 YAML 内容，
 * 是文件格式层面的类型，与应用层 KnowledgeCard 部分字段对应。
 *
 * @author fxbin
 */
export interface CardFrontmatter {
  id: string;
  type: string;
  claimStatus: string;
  workspaceId?: string;
  materialId?: string;
  recall?: {
    ease?: number;
    interval?: number;
    reps?: number;
    dueAt?: string;
  };
  tags?: string[];
  related?: string[];
  createdAt: string;
  updatedAt: string;
  archived?: boolean;
}

/**
 * 资料 frontmatter 元数据结构。
 *
 * 对应 Markdown 文件中 `---` 之间的 YAML 内容，
 * 是文件格式层面的类型，与应用层 MaterialRecord 部分字段对应。
 *
 * @author fxbin
 */
export interface MaterialFrontmatter {
  id: string;
  type: string;
  workspaceId?: string;
  sourceUrl?: string;
  platform?: string;
  parseStatus: string;
  mediaUrls?: string[];
  createdAt: string;
  archived?: boolean;
}

/**
 * 知识库元数据 frontmatter 结构。
 *
 * 对应知识库文件夹根目录下 `knowledge-base.md` 文件的 frontmatter，
 * 存储知识库的不可推断元数据（id、summary、stage 等）。
 * sourceCount / cardCount / sourcedRatio 为派生数据，重建时从文件扫描结果计算，不持久化。
 *
 * @author fxbin
 */
export interface WorkspaceFrontmatter {
  id: string;
  title: string;
  summary: string;
  stage: string;
  createdAt: string;
  updatedAt: string;
}
