/**
 * Agent 提议面板：展示 AI 主动生成的认知提议，包括盲区补充、重复思考、
 * 遗忘复习、主题探索与工作区涌现五类。
 * 守提议权不写入权：除工作区涌现的"创建工作区"按钮外，其余提议只导航到既有动作入口。
 * @module components/AgentProposalsPanel
 */

import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowUpRight, BookOpenCheck, ChevronDown, Library, Lightbulb, MessageCircle, Sparkles } from 'lucide-react';
import EmptyState from './EmptyState';
import api from '../utils/api';

const PROPOSAL_TYPE_ICON = {
  blind_spot: 'blind-spot',
  repeated_thinking: 'repeated-thinking',
  recall_review: 'recall-review',
  topic_explore: 'topic-explore',
  workspace_emergence: 'workspace-emergence',
};

const PROPOSAL_ACTION_ICON = {
  blind_spot: Library,
  repeated_thinking: MessageCircle,
  recall_review: BookOpenCheck,
  topic_explore: MessageCircle,
  workspace_emergence: Sparkles,
};

function proposalKey(proposal, index) {
  const metadata = proposal.metadata ?? {};
  return [
    proposal.type,
    metadata.cardId,
    metadata.term,
    metadata.keyword,
    metadata.representativeQuestion,
    index,
  ].filter(Boolean).join(':');
}

function metadataNumber(value) {
  return typeof value === 'number' ? value : undefined;
}

function metadataString(value) {
  return typeof value === 'string' && value.trim() ? value : undefined;
}

function metadataArray(value) {
  return Array.isArray(value) ? value.filter((item) => typeof item === 'string' && item.trim()) : [];
}

function buildEvidenceRows(proposal, t) {
  const metadata = proposal.metadata ?? {};
  if (proposal.type === 'blind_spot') {
    return [
      t('agentProposals.evidence.interestWeight', { value: metadataNumber(metadata.interestWeight) ?? '-' }),
      t('agentProposals.evidence.coverageScore', { value: metadataNumber(metadata.coverageScore) ?? '-' }),
      t('agentProposals.evidence.coverageAssets', {
        cards: metadataNumber(metadata.totalCards) ?? 0,
        materials: metadataNumber(metadata.totalMaterials) ?? 0,
      }),
    ];
  }
  if (proposal.type === 'repeated_thinking') {
    return [
      t('agentProposals.evidence.repeatCount', { count: metadataNumber(metadata.repeatCount) ?? 0 }),
      t('agentProposals.evidence.similarityScore', { value: metadataNumber(metadata.similarityScore) ?? '-' }),
      t('agentProposals.evidence.latestWorkspace', { value: metadataString(metadata.workspaceTitle) ?? t('common.unknown') }),
    ];
  }
  if (proposal.type === 'recall_review') {
    return [
      t('agentProposals.evidence.daysSinceLastAccess', { value: metadataNumber(metadata.daysSinceLastAccess) ?? '-' }),
      t('agentProposals.evidence.recallScore', { value: metadataNumber(metadata.recallScore) ?? '-' }),
      t('agentProposals.evidence.cardWorkspace', { value: metadataString(metadata.workspaceTitle) ?? t('common.unknown') }),
    ];
  }
  if (proposal.type === 'topic_explore') {
    return [
      t('agentProposals.evidence.windowDays', { count: metadataNumber(metadata.windowDays) ?? 0 }),
      t('agentProposals.evidence.topicWeight', { value: metadataNumber(metadata.weight) ?? '-' }),
      t('agentProposals.evidence.signalSources', { count: metadataNumber(metadata.sourceCount) ?? 0 }),
    ];
  }
  if (proposal.type === 'workspace_emergence') {
    return [
      metadataString(metadata.triggerRule) ?? t('agentProposals.evidence.workspaceRuleFallback'),
      t('agentProposals.evidence.clusterCards', { count: metadataNumber(metadata.cardCount) ?? 0 }),
    ];
  }
  return [];
}

function buildSamples(proposal) {
  const metadata = proposal.metadata ?? {};
  if (proposal.type === 'workspace_emergence') {
    return metadataArray(metadata.sampleTitles);
  }
  if (proposal.type === 'repeated_thinking') {
    return metadataArray(metadata.questionSamples);
  }
  return [];
}

/**
 * Agent 提议面板组件。
 * @param {object} props - 组件属性
 * @param {Function} [props.onCreateWorkspace] - 创建工作区回调，接收 { title, summary, cardIds } 参数
 * @param {Function} [props.onNavigate] - 视图切换回调
 * @param {Function} [props.onSelectCard] - 选中知识卡片回调
 * @param {Function} [props.onAskAgent] - 打开全局 AI 对话回调
 * @returns {JSX.Element} 提议面板
 */
export default function AgentProposalsPanel({ onCreateWorkspace, onNavigate, onSelectCard, onAskAgent }) {
  const { t } = useTranslation();
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [expandedKey, setExpandedKey] = useState('');

  const loadProposals = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const payload = await api.get('/api/agent-proposals');
      setProposals(Array.isArray(payload.proposals) ? payload.proposals : []);
    } catch {
      setProposals([]);
      setLoadError(t('agentProposals.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadProposals();
  }, [loadProposals]);

  const handleCreateWorkspace = async (proposal) => {
    if (acting || !onCreateWorkspace) return;
    const keyword = proposal.metadata?.keyword ?? proposal.title;
    const cardIds = Array.isArray(proposal.metadata?.cardIds) ? proposal.metadata.cardIds : [];
    const sampleTitles = metadataArray(proposal.metadata?.sampleTitles);
    setActing(true);
    try {
      await onCreateWorkspace({
        title: keyword,
        summary: [
          `由 AI 提议创建，源于默认工作区中「${keyword}」主题的卡片聚类。`,
          `包含 ${proposal.metadata?.cardCount ?? cardIds.length} 张相关卡片。`,
          sampleTitles.length ? `代表卡片：${sampleTitles.join('、')}` : '',
        ].filter(Boolean).join('\n'),
        cardIds,
      });
      await loadProposals();
    } finally {
      setActing(false);
    }
  };

  const handlePrimaryAction = (proposal) => {
    const metadata = proposal.metadata ?? {};
    if (proposal.type === 'workspace_emergence') {
      handleCreateWorkspace(proposal);
      return;
    }
    if (proposal.type === 'recall_review') {
      const cardId = metadataString(metadata.cardId);
      if (cardId) {
        onSelectCard?.(cardId, metadataString(metadata.workspaceId));
      }
      return;
    }
    if (proposal.type === 'blind_spot') {
      onNavigate?.('library');
      return;
    }
    if (proposal.type === 'repeated_thinking') {
      const question = metadataString(metadata.representativeQuestion) ?? proposal.title;
      onAskAgent?.(t('agentProposals.prompts.repeatedThinking', { question }));
      return;
    }
    if (proposal.type === 'topic_explore') {
      const term = metadataString(metadata.term) ?? proposal.title;
      onAskAgent?.(t('agentProposals.prompts.topicExplore', { term }));
    }
  };

  if (loading) {
    return (
      <section className="bento-card agent-proposals-card">
        <div className="bento-head">
          <div>
            <h2>{t('agentProposals.title')}</h2>
            <span className="bento-meta">{t('agentProposals.loading')}</span>
          </div>
          <Sparkles size={20} />
        </div>
        <div className="agent-proposals-skeleton" />
      </section>
    );
  }

  if (loadError) {
    return (
      <section className="bento-card agent-proposals-card">
        <div className="bento-head">
          <div>
            <h2>{t('agentProposals.title')}</h2>
            <span className="bento-meta">{t('agentProposals.subtitle')}</span>
          </div>
          <Sparkles size={20} />
        </div>
        <EmptyState icon={Lightbulb} title={t('agentProposals.loadFailed')} body={loadError} compact />
      </section>
    );
  }

  if (proposals.length === 0) {
    return (
      <section className="bento-card agent-proposals-card">
        <div className="bento-head">
          <div>
            <h2>{t('agentProposals.title')}</h2>
            <span className="bento-meta">{t('agentProposals.subtitle')}</span>
          </div>
          <Sparkles size={20} />
        </div>
        <EmptyState icon={Lightbulb} title={t('agentProposals.empty')} compact />
      </section>
    );
  }

  return (
    <section className="bento-card agent-proposals-card">
      <div className="bento-head">
        <div>
          <h2>{t('agentProposals.title')}</h2>
          <span className="bento-meta">{t('agentProposals.subtitle')}</span>
        </div>
        <Sparkles size={20} />
      </div>
      <div className="agent-proposals-list">
        {proposals.map((proposal, index) => {
          const key = proposalKey(proposal, index);
          const isExpanded = expandedKey === key;
          const evidenceRows = buildEvidenceRows(proposal, t);
          const samples = buildSamples(proposal);
          const ActionIcon = PROPOSAL_ACTION_ICON[proposal.type] ?? ArrowUpRight;
          return (
            <article key={key} className={`agent-proposal-item ${PROPOSAL_TYPE_ICON[proposal.type] ?? 'default'} ${isExpanded ? 'is-expanded' : ''}`}>
              <button
                type="button"
                className="agent-proposal-summary"
                aria-expanded={isExpanded}
                onClick={() => setExpandedKey(isExpanded ? '' : key)}
              >
                <span className="agent-proposal-main">
                  <span className="agent-proposal-head">
                    <span className="agent-proposal-type-badge">{t(`agentProposals.types.${proposal.type}`, proposal.type)}</span>
                  </span>
                  <span className="agent-proposal-title">{proposal.title}</span>
                  <span className="agent-proposal-desc">{proposal.description}</span>
                </span>
                <ChevronDown className="agent-proposal-chevron" size={18} />
              </button>
              {isExpanded && (
                <div className="agent-proposal-detail">
                  {evidenceRows.length > 0 && (
                    <div className="agent-proposal-evidence">
                      <span className="agent-proposal-detail-label">{t('agentProposals.evidenceTitle')}</span>
                      <ul>
                        {evidenceRows.map((row) => <li key={row}>{row}</li>)}
                      </ul>
                    </div>
                  )}
                  {samples.length > 0 && (
                    <div className="agent-proposal-samples">
                      <span className="agent-proposal-detail-label">{t('agentProposals.samplesTitle')}</span>
                      <div className="agent-proposal-sample-list">
                        {samples.map((sample) => <span key={sample}>{sample}</span>)}
                      </div>
                    </div>
                  )}
                  <button
                    type="button"
                    className="agent-proposal-action"
                    disabled={acting && proposal.type === 'workspace_emergence'}
                    onClick={() => handlePrimaryAction(proposal)}
                  >
                    <ActionIcon size={15} />
                    {proposal.actionLabel}
                    {proposal.type !== 'workspace_emergence' && <ArrowUpRight size={14} />}
                  </button>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
