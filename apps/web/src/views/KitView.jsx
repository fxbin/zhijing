/**
 * @module views/KitView
 * @description Workflow Kits 视图，展示当前知识库可用的整理方式并触发 Kit 运行。
 * @author fxbin
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, Clock3 } from 'lucide-react';
import { kitCards } from '../constants/artifact';

/** Kit 分类配置：按用途分组展示 */
const KIT_CATEGORIES = [
  { id: 'research', kitIds: ['learning_research', 'product_research'] },
  { id: 'creation', kitIds: ['content_creation'] },
  { id: 'decomposition', kitIds: ['topic_decomposition'] },
];

/** Kit 运行时的标准步骤定义 */
const KIT_RUN_STEPS = [
  { id: 'read' },
  { id: 'context' },
  { id: 'generate' },
  { id: 'persist' },
];

/** 运行中进度面板默认激活的步骤索引（0 基） */
const RUNNING_ACTIVE_STEP_INDEX = 2;

/** 每个 Kit 的详细元信息：仅保留所需时间估计，其余文案通过 i18n 获取 */
const KIT_META = {
  learning_research: { estimatedMinutes: 3 },
  content_creation: { estimatedMinutes: 4 },
  product_research: { estimatedMinutes: 5 },
  topic_decomposition: { estimatedMinutes: 3 },
};

/**
 * Kit 详情面板：展示步骤预览、预期产物和所需时间估计
 * @param {Object} props - 组件参数
 * @param {string} props.kitId - Kit 标识
 * @param {number} props.estimatedMinutes - 预估耗时（分钟）
 * @returns {JSX.Element} Kit 详情面板
 */
function KitDetailPanel({ kitId, estimatedMinutes }) {
  const { t } = useTranslation();
  const stepPreview = t(`kit.meta.${kitId}.stepPreview`, { returnObjects: true });
  const expectedOutputs = t(`kit.meta.${kitId}.expectedOutputs`, { returnObjects: true });
  return (
    <>
      <p><strong>{t('kit.detail.stepPreview')}</strong>：{Array.isArray(stepPreview) ? stepPreview.join(' → ') : ''}</p>
      <p><strong>{t('kit.detail.expectedOutputs')}</strong>：{Array.isArray(expectedOutputs) ? expectedOutputs.join('、') : ''}</p>
      <p><strong>{t('kit.detail.estimatedTime')}</strong>：{t('kit.detail.minutes', { count: estimatedMinutes })}</p>
    </>
  );
}

/**
 * 运行中进度面板：展示步骤列表、当前步骤高亮和进度条
 * @param {Object} props - 组件参数
 * @param {Array<{id: string}>} props.steps - 步骤列表
 * @param {number} props.activeIndex - 当前激活步骤索引
 * @returns {JSX.Element} 运行中进度面板
 */
function RunningKitPanel({ steps, activeIndex }) {
  const { t } = useTranslation();
  return (
    <aside className="run-steps">
      <div className="section-title">
        <h3>{t('kit.runningTitle')}</h3>
        <button type="button">{t('kit.stepsCount', { current: steps.length, total: steps.length })}</button>
      </div>
      {steps.map((step, index) => {
        const state = index < activeIndex ? 'done' : index === activeIndex ? 'active' : 'waiting';
        return (
          <article className={state} key={step.id}>
            {state === 'done' ? <CheckCircle2 size={22} /> : <Clock3 size={22} />}
            <div>
              <h3>{index + 1}. {t(`kit.step.${step.id}.title`)}</h3>
              <p>{t(`kit.step.${step.id}.body`)}</p>
              {state === 'active' && (
                <div className="progress">
                  <span />
                </div>
              )}
            </div>
          </article>
        );
      })}
    </aside>
  );
}

/**
 * Workflow Kits 视图组件
 * @param {Object} props - 组件参数
 * @param {string} props.apiStatus - API 连接状态
 * @param {boolean} props.isRunningKit - 是否正在运行 Kit
 * @param {Function} props.onRunKit - 运行 Kit 回调
 * @param {string} props.selectedKnowledgeBaseId - 当前选中的知识库 ID
 * @param {Function} props.setView - 视图切换函数
 * @returns {JSX.Element} Workflow Kits 视图
 */
export default function KitView({ apiStatus, isRunningKit, onRunKit, selectedKnowledgeBaseId, setView }) {
  const { t } = useTranslation();
  const [selectedKitId, setSelectedKitId] = useState(null);
  const canRun = apiStatus === 'online' && Boolean(selectedKnowledgeBaseId) && !isRunningKit;

  async function startKit(kitId) {
    const result = await onRunKit(kitId);
    setView(result ? 'workflow' : 'detail');
  }

  function handleCardClick(kitId) {
    if (isRunningKit) return;
    setSelectedKitId((current) => (current === kitId ? null : kitId));
  }

  if (isRunningKit) {
    return (
      <section className="page-main full">
        <div className="page-title-row">
          <div>
            <h2>{t('kit.title')}</h2>
            <p>{t('kit.runningSubtitle')}</p>
          </div>
        </div>
        <RunningKitPanel steps={KIT_RUN_STEPS} activeIndex={RUNNING_ACTIVE_STEP_INDEX} />
      </section>
    );
  }

  return (
    <section className="page-main full">
      <div className="page-title-row">
        <div>
          <h2>{t('kit.title')}</h2>
          <p>{t('kit.subtitle')}</p>
        </div>
      </div>
      {KIT_CATEGORIES.map((category) => {
        const categoryKits = kitCards.filter((kit) => category.kitIds.includes(kit.id));
        if (categoryKits.length === 0) return null;
        return (
          <div key={category.id}>
            <div className="section-title">
              <h3>{t(`kit.category.${category.id}`)}</h3>
            </div>
            <div className="kit-grid">
              {categoryKits.map((kit) => {
                const Icon = kit.icon;
                const isSelected = kit.id === selectedKitId;
                const meta = KIT_META[kit.id];
                return (
                  <article className="kit-card" key={kit.id} onClick={() => handleCardClick(kit.id)} role="presentation">
                    <Icon size={30} />
                    <span>{t('kit.status.ready')}</span>
                    <h3>{t(`kit.${kit.id}.title`)}</h3>
                    <p>{t(`kit.${kit.id}.body`)}</p>
                    {isSelected && meta && <KitDetailPanel kitId={kit.id} estimatedMinutes={meta.estimatedMinutes} />}
                    <button
                      disabled={!canRun}
                      onClick={(event) => {
                        event.stopPropagation();
                        startKit(kit.id);
                      }}
                      type="button"
                    >
                      {isRunningKit ? t('common.loading') : t('kit.runKit')}
                    </button>
                  </article>
                );
              })}
            </div>
          </div>
        );
      })}
      {!selectedKnowledgeBaseId && <p className="kit-hint">{t('kit.selectKnowledgeBaseHint')}</p>}
    </section>
  );
}
