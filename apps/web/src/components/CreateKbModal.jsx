/**
 * 创建知识库模态框组件：支持 AI 自动生成和创建空知识库两种模式。
 * @module components/CreateKbModal
 */

import { useState } from 'react';
import { CircleX, Plus, Search, Sparkles } from 'lucide-react';

import { CREATE_KB_KITS } from '../constants/artifact';

/**
 * 创建知识库模态框，双模式：AI 自动生成 / 创建空知识库。
 * @param {object} props - 组件属性
 * @param {function} props.onClose - 关闭模态框回调
 * @param {function} props.onSubmit - 提交主题回调（AI 模式）
 * @param {function} props.onCreateEmpty - 创建空知识库回调（标题, 摘要）
 * @returns {JSX.Element} 模态框
 */
export default function CreateKbModal({ onClose, onSubmit, onCreateEmpty }) {
  const [theme, setTheme] = useState('');
  const [emptyTitle, setEmptyTitle] = useState('');
  const [emptySummary, setEmptySummary] = useState('');
  const [creating, setCreating] = useState(false);
  const [mode, setMode] = useState('ai');
  const handleConfirm = () => {
    const value = theme.trim();
    if (!value) return;
    onSubmit(value);
  };
  const handleCreateEmpty = async () => {
    const title = emptyTitle.trim();
    if (!title || creating) return;
    setCreating(true);
    try {
      await onCreateEmpty(title, emptySummary.trim());
    } finally {
      setCreating(false);
    }
  };
  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-card" onClick={(event) => event.stopPropagation()}>
        <header className="modal-head">
          <div className="modal-title">
            <Sparkles size={22} />
            <h3>开启新的知识路径</h3>
          </div>
          <button className="modal-close" onClick={onClose} type="button" aria-label="关闭">
            <CircleX size={20} />
          </button>
        </header>
        <div className="modal-body">
          <div className="modal-mode-tabs">
            <button className={mode === 'ai' ? 'active' : ''} onClick={() => setMode('ai')} type="button">AI 自动生成</button>
            <button className={mode === 'empty' ? 'active' : ''} onClick={() => setMode('empty')} type="button">创建空知识库</button>
          </div>
          {mode === 'ai' ? (
            <>
              <label className="modal-field">
                <span>主题 / 目标</span>
                <div className="modal-input-row">
                  <Search size={18} />
                  <input
                    autoFocus
                    onChange={(event) => setTheme(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') handleConfirm();
                    }}
                    placeholder="例如：AI Agent 产品竞品分析"
                    type="text"
                    value={theme}
                  />
                </div>
                <small>输入一个主题、链接或问题，系统将自动创建知识库并开始整理。</small>
              </label>
              <div className="modal-kits">
                <p className="modal-kits-label">推荐路径</p>
                <div className="modal-kit-grid">
                  {CREATE_KB_KITS.map((kit) => {
                    const Icon = kit.icon;
                    return (
                      <button
                        className="modal-kit-card"
                        key={kit.key}
                        onClick={() => onSubmit(kit.title)}
                        type="button"
                      >
                        <Icon size={22} />
                        <strong>{kit.title}</strong>
                        <small>{kit.hint}</small>
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            <div className="modal-empty-form">
              <label className="modal-field">
                <span>知识库标题</span>
                <div className="modal-input-row">
                  <Plus size={18} />
                  <input
                    autoFocus
                    onChange={(event) => setEmptyTitle(event.target.value)}
                    placeholder="例如：我的读书笔记"
                    type="text"
                    value={emptyTitle}
                  />
                </div>
                <small>创建一个空知识库，后续再导入资料或运行 Kit。</small>
              </label>
              <label className="modal-field">
                <span>摘要（可选）</span>
                <textarea
                  onChange={(event) => setEmptySummary(event.target.value)}
                  placeholder="简单描述这个知识库的用途…"
                  rows={3}
                  value={emptySummary}
                />
              </label>
            </div>
          )}
        </div>
        <footer className="modal-foot">
          <button className="btn-ghost" onClick={onClose} type="button">取消</button>
          {mode === 'ai' ? (
            <button className="btn-primary" disabled={!theme.trim()} onClick={handleConfirm} type="button">
              立即开启
            </button>
          ) : (
            <button className="btn-primary" disabled={!emptyTitle.trim() || creating} onClick={handleCreateEmpty} type="button">
              {creating ? '创建中…' : '创建空知识库'}
            </button>
          )}
        </footer>
      </div>
    </div>
  );
}
