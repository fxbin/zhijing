/**
 * @module views/KitView
 * @description Workflow Kits 视图，展示当前知识库可用的整理方式并触发 Kit 运行。
 */

import { kitCards } from '../constants/artifact';

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
  const canRun = apiStatus === 'online' && Boolean(selectedKnowledgeBaseId) && !isRunningKit;

  async function startKit(kitId) {
    const result = await onRunKit(kitId);
    setView(result ? 'workflow' : 'detail');
  }

  return (
    <section className="page-main full">
      <div className="page-title-row">
        <div>
          <h2>Workflow Kits</h2>
          <p>选择一个当前知识库的整理方式，生成可保存和导出的产物。</p>
        </div>
      </div>
      <div className="kit-grid">
        {kitCards.map((kit) => {
          const Icon = kit.icon;
          return (
            <article className="kit-card" key={kit.title}>
              <Icon size={30} />
              <span>{kit.status}</span>
              <h3>{kit.title}</h3>
              <p>{kit.body}</p>
              <button disabled={!canRun} onClick={() => startKit(kit.id)} type="button">
                {isRunningKit ? 'Running...' : 'Run Kit'}
              </button>
            </article>
          );
        })}
      </div>
      {!selectedKnowledgeBaseId && <p className="kit-hint">先创建或选择一个知识库，再运行 Kit。</p>}
    </section>
  );
}
