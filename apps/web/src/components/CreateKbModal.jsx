/**
 * 创建知识库模态框组件：支持 AI 自动生成和创建空知识库两种模式。
 * AI 模式下提供受众、深度、范围三个意图澄清字段，减少 AI 对模糊主题的曲解。
 * @module components/CreateKbModal
 * @author fxbin
 */

import { useState } from 'react';
import { CircleX, Plus, Search, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import {
  CREATE_KB_KITS,
  DEFAULT_KB_AUDIENCE,
  DEFAULT_KB_DEPTH,
  DEFAULT_KB_SCOPE,
  KB_AUDIENCE_OPTIONS,
  KB_DEPTH_OPTIONS,
  KB_SCOPE_OPTIONS,
} from '../constants/artifact';

/**
 * 单选 chip 标签组，用于渲染意图澄清字段。
 * @param {object} props - 组件属性
 * @param {string} props.fieldPrefix - 字段前缀（audience / depth / scope），用于拼接 i18n key
 * @param {string} props.value - 当前选中值
 * @param {Array<{key: string}>} props.options - 选项列表
 * @param {function(string): void} props.onChange - 选中回调
 * @param {function(string): string} props.t - i18n 翻译函数
 * @returns {JSX.Element} chip 字段区块
 * @author fxbin
 */
function ChipField({ fieldPrefix, value, options, onChange, t }) {
  return (
    <label className="modal-field">
      <span>{t(`createKbModal.${fieldPrefix}Label`)}</span>
      <div className="modal-chips">
        {options.map((opt) => (
          <button
            className={`modal-chip ${value === opt.key ? 'active' : ''}`}
            key={opt.key}
            onClick={() => onChange(opt.key)}
            type="button"
          >
            {t(`createKbModal.${fieldPrefix}.${opt.key}`)}
          </button>
        ))}
      </div>
    </label>
  );
}

/**
 * 创建知识库模态框，双模式：AI 自动生成 / 创建空知识库。
 * @param {object} props - 组件属性
 * @param {string|null} props.error - 创建空知识库失败时的错误文案，传入则在弹窗内展示
 * @param {function} props.onClose - 关闭模态框回调
 * @param {function} props.onSubmit - 提交主题回调（AI 模式），接收 { theme, audience, depth, scope } 对象
 * @param {function} props.onCreateEmpty - 创建空知识库回调（标题, 摘要）
 * @returns {JSX.Element} 模态框
 * @author fxbin
 */
export default function CreateKbModal({ error, onClose, onSubmit, onCreateEmpty }) {
  const { t } = useTranslation();
  const [theme, setTheme] = useState('');
  const [emptyTitle, setEmptyTitle] = useState('');
  const [emptySummary, setEmptySummary] = useState('');
  const [creating, setCreating] = useState(false);
  const [mode, setMode] = useState('ai');
  const [audience, setAudience] = useState(DEFAULT_KB_AUDIENCE);
  const [depth, setDepth] = useState(DEFAULT_KB_DEPTH);
  const [scope, setScope] = useState(DEFAULT_KB_SCOPE);

  const handleConfirm = () => {
    const value = theme.trim();
    if (!value) return;
    onSubmit({ theme: value, audience, depth, scope });
  };

  const handleKitClick = (kit) => {
    setTheme(kit.title);
    setAudience(kit.defaults.audience);
    setDepth(kit.defaults.depth);
    setScope(kit.defaults.scope);
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
              <ChipField
                fieldPrefix="audience"
                onChange={setAudience}
                options={KB_AUDIENCE_OPTIONS}
                t={t}
                value={audience}
              />
              <ChipField
                fieldPrefix="depth"
                onChange={setDepth}
                options={KB_DEPTH_OPTIONS}
                t={t}
                value={depth}
              />
              <ChipField
                fieldPrefix="scope"
                onChange={setScope}
                options={KB_SCOPE_OPTIONS}
                t={t}
                value={scope}
              />
              <div className="modal-kits">
                <p className="modal-kits-label">{t('createKbModal.recommendedPaths')}</p>
                <div className="modal-kit-grid">
                  {CREATE_KB_KITS.map((kit) => {
                    const Icon = kit.icon;
                    return (
                      <button
                        className="modal-kit-card"
                        key={kit.key}
                        onClick={() => handleKitClick(kit)}
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
          {error && <p className="modal-error" role="alert">{error}</p>}
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
