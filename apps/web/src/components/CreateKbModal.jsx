/**
 * 创建知识库模态框组件：支持 AI 自动生成和创建空知识库两种模式。
 * @module components/CreateKbModal
 */

import { useState } from 'react';
import { CircleX, Plus, Search, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation();
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
            <h3>{t('createKbModal.title')}</h3>
          </div>
          <button className="modal-close" onClick={onClose} type="button" aria-label={t('createKbModal.close')}>
            <CircleX size={20} />
          </button>
        </header>
        <div className="modal-body">
          <div className="modal-mode-tabs">
            <button className={mode === 'ai' ? 'active' : ''} onClick={() => setMode('ai')} type="button">
              {t('createKbModal.mode.ai')}
            </button>
            <button className={mode === 'empty' ? 'active' : ''} onClick={() => setMode('empty')} type="button">
              {t('createKbModal.mode.empty')}
            </button>
          </div>
          {mode === 'ai' ? (
            <>
              <label className="modal-field">
                <span>{t('createKbModal.themeLabel')}</span>
                <div className="modal-input-row">
                  <Search size={18} />
                  <input
                    autoFocus
                    onChange={(event) => setTheme(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') handleConfirm();
                    }}
                    placeholder={t('createKbModal.titlePlaceholder')}
                    type="text"
                    value={theme}
                  />
                </div>
                <small>{t('createKbModal.themeHint')}</small>
              </label>
              <div className="modal-kits">
                <p className="modal-kits-label">{t('createKbModal.recommendedPaths')}</p>
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
                <span>{t('createKbModal.kbTitleLabel')}</span>
                <div className="modal-input-row">
                  <Plus size={18} />
                  <input
                    autoFocus
                    onChange={(event) => setEmptyTitle(event.target.value)}
                    placeholder={t('createKbModal.authorPlaceholder')}
                    type="text"
                    value={emptyTitle}
                  />
                </div>
                <small>{t('createKbModal.emptyHint')}</small>
              </label>
              <label className="modal-field">
                <span>{t('createKbModal.summaryLabel')}</span>
                <textarea
                  onChange={(event) => setEmptySummary(event.target.value)}
                  placeholder={t('createKbModal.descriptionPlaceholder')}
                  rows={3}
                  value={emptySummary}
                />
              </label>
            </div>
          )}
        </div>
        <footer className="modal-foot">
          <button className="btn-ghost" onClick={onClose} type="button">{t('common.cancel')}</button>
          {mode === 'ai' ? (
            <button className="btn-primary" disabled={!theme.trim()} onClick={handleConfirm} type="button">
              {t('createKbModal.start')}
            </button>
          ) : (
            <button className="btn-primary" disabled={!emptyTitle.trim() || creating} onClick={handleCreateEmpty} type="button">
              {creating ? t('common.creating') : t('createKbModal.createEmpty')}
            </button>
          )}
        </footer>
      </div>
    </div>
  );
}
