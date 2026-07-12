/**
 * 苏格拉底追问与相关建议类型。
 *
 * 包含追问类型、触发条件、问题结构与结果，
 * 以及"可能相关"建议项类型。遵循"Agent 只生成提问，不生成答案"原则。
 *
 * @author fxbin
 */

/**
 * 苏格拉底追问类型，标识 Agent 生成的问题所属的认知追问维度。
 *
 * 设计原则（P11-2 铁律）：
 *  - Agent 只生成提问，不生成答案
 *  - 提问引导用户自己思考，不代写认知
 *  - 镜子不保姆：反映用户当前认知状态，不替代用户建构
 *
 * 五种追问维度：
 *  - definition_clarity 定义澄清：追问概念边界与定义
 *  - evidence_probe 证据追问：追问支撑论断的证据来源
 *  - counterexample_challenge 反例挑战：追问是否存在反例
 *  - boundary_probe 边界追问：追问适用范围与失效条件
 *  - connection_probe 关联追问：追问与其他概念的关系
 *
 * @author fxbin
 */
export type SocraticQuestionType =
  | 'definition_clarity'
  | 'evidence_probe'
  | 'counterexample_challenge'
  | 'boundary_probe'
  | 'connection_probe';

/**
 * 苏格拉底追问触发来源，标识问题生成的上下文。
 *  - skeleton_card 骨架卡待建构时触发
 *  - semantic_tension 语义张力检测到认知冲突时触发
 *  - manual 用户主动请求追问
 * @author fxbin
 */
export type SocraticTrigger = 'skeleton_card' | 'semantic_tension' | 'manual';

/**
 * 单条苏格拉底追问。
 *
 * 注意：rationale 字段是系统内部使用的提问理由（供可审计性），
 * 不应展示给用户作为"答案提示"。question 字段才是展示给用户的问题。
 *
 * @author fxbin
 */
export interface SocraticQuestion {
  question: string;
  type: SocraticQuestionType;
  rationale: string;
  targetCardId?: string;
}

/**
 * 苏格拉底追问结果。
 *
 * @author fxbin
 */
export interface SocraticQuestioningResult {
  workspaceId: string;
  questions: SocraticQuestion[];
  triggerContext: {
    trigger: SocraticTrigger;
    cardId?: string;
    tensionKey?: string;
  };
  generatedAt: string;
}

/**
 * "可能相关"建议项（P10-4）。
 *
 * 基于 Recall Agent 检索结果生成，展示在侧边栏供用户参考。
 * 用户可忽略（dismiss）或否决（reject），这两种操作仅影响前端展示，不持久化。
 *
 * 设计原则：
 *  - 镜子不保姆：只提供检索建议，不替代用户决策
 *  - 提议权不写入权：建议不自动修改任何数据
 *
 * @author fxbin
 */
export interface RelatedSuggestion {
  cardId: string;
  title: string;
  relevanceScore: number;
  recalledBy: string;
  reason: string;
}

/**
 * "可能相关"建议结果（P10-4）。
 *
 * @author fxbin
 */
export interface RelatedSuggestionsResult {
  workspaceId: string;
  currentCardId?: string;
  suggestions: RelatedSuggestion[];
  generatedAt: string;
}
