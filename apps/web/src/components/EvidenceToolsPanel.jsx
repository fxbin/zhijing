/**
 * 认知检验工具面板：集成证据审计与假设检验两个工具。
 * 证据审计：扫描卡片溯源状态，识别骨架卡占比过高的覆盖缺口。
 * 假设检验：用户提交假设，系统搜索支持/反对证据并返回统计判定。
 * @module components/EvidenceToolsPanel
 * @author fxbin
 */

import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlaskConical, Gavel, Loader2, Search } from 'lucide-react';
import { formatPercent } from '../utils/format';
import { useClaimStatusLabel } from '../utils/i18nLabels';

const VERDICT_TONE_MAP = {
  supported: 'positive',
  contradicted: 'negative',
  mixed: 'pending',
  insufficient: 'muted',
};

const TAB_EVIDENCE_AUDIT = 'evidence-audit';
const TAB_HYPOTHESIS_TEST = 'hypothesis-test';

/**
 * 证据审计子区块：展示溯源状态统计与覆盖缺口。
 * @param {object} props - 组件属性
 * @param {string} props.knowledgeBaseId - 知识库 ID
 * @returns {JSX.Element} 证据审计区块
 */
function EvidenceAuditSection({ knowledgeBaseId }) {
  const { t } = useTranslation();
  const claimStatusLabel = useClaimStatusLabel();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadReport = useCallback(async () => {
    if (!knowledgeBaseId) return;
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/knowledge-bases/${knowledgeBaseId}/evidence-audit`);
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || t('evidenceTools.auditLoadFailed'));
      }
      const payload = await response.json();
      setReport(payload);
    } catch (err) {
      setError(err.message || t('evidenceTools.auditLoadFailed'));
    } finally {
      setLoading(false);
    }
  }, [knowledgeBaseId, t]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  if (loading) {
    return (
      <div className="evidence-tools-state">
        <Loader2 size={18} className="spin" />
        <span>{t('evidenceTools.auditLoading')}</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="evidence-tools-state error">
        <span>{error}</span>
        <button type="button" onClick={loadReport} className="evidence-tools-retry">
          {t('common.refresh')}
        </button>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="evidence-tools-state">
        <span>{t('evidenceTools.auditEmpty')}</span>
      </div>
    );
  }

  const totals = report.totals ?? { cards: 0, sourced: 0, userConfirmed: 0, skeleton: 0, unsupported: 0 };
  const gaps = report.gaps ?? [];

  return (
    <div className="evidence-audit-report">
      <div className="evidence-audit-totals">
        <div className="evidence-audit-ratio">
          <span>{t('evidenceTools.sourcedRatio')}</span>
          <strong>{formatPercent(report.sourcedRatio ?? 0)}</strong>
        </div>
        <div className="evidence-audit-breakdown">
          <article className="evidence-stat">
            <span>{t('evidenceTools.totalCards')}</span>
            <strong>{totals.cards}</strong>
          </article>
          <article className="evidence-stat sourced">
            <span>{claimStatusLabel('sourced')}</span>
            <strong>{totals.sourced}</strong>
          </article>
          <article className="evidence-stat confirmed">
            <span>{claimStatusLabel('user_confirmed')}</span>
            <strong>{totals.userConfirmed}</strong>
          </article>
          <article className="evidence-stat skeleton">
            <span>{claimStatusLabel('ai_skeleton')}</span>
            <strong>{totals.skeleton}</strong>
          </article>
          <article className="evidence-stat unsupported">
            <span>{claimStatusLabel('unsupported')}</span>
            <strong>{totals.unsupported}</strong>
          </article>
        </div>
      </div>

      {gaps.length === 0 ? (
        <p className="evidence-audit-no-gaps">{t('evidenceTools.noGaps')}</p>
      ) : (
        <div className="evidence-audit-gaps">
          <div className="evidence-audit-gaps-head">
            <strong>{t('evidenceTools.gapsTitle')}</strong>
            <small>{t('evidenceTools.gapsHint')}</small>
          </div>
          {gaps.map((gap) => (
            <div className="evidence-gap-row" key={gap.cardType}>
              <div className="evidence-gap-meta">
                <span className="evidence-gap-type">{gap.cardType}</span>
                <span className="evidence-gap-count">
                  {t('evidenceTools.gapCount', { skeleton: gap.skeleton, total: gap.total })}
                </span>
              </div>
              <div className="evidence-gap-bar">
                <div className="evidence-gap-bar-fill" style={{ width: `${Math.round(gap.skeletonRatio * 100)}%` }} />
              </div>
              <span className="evidence-gap-ratio">{formatPercent(gap.skeletonRatio)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * 假设检验子区块：用户输入假设，展示支持/反对证据与判定结果。
 * @param {object} props - 组件属性
 * @param {string} props.knowledgeBaseId - 知识库 ID
 * @returns {JSX.Element} 假设检验区块
 */
function HypothesisTestSection({ knowledgeBaseId }) {
  const { t } = useTranslation();
  const claimStatusLabel = useClaimStatusLabel();
  const [hypothesis, setHypothesis] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function runTest(event) {
    event.preventDefault();
    const trimmed = hypothesis.trim();
    if (!trimmed || !knowledgeBaseId) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const response = await fetch(`/api/knowledge-bases/${knowledgeBaseId}/hypothesis-test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hypothesis: trimmed }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || t('evidenceTools.hypothesisFailed'));
      }
      const payload = await response.json();
      setResult(payload);
    } catch (err) {
      setError(err.message || t('evidenceTools.hypothesisFailed'));
    } finally {
      setLoading(false);
    }
  }

  const verdict = result?.verdict;
  const verdictTone = verdict ? VERDICT_TONE_MAP[verdict] ?? 'muted' : 'muted';

  return (
    <div className="hypothesis-test-panel">
      <form className="hypothesis-test-form" onSubmit={runTest}>
        <input
          type="text"
          value={hypothesis}
          onChange={(event) => setHypothesis(event.target.value)}
          placeholder={t('evidenceTools.hypothesisPlaceholder')}
          aria-label={t('evidenceTools.hypothesisLabel')}
          disabled={loading}
        />
        <button type="submit" disabled={loading || !hypothesis.trim()}>
          {loading ? <Loader2 size={16} className="spin" /> : <Search size={16} />}
          <span>{t('evidenceTools.runTest')}</span>
        </button>
      </form>

      {error && <p className="hypothesis-test-error">{error}</p>}

      {result && (
        <div className="hypothesis-test-result">
          <div className={`hypothesis-verdict tone-${verdictTone}`}>
            <Gavel size={18} />
            <div>
              <strong>{t(`evidenceTools.verdict.${verdict}`)}</strong>
              <p>{result.summary}</p>
            </div>
          </div>

          <HypothesisEvidenceList
            title={t('evidenceTools.supportingEvidence')}
            items={result.supportingCards ?? []}
            claimStatusLabel={claimStatusLabel}
            emptyHint={t('evidenceTools.noSupportingEvidence')}
          />
          <HypothesisEvidenceList
            title={t('evidenceTools.contradictingEvidence')}
            items={result.contradictingCards ?? []}
            claimStatusLabel={claimStatusLabel}
            emptyHint={t('evidenceTools.noContradictingEvidence')}
          />
          <HypothesisEvidenceList
            title={t('evidenceTools.neutralEvidence')}
            items={result.neutralCards ?? []}
            claimStatusLabel={claimStatusLabel}
            emptyHint={t('evidenceTools.noNeutralEvidence')}
          />
        </div>
      )}
    </div>
  );
}

/**
 * 假设检验证据列表：展示某一类证据（支持/反对/中性）的卡片清单。
 * @param {object} props - 组件属性
 * @param {string} props.title - 区块标题
 * @param {Array} props.items - 证据项列表
 * @param {Function} props.claimStatusLabel - 证据状态标签函数
 * @param {string} props.emptyHint - 空列表提示
 * @returns {JSX.Element} 证据列表区块
 */
function HypothesisEvidenceList({ title, items, claimStatusLabel, emptyHint }) {
  if (items.length === 0) {
    return (
      <div className="hypothesis-evidence-list empty">
        <strong>{title}</strong>
        <p>{emptyHint}</p>
      </div>
    );
  }
  return (
    <div className="hypothesis-evidence-list">
      <strong>{title}</strong>
      {items.map((item) => (
        <article key={item.cardId} className="hypothesis-evidence-item">
          <div className="hypothesis-evidence-head">
            <span className="hypothesis-evidence-title">{item.title}</span>
            <span className={`hypothesis-evidence-status claim-${item.claimStatus}`}>
              {claimStatusLabel(item.claimStatus)}
            </span>
          </div>
          <p className="hypothesis-evidence-preview">{item.preview}</p>
        </article>
      ))}
    </div>
  );
}

/**
 * 认知检验工具面板：通过 tab 切换证据审计与假设检验。
 * @param {object} props - 组件属性
 * @param {string} props.knowledgeBaseId - 知识库 ID
 * @returns {JSX.Element} 检验工具面板
 */
export default function EvidenceToolsPanel({ knowledgeBaseId }) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState(TAB_EVIDENCE_AUDIT);

  return (
    <section className="evidence-tools-panel" aria-label={t('evidenceTools.title')}>
      <div className="evidence-tools-head">
        <FlaskConical size={18} />
        <strong>{t('evidenceTools.title')}</strong>
      </div>
      <div className="evidence-tools-tabs">
        <button
          type="button"
          className={activeTab === TAB_EVIDENCE_AUDIT ? 'active' : ''}
          onClick={() => setActiveTab(TAB_EVIDENCE_AUDIT)}
        >
          {t('evidenceTools.tabAudit')}
        </button>
        <button
          type="button"
          className={activeTab === TAB_HYPOTHESIS_TEST ? 'active' : ''}
          onClick={() => setActiveTab(TAB_HYPOTHESIS_TEST)}
        >
          {t('evidenceTools.tabHypothesis')}
        </button>
      </div>
      <div className="evidence-tools-body">
        {activeTab === TAB_EVIDENCE_AUDIT && <EvidenceAuditSection knowledgeBaseId={knowledgeBaseId} />}
        {activeTab === TAB_HYPOTHESIS_TEST && <HypothesisTestSection knowledgeBaseId={knowledgeBaseId} />}
      </div>
    </section>
  );
}
