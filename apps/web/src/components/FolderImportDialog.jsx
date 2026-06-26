/**
 * 文件夹导入弹窗：支持两种模式。
 *  - 默认模式：通过 webkitdirectory 直接选择文件夹，前端读取内容批量上传
 *  - 高级模式：输入本地绝对路径，后端扫描文件系统（适合 100+ 文件不通过 HTTP 传输）
 * 两种模式均不触发 AI 处理，仅入库为 parseStatus='saved' 的资料。
 * @module components/FolderImportDialog
 * @author fxbin
 */

import { useRef, useState } from 'react';
import { CircleX, FolderOpen, Loader2, Terminal } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import api from '../utils/api';
import useModalA11y from '../hooks/useModalA11y';

/** 支持的文件扩展名（小写）。 */
const SUPPORTED_EXTENSIONS = ['.md', '.markdown', '.txt'];

/** 单文件大小上限：2MB。 */
const MAX_FILE_SIZE = 2 * 1024 * 1024;

/** 单批文件数上限。 */
const MAX_BATCH_FILES = 200;

/**
 * 从 File 对象获取相对路径（webkitRelativePath 第一段为根目录名，去除之）。
 * @param {File} file - 文件对象
 * @returns {string} 相对路径
 */
function getRelativePath(file) {
  const fullPath = file.webkitRelativePath || file.name;
  const firstSlash = fullPath.indexOf('/');
  return firstSlash >= 0 ? fullPath.slice(firstSlash + 1) : fullPath;
}

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
  const [mode, setMode] = useState('picker');
  const [path, setPath] = useState('');
  const [pickedFiles, setPickedFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const fileInputRef = useRef(null);
  const modalRef = useRef(null);
  useModalA11y(modalRef, open, onClose);

  if (!open) return null;

  const resetState = () => {
    setPath('');
    setPickedFiles([]);
    setError('');
    setResult(null);
    setLoading(false);
  };

  const handleFilePick = (event) => {
    const files = Array.from(event.target.files || []);
    const supported = files.filter((file) => {
      const ext = '.' + (file.name.split('.').pop() || '').toLowerCase();
      return SUPPORTED_EXTENSIONS.includes(ext);
    });
    if (supported.length === 0) {
      setError(t('folderImport.noSupportedFiles'));
      setPickedFiles([]);
      return;
    }
    if (supported.length > MAX_BATCH_FILES) {
      setError(t('folderImport.tooManyFiles', { count: supported.length, max: MAX_BATCH_FILES }));
      setPickedFiles([]);
      return;
    }
    const oversized = supported.find((file) => file.size > MAX_FILE_SIZE);
    if (oversized) {
      setError(t('folderImport.oversizedFile', { name: oversized.name }));
      setPickedFiles([]);
      return;
    }
    setError('');
    setPickedFiles(supported);
  };

  const handleSubmitPicker = async () => {
    if (pickedFiles.length === 0 || loading) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const items = await Promise.all(
        pickedFiles.map(async (file) => {
          const content = await file.text();
          return {
            relativePath: getRelativePath(file),
            fileName: file.name,
            content,
          };
        }),
      );
      const payload = await api.post('/api/intake/files', {
        items,
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

  const handleSubmitPath = async () => {
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
    resetState();
    onClose();
  };

  const handleSwitchMode = (newMode) => {
    if (loading) return;
    setMode(newMode);
    setError('');
    setResult(null);
    setPickedFiles([]);
    setPath('');
  };

  return (
    <div className="modal-backdrop" ref={modalRef} onClick={handleClose} role="dialog" aria-modal="true">
      <div className="modal-card folder-import-modal" onClick={(event) => event.stopPropagation()}>
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
          <div className="modal-mode-tabs">
            <button
              className={mode === 'picker' ? 'active' : ''}
              disabled={loading}
              onClick={() => handleSwitchMode('picker')}
              type="button"
            >
              <FolderOpen size={16} />
              {t('folderImport.mode.picker')}
            </button>
            <button
              className={mode === 'path' ? 'active' : ''}
              disabled={loading}
              onClick={() => handleSwitchMode('path')}
              type="button"
            >
              <Terminal size={16} />
              {t('folderImport.mode.path')}
            </button>
          </div>

          <p className="modal-meta">
            {t('folderImport.targetWorkspace')}: <strong>{workspaceTitle || workspaceId || 'default'}</strong>
          </p>

          {mode === 'picker' ? (
            <div className="folder-import-picker">
              <input
                ref={fileInputRef}
                type="file"
                webkitdirectory=""
                directory=""
                multiple
                style={{ display: 'none' }}
                onChange={handleFilePick}
                disabled={loading}
              />
              <button
                type="button"
                className="folder-import-select-button"
                disabled={loading}
                onClick={() => fileInputRef.current?.click()}
              >
                <FolderOpen size={20} />
                {t('folderImport.selectFolder')}
              </button>
              <p className="modal-meta muted">{t('folderImport.pickerHint')}</p>

              {pickedFiles.length > 0 && (
                <div className="folder-import-file-list">
                  <div className="folder-import-file-list-head">
                    <span>{t('folderImport.pickedFiles', { count: pickedFiles.length })}</span>
                  </div>
                  <ul>
                    {pickedFiles.slice(0, 20).map((file, index) => (
                      <li key={`${file.name}-${index}`}>
                        <code>{getRelativePath(file)}</code>
                        <span>{(file.size / 1024).toFixed(1)}KB</span>
                      </li>
                    ))}
                    {pickedFiles.length > 20 && (
                      <li className="more">… {t('folderImport.moreFiles', { count: pickedFiles.length - 20 })}</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div className="folder-import-path">
              <label className="modal-field">
                <span>{t('folderImport.pathLabel')}</span>
                <div className="modal-input-row">
                  <Terminal size={18} />
                  <input
                    autoFocus
                    disabled={loading}
                    onChange={(event) => setPath(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') handleSubmitPath();
                    }}
                    placeholder={t('folderImport.pathPlaceholder')}
                    type="text"
                    value={path}
                  />
                </div>
                <small>{t('folderImport.pathHint')}</small>
              </label>
            </div>
          )}

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
              {result.items && result.items.some((item) => !item.ok) && (
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
          {!result && mode === 'picker' && (
            <button
              className="btn-primary"
              disabled={pickedFiles.length === 0 || loading}
              onClick={handleSubmitPicker}
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
          {!result && mode === 'path' && (
            <button
              className="btn-primary"
              disabled={!path.trim() || loading}
              onClick={handleSubmitPath}
              type="button"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="spin" />
                  {t('folderImport.importing')}
                </>
              ) : (
                t('folderImport.startScan')
              )}
            </button>
          )}
        </footer>
      </div>
    </div>
  );
}
