/**
 * @module views/CrossKbSynthesisView
 * @description 跨库综合视图，展示跨知识库主题并触发综合产物生成。
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Sparkles } from 'lucide-react';
import AdvancedOpsTabs from '../components/AdvancedOpsTabs';
import EmptyState from '../components/EmptyState';

/**
 * 跨库综合视图组件
 * @param {Object} props - 组件参数
 * @param {Object} props.data - 高级操作数据，包含 crossKbThemes
 * @param {Function} props.setView - 视图切换函数
 * @returns {JSX.Element} 跨库综合视图
 */
export default function CrossKbSynthesisView({ data, setView }) {
  const { t } = useTranslation();
  const [synthesizing, setSynthesizing] = useState(null);
  const [synthesisError, setSynthesisError] = useState('');

  async function generateSynthesis(theme) {
    if (synthesizing || !theme.left?.id || !theme.right?.id) return;
    setSynthesizing(theme);
    setSynthesisError('');
    try {
      const response = await fetch('/api/synthesis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leftKnowledgeBaseId: theme.left.id, rightKnowledgeBaseId: theme.right.id }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        setSynthesisError(payload.error ?? '跨库综合失败');
        return;
      }
      setView('library');
    } catch {
      setSynthesisError('网络错误，跨库综合失败');
    } finally {
      setSynthesizing(null);
    }
  }

  return (
    <section className="page-main full advanced-page">
      <div className="advanced-head">
        <div>
          <span>{t('synthesis.title')}</span>
          <h2>{t('synthesis.heading')}</h2>
          <p>用主题重叠、资料密度和卡片证据做跨库综合的入口，后续可接 Pi 生成正式综合报告。</p>
        </div>
        <button onClick={() => setView('compare')} type="button">{t('synthesis.compare')}</button>
      </div>
      <AdvancedOpsTabs active="synthesis" setView={setView} />

      {synthesisError && <p className="synthesis-error">{synthesisError}</p>}

      {data.crossKbThemes.length === 0 ? (
        <EmptyState title={t('synthesis.noThemes')} body={t('synthesis.noThemesHint')} />
      ) : (
        <div className="synthesis-grid">
          {data.crossKbThemes.map((theme, index) => (
            <article className="synthesis-card" key={`${theme.left.id ?? theme.left.title}-${theme.right.id ?? theme.right.title}-${index}`}>
              <div className="synthesis-card-head">
                <span>{t('synthesis.themeNumber', { number: index + 1 })}</span>
                <strong>{t('synthesis.overlapCount', { count: theme.score || theme.overlap.length })}</strong>
              </div>
              <h3>{theme.left.title} × {theme.right.title}</h3>
              <p>把两个知识库的重叠关键词先汇成一个候选综合主题，适合生成对比摘要、研究问题或专题文档。</p>
              <div className="overlap-chip-row">
                {(theme.overlap.length ? theme.overlap : [t('cardType.concept'), t('synthesis.fallbackSource'), t('synthesis.fallbackReview')]).slice(0, 6).map((token) => (
                  <span key={token}>{token}</span>
                ))}
              </div>
              <footer>
                <button
                  onClick={() => generateSynthesis(theme)}
                  type="button"
                  disabled={synthesizing !== null}
                >
                  {synthesizing === theme ? '生成中…' : t('synthesis.draftArtifact')}
                </button>
                <button onClick={() => setView('conflicts')} type="button">{t('synthesis.checkConflicts')}</button>
              </footer>
            </article>
          ))}
        </div>
      )}

      <section className="advanced-panel synthesis-plan">
        <div className="panel-title">
          <Sparkles size={20} />
          <div>
            <span>{t('synthesis.planTitle')}</span>
            <h4>建议的综合产物结构</h4>
          </div>
        </div>
        <div className="synthesis-step-list">
          {['共同概念', '分歧观点', '证据来源', '可行动问题'].map((step, index) => (
            <article key={step}>
              <span>{index + 1}</span>
              <strong>{step}</strong>
              <p>从当前卡片和资料里提取候选内容，先形成只读预览，之后再接生成和保存。</p>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}
