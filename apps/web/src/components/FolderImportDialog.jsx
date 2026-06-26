/**
 * 文件夹导入弹窗：输入本地绝对路径，批量扫描 .md/.txt 文件入库到指定工作区。
 * 不触发 AI 处理，仅入库为 parseStatus='pending' 的资料。
 * @module components/FolderImportDialog
 * @author fxbin
 */

import { useRef, useState } from 'react';
import { CircleX, FolderOpen, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import api from '../utils/api';
import useModalA11y from '../hooks/useModalA11y';

/**
 * 文件夹导入弹窗组件。
 * @param {object} props - 组件属性
 * @param {boolean} props.open - 是否打开
 * @param {function} props.onClose - 关闭回调
 * @param {string} props.workspaceId - 目标工作区 ID
 * @param {string} props.workspaceTitle - 目标工作区标题（用于展示）
 * @param {function} [props.onImported] - 导入成功回调，接收 result 对象
 * @returns {JSX.Element|null} 弹窗元素
 * @author fxbin
 */
export default function FolderImportDialog({ open, onClose, workspaceId, workspaceTitle, onImported }) {
  const { t } = useTranslation();
  const [path, setPath] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const modalRef = useRef(null);
  useModalA11y(modalRef, open, onClose);

  if (!open) return null;

  const handleSubmit = async () => {
    const trimmed = path.trim();
    if (!trimmed || loading) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const payload = await api.post('/api/intake/folder', {
        path: trimmed,
        workspaceId,
      });
      setResult(payload);
      onImported?.(payload);
    } catch (err) {
      setError(err.message || t('folderImport.defaultError'));
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setPath('');
    setError('');
    setResult(null);
    setLoading(false);
    onClose();
  };

  return (
    <div className="modal-backdrop" ref={modalRef} onClick={handleClose} role="dialog" aria-modal="true">
      <div className="modal-card" onClick={(event) => event.stopPropagation()}>
        <header className="modal-head">
          <div className="modal-title">
            <FolderOpen size={22} />
            <h3>{t('folderImport.title')}</h3>
          </div>
          <button className="modal-close" onClick={handleClose} type="button" aria-label={t('common.close')}>
            <CircleX size={20} />
          </button>
        </header>
        <div className="modal-body">
          <label className="modal-field">
            <span>{t('folderImport.pathLabel')}</span>
            <div className="modal-input-row">
              <FolderOpen size={18} />
              <input
                autoFocus
                disabled={loading}
                onChange={(event) => setPath(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') handleSubmit();
                }}
                placeholder={t('folderImport.pathPlaceholder')}
                type="text"
                value={path}
              />
            </div>
            <small>{t('folderImport.pathHint')}</small>
          </label>

          <p className="modal-meta">
            {t('folderImport.targetWorkspace')}: <strong>{workspaceTitle || workspaceId || 'default'}</strong>
          </p>
          <p className="modal-meta muted">{t('folderImport.supportedExtensions')}</p>

          {error && <p className="modal-error" role="alert">{error}</p>}

          {result && (
            <div className="folder-import-result">
              <h4>{t('folderImport.resultTitle')}</h4>
              <div className="folder-import-summary">
                <span className="folder-import-stat ok">
                  {t('folderImport.imported')}: <strong>{result.imported}</strong>
                </span>
                <span className="folder-import-stat skip">
                  {t('folderImport.skipped')}: <strong>{result.skipped}</strong>
                </span>
                <span className="folder-import-stat fail">
                  {t('folderImport.failed')}: <strong>{result.failed}</strong>
                </span>
              </div>
              {result.items.some((item) => !item.ok) && (
                <details className="folder-import-errors">
                  <summary>{t('folderImport.errorDetails')}</summary>
                  <ul>
                    {result.items.filter((item) => !item.ok).map((item, index) => (
                      <li key={`${item.relativePath}-${index}`}>
                        <code>{item.relativePath}</code>
                        <span>{item.error}</span>
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          )}
        </div>
        <footer className="modal-foot">
          <button className="btn-ghost" onClick={handleClose} type="button">
            {result ? t('common.close') : t('common.cancel')}
          </button>
          {!result && (
            <button
              className="btn-primary"
              disabled={!path.trim() || loading}
              onClick={handleSubmit}
              type="button"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="spin" />
                  {t('folderImport.importing')}
                </>
              ) : (
                t('folderImport.startImport')
              )}
            </button>
          )}
        </footer>
      </div>
    </div>
  );
}
