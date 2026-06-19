/**
 * @module views/KitView
 * @description Workflow Kits 视图，展示当前知识库可用的整理方式并触发 Kit 运行。
 * @author fxbin
 */

import { useState } from 'react';
import { CheckCircle2, Clock3 } from 'lucide-react';
import { kitCards } from '../constants/artifact';

/** Kit 分类配置：按用途分组展示 */
const KIT_CATEGORIES = [
  { id: 'research', label: '研究类', kitIds: ['learning_research', 'product_research'] },
  { id: 'creation', label: '创作类', kitIds: ['content_creation'] },
  { id: 'decomposition', label: '拆解类', kitIds: ['topic_decomposition'] },
];

/** Kit 运行时的标准步骤定义 */
const KIT_RUN_STEPS = [
  { id: 'read', title: '读取知识库', body: '加载资料、卡片与最近产物作为 Kit 输入。' },
  { id: 'context', title: '整理上下文', body: '合并资料与卡片，构造模型可用的上下文。' },
  { id: 'generate', title: '调用模型生成', body: '调用模型生成结构化产物。' },
  { id: 'persist', title: '持久化产物', body: '保存产物到知识库并建立索引。' },
];

/** 运行中进度面板默认激活的步骤索引（0 基） */
const RUNNING_ACTIVE_STEP_INDEX = 2;

/** 每个 Kit 的详细元信息：预期产物、步骤预览、所需时间估计 */
const KIT_META = {
  learning_research: {
    estimatedMinutes: 3,
    expectedOutputs: ['主题研究摘要', '核心概念表', '待补资料清单'],
    stepPreview: ['扫描资料与卡片', '抽取主题与概念', '汇总缺口并产出摘要'],
  },
  content_creation: {
    estimatedMinutes: 4,
    expectedOutputs: ['选题库', '标题方向', '内容结构建议', '风险提示'],
    stepPreview: ['梳理素材脉络', '生成选题与标题', '编排内容结构与风险'],
  },
  product_research: {
    estimatedMinutes: 5,
    expectedOutputs: ['竞品对比', '用户痛点', '功能机会点', '下一步验证问题'],
    stepPreview: ['提取竞品与痛点', '归纳机会点', '形成验证问题清单'],
  },
  topic_decomposition: {
    estimatedMinutes: 3,
    expectedOutputs: ['子主题树', '学习路径', '依赖关系'],
    stepPreview: ['识别主题边界', '拆解子主题', '排序学习路径与依赖'],
  },
};

/**
 * Kit 详情面板：展示步骤预览、预期产物和所需时间估计
 * @param {Object} props - 组件参数
 * @param {Object} props.meta - Kit 元信息
 * @param {string[]} props.meta.expectedOutputs - 预期产物列表
 * @param {string[]} props.meta.stepPreview - 步骤预览列表
 * @param {number} props.meta.estimatedMinutes - 预估耗时（分钟）
 * @returns {JSX.Element} Kit 详情面板
 */
function KitDetailPanel({ meta }) {
  return (
    <>
      <p><strong>步骤预览</strong>：{meta.stepPreview.join(' → ')}</p>
      <p><strong>预期产物</strong>：{meta.expectedOutputs.join('、')}</p>
      <p><strong>预计耗时</strong>：约 {meta.estimatedMinutes} 分钟</p>
    </>
  );
}

/**
 * 运行中进度面板：展示步骤列表、当前步骤高亮和进度条
 * @param {Object} props - 组件参数
 * @param {Array<{id: string, title: string, body: string}>} props.steps - 步骤列表
 * @param {number} props.activeIndex - 当前激活步骤索引
 * @returns {JSX.Element} 运行中进度面板
 */
function RunningKitPanel({ steps, activeIndex }) {
  return (
    <aside className="run-steps">
      <div className="section-title">
        <h3>Kit 运行中</h3>
        <button type="button">{steps.length} of {steps.length} Steps</button>
      </div>
      {steps.map((step, index) => {
        const state = index < activeIndex ? 'done' : index === activeIndex ? 'active' : 'waiting';
        return (
          <article className={state} key={step.id}>
            {state === 'done' ? <CheckCircle2 size={22} /> : <Clock3 size={22} />}
            <div>
              <h3>{index + 1}. {step.title}</h3>
              <p>{step.body}</p>
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
            <h2>Workflow Kits</h2>
            <p>Kit 正在运行，请稍候。完成后会自动跳转到产物预览。</p>
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
          <h2>Workflow Kits</h2>
          <p>选择一个当前知识库的整理方式，生成可保存和导出的产物。</p>
        </div>
      </div>
      {KIT_CATEGORIES.map((category) => {
        const categoryKits = kitCards.filter((kit) => category.kitIds.includes(kit.id));
        if (categoryKits.length === 0) return null;
        return (
          <div key={category.id}>
            <div className="section-title">
              <h3>{category.label}</h3>
            </div>
            <div className="kit-grid">
              {categoryKits.map((kit) => {
                const Icon = kit.icon;
                const isSelected = kit.id === selectedKitId;
                const meta = KIT_META[kit.id];
                return (
                  <article className="kit-card" key={kit.title} onClick={() => handleCardClick(kit.id)} role="presentation">
                    <Icon size={30} />
                    <span>{kit.status}</span>
                    <h3>{kit.title}</h3>
                    <p>{kit.body}</p>
                    {isSelected && meta && <KitDetailPanel meta={meta} />}
                    <button
                      disabled={!canRun}
                      onClick={(event) => {
                        event.stopPropagation();
                        startKit(kit.id);
                      }}
                      type="button"
                    >
                      {isRunningKit ? 'Running...' : 'Run Kit'}
                    </button>
                  </article>
                );
              })}
            </div>
          </div>
        );
      })}
      {!selectedKnowledgeBaseId && <p className="kit-hint">先创建或选择一个知识库，再运行 Kit。</p>}
    </section>
  );
}
