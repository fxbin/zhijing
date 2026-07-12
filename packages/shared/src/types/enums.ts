/**
 * 枚举类型集合。
 *
 * 收纳项目中所有以 type union 形式定义的枚举类型，
 * 作为各功能域的基础引用源。不含 as const 数组 + typeof 派生对
 * （那些与其运行时常量一同留在各自的功能域文件中）。
 *
 * @author fxbin
 */

export type IntakeKind = 'theme' | 'link' | 'question' | 'text';

export type WorkspaceStage = 'ai_skeleton' | 'organizing' | 'grounded';

export type MaterialType = 'link' | 'text' | 'question' | 'topic';

export type ParseStatus = 'saved' | 'parsing' | 'needs_review' | 'ingested' | 'failed';

export type TaskStatus = 'queued' | 'running' | 'succeeded' | 'failed' | 'needs_user_action';

export type CardType = 'concept' | 'method' | 'case' | 'question' | 'step' | 'viewpoint';

export type ClaimStatus = 'ai_skeleton' | 'sourced' | 'user_confirmed' | 'unsupported';

export type KnowledgeKitId = 'learning_research' | 'content_creation' | 'product_research' | 'topic_decomposition';

/**
 * 资料归档状态。
 * @author fxbin
 */
export type ArchiveStatus = 'active' | 'archived';
