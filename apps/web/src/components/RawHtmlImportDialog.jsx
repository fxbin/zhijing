/**
 * 网页源码粘贴导入弹窗。
 *
 * 使用场景：用户浏览器能打开页面但后端无法访问（受限网络、墙、登录态等）。
 * 用户从浏览器 View Source 复制 HTML，粘贴到文本框，后端复用 readability + turndown 解析。
 *
 * @module components/RawHtmlImportDialog
 * @author fxbin
 */

import { useRef, useState } from 'react';
import { CircleX, ClipboardPaste, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import api from '../utils/api';
import useModalA11y from '../hooks/useModalA11y';

/** HTML 内容最小长度（与后端校验保持一致）。 */
const MIN_HTML_LENGTH = 120;

/**
 * 网页源码粘贴导入弹窗组件。
 * @param {object} props - 组件属性
 * @param {boolean} props.open - 是否打开
 * @param {function} props.onClose - 关闭回调
 * @param {string} props.workspaceId - 目标工作区 ID
 * @param {string} props.workspaceTitle - 目标工作区标题（用于展示）
 * @param {function} [props.onImported] - 导入成功回调，接收 result 对象
 * @returns {JSX.Element|null} 弹窗元素
 * @author fxbin
 */
export default function RawHtmlImportDialog({ open, onClose, workspaceId, workspaceTitle, onImported }) {
  const { t } = useTranslation();
  const [html, setHtml] = useState('');
  const [title, setTitle] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const modalRef = useRef(null);
  useModalA11y(modalRef, open, onClose);

  if (!open) return null;

  const resetState = () => {
    setHtml('');
    setTitle('');
    setSourceUrl('');
    setError('');
    setResult(null);
    setLoading(false);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleSubmit = async () => {
    const trimmedHtml = html.trim();
    if (!trimmedHtml || loading) return;
    if (trimmedHtml.length < MIN_HTML_LENGTH) {
      setError(t('rawHtmlImport.tooShort', { min: MIN_HTML_LENGTH }));
      return;
    }
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const payload = await api.post('/api/intake/raw-html', {
        html: trimmedHtml,
        title: title.trim() || undefined,
        sourceUrl: sourceUrl.trim() || undefined,
        workspaceId,
      });
      setResult(payload);
      onImported?.(payload);
    } catch (err) {
      setError(err.message || t('rawHtmlImport.defaultError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" ref={modalRef} onClick={handleClose} role="dialog" aria-modal="true">
      <div className="modal-card raw-html-import-modal" onClick={(event) => event.stopPropagation()}>
        <header className="modal-head">
          <div className="modal-title">
            <ClipboardPaste size={22} />
            <h3>{t('rawHtmlImport.title')}</h3>
          </div>
          <button className="modal-close" onClick={handleClose} type="button" aria-label={t('common.close')}>
            <CircleX size={20} />
          </button>
        </header>
        <div className="modal-body">
          <p className="raw-html-import-hint">{t('rawHtmlImport.hint')}</p>

          <label className="raw-html-import-label" htmlFor="raw-html-source-url">
            {t('rawHtmlImport.sourceUrlLabel')}
          </label>
          <input
            id="raw-html-source-url"
            className="raw-html-import-input"
            type="url"
            value={sourceUrl}
            onChange={(event) => setSourceUrl(event.target.value)}
            placeholder={t('rawHtmlImport.sourceUrlPlaceholder')}
            disabled={loading}
          />

          <label className="raw-html-import-label" htmlFor="raw-html-title">
            {t('rawHtmlImport.titleLabel')}
          </label>
          <input
            id="raw-html-title"
            className="raw-html-import-input"
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder={t('rawHtmlImport.titlePlaceholder')}
            disabled={loading}
          />

          <label className="raw-html-import-label" htmlFor="raw-html-content">
            {t('rawHtmlImport.contentLabel')}
          </label>
          <textarea
            id="raw-html-content"
            className="raw-html-import-textarea"
            value={html}
            onChange={(event) => setHtml(event.target.value)}
            placeholder={t('rawHtmlImport.contentPlaceholder')}
            rows={14}
            disabled={loading}
            autoFocus
          />

          {error && <p className="raw-html-import-error">{error}</p>}
          {result && (
            <p className="raw-html-import-success">
              {t('rawHtmlImport.success', { title: result.title })}
            </p>
          )}

          <div className="modal-actions">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
            >
              {t('common.cancel')}
            </button>
            <button
              type="button"
              className="primary"
              onClick={handleSubmit}
              disabled={loading || !html.trim()}
            >
              {loading ? <Loader2 size={16} className="spin" /> : null}
              {t('rawHtmlImport.submit')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
