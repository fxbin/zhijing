/**
 * Agent 提议面板：展示 AI 主动生成的认知提议，包括盲区补充、重复思考、
 * 遗忘复习、主题探索与工作区涌现五类。
 * 守提议权不写入权：除工作区涌现的"创建工作区"按钮外，其余提议仅展示不执行。
 * @module components/AgentProposalsPanel
 */

import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Lightbulb, Sparkles } from 'lucide-react';
import EmptyState from './EmptyState';

const PROPOSAL_TYPE_ICON = {
  blind_spot: 'blind-spot',
  repeated_thinking: 'repeated-thinking',
  recall_review: 'recall-review',
  topic_explore: 'topic-explore',
  workspace_emergence: 'workspace-emergence',
};

/**
 * Agent 提议面板组件。
 * @param {object} props - 组件属性
 * @param {Function} [props.onCreateWorkspace] - 创建工作区回调，接收 { title, summary, cardIds } 参数
 * @returns {JSX.Element} 提议面板
 */
export default function AgentProposalsPanel({ onCreateWorkspace }) {
  const { t } = useTranslation();
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);

  const loadProposals = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/agent-proposals');
      if (!response.ok) {
        setProposals([]);
        return;
      }
      const payload = await response.json();
      setProposals(Array.isArray(payload.proposals) ? payload.proposals : []);
    } catch {
      setProposals([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProposals();
  }, [loadProposals]);

  const handleCreateWorkspace = async (proposal) => {
    if (acting || !onCreateWorkspace) return;
    const keyword = proposal.metadata?.keyword ?? proposal.title;
    const cardIds = Array.isArray(proposal.metadata?.cardIds) ? proposal.metadata.cardIds : [];
    setActing(true);
    try {
      await onCreateWorkspace({
        title: keyword,
        summary: `由 AI 涌现式提议创建，包含 ${proposal.metadata?.cardCount ?? cardIds.length} 张相关卡片。`,
        cardIds,
      });
      await loadProposals();
    } finally {
      setActing(false);
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
        {proposals.map((proposal, index) => (
          <article key={`${proposal.type}-${index}`} className={`agent-proposal-item ${PROPOSAL_TYPE_ICON[proposal.type] ?? 'default'}`}>
            <div className="agent-proposal-head">
              <span className="agent-proposal-type-badge">{t(`agentProposals.types.${proposal.type}`, proposal.type)}</span>
            </div>
            <h3>{proposal.title}</h3>
            <p>{proposal.description}</p>
            {proposal.type === 'workspace_emergence' && onCreateWorkspace && (
              <button
                type="button"
                className="agent-proposal-action"
                disabled={acting}
                onClick={() => handleCreateWorkspace(proposal)}
              >
                {proposal.actionLabel}
              </button>
            )}
            {proposal.type !== 'workspace_emergence' && (
              <span className="agent-proposal-action-label">{proposal.actionLabel}</span>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
