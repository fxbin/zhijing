/**
 * 全局洞察与知识库建构进度类型。
 *
 * 包含全局洞察（跨工作区汇总）、工作区预览、建构阶段与建构进度报告。
 * 用于首页仪表盘与"骨架卡强制建构流程"引导。
 *
 * @author fxbin
 */

import type { CardType, ClaimStatus, WorkspaceStage } from './enums.js';
import type { EvidenceFeedback } from './agent-log.js';

export interface GlobalInsights {
  generatedAt: string;
  totals: {
    workspaces: number;
    materials: number;
    cards: number;
    sourcedCards: number;
    artifacts: number;
    tasks: number;
  };
  growth: {
    labels: string[];
    data: number[];
  };
  sourceDistribution: {
    name: string;
    count: number;
    ratio: number;
  }[];
  recentCards: {
    id: string;
    workspaceId: string;
    workspaceTitle: string;
    title: string;
    body: string;
    type: CardType;
    claimStatus: ClaimStatus;
    createdAt: string;
  }[];
  mapPreview: {
    nodeCount: number;
    edgeCount: number;
    workspaceCount: number;
    workspaces: GlobalInsightsWorkspacePreview[];
  };
  /**
   * Evidence 飞轮反馈聚合（accept_rate 作为"镜子不保姆"可测量指标）。
   * 基于 agent_action_log 中 accept_proposed_cards 动作聚合。
   */
  evidence: EvidenceFeedback;
}

/**
 * 洞察页单个工作区预览项，用于在「知识地图预览」卡片内
 * 以可点击网格的形式展示，用户点击后进入对应工作区详情。
 *
 * @author fxbin
 */
export interface GlobalInsightsWorkspacePreview {
  id: string;
  title: string;
  cardCount: number;
  sourcedRatio: number;
  stage: WorkspaceStage;
}

/**
 * 知识库建构阶段。
 *
 * 基于骨架卡（ai_skeleton）占比划分：
 *  - seedling 幼苗期：骨架卡占比 > 60%，知识库仍以 AI 生成为主
 *  - growing 成长期：骨架卡占比 30%-60%，用户正在主动建构
 *  - mature 成熟期：骨架卡占比 < 30%，建构接近完成
 *
 * @author fxbin
 */
export type ConstructionStage = 'seedling' | 'growing' | 'mature';

/**
 * 知识库建构进度报告。
 *
 * 用于"骨架卡强制建构流程"（P11-1），量化用户认知劳动量，
 * 引导用户从 AI 骨架转向自主建构。
 *
 * @author fxbin
 */
export interface ConstructionProgress {
  workspaceId: string;
  totalCards: number;
  skeletonCards: number;
  confirmedCards: number;
  sourcedCards: number;
  unsupportedCards: number;
  skeletonRatio: number;
  confirmedRatio: number;
  sourcedRatio: number;
  constructionStage: ConstructionStage;
  suggestedAction: string;
}
