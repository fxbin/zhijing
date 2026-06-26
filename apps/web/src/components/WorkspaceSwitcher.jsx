import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronUp, Database, Pencil, Plus, Trash2 } from 'lucide-react';
import { formatBaseMeta } from '../utils/knowledge';

/**
 * 顶部工作区切换器。
 *
 * 显示当前选中的工作区，点击后展开下拉面板切换、新建、编辑或删除工作区。
 *
 * @param {object} props
 * @param {Array<{id?: string, title: string}>} props.workspaces - 工作区列表
 * @param {string|null} props.selectedWorkspaceId - 当前选中的工作区 ID
 * @param {(id: string) => void} props.onSelect - 选择工作区时的回调
 * @param {() => void} props.onCreate - 点击新建工作区时的回调
 * @param {(base: {id: string, title: string, summary: string}) => void} props.onEdit - 点击编辑工作区时的回调
 * @param {(base: {id: string, title: string}) => void} props.onDelete - 点击删除工作区时的回调
 * @author fxbin
 */
export default function WorkspaceSwitcher({ workspaces, selectedWorkspaceId, onSelect, onCreate, onEdit, onDelete }) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef(null);

  const selectedBase = workspaces.find((base) => base.id === selectedWorkspaceId)
    ?? workspaces[0]
    ?? null;

  useEffect(() => {
    /**
     * 点击面板外部时关闭下拉。
     * @param {MouseEvent} event
     */
    function handleClickOutside(event) {
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  /**
   * 选中工作区并关闭下拉面板。
   * @param {string} id
   */
  function selectBase(id) {
    onSelect(id);
    setIsOpen(false);
  }

  /**
   * 阻止事件冒泡，避免点击操作按钮时触发 selectBase。
   * @param {React.MouseEvent} event
   * @param {(base: {id: string, title: string, summary?: string}) => void} handler
   * @param {{id: string, title: string, summary?: string}} base
   */
  function handleAction(event, handler, base) {
    event.stopPropagation();
    handler(base);
    setIsOpen(false);
  }

  return (
    <div className="kb-switcher" ref={panelRef}>
      <button
        aria-expanded={isOpen}
        className="kb-switcher-trigger"
        onClick={() => setIsOpen((prev) => !prev)}
        type="button"
      >
        <Database size={18} />
        <span className="kb-switcher-title">{selectedBase?.title ?? t('workspace.select')}</span>
        {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {isOpen && (
        <div className="kb-switcher-panel">
          <div className="kb-switcher-head">
            <span>{t('workspace.switch')}</span>
            <button onClick={onCreate} type="button">
              <Plus size={14} />
              {t('common.create')}
            </button>
          </div>
          <div className="kb-switcher-list">
            {workspaces.length === 0 && (
              <span className="kb-switcher-empty">{t('common.empty')}</span>
            )}
            {workspaces.map((base) => (
              <button
                className={base.id === selectedWorkspaceId ? 'selected' : ''}
                key={base.id ?? base.title}
                onClick={() => selectBase(base.id)}
                type="button"
              >
                <Database size={16} />
                <div className="kb-switcher-info">
                  <strong>{base.title}</strong>
                  <small>{formatBaseMeta(base)}</small>
                </div>
                {base.id && (
                  <div className="kb-switcher-actions">
                    <button
                      aria-label={t('workspace.edit')}
                      className="kb-switcher-action"
                      onClick={(event) => handleAction(event, onEdit, base)}
                      type="button"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      aria-label={t('workspace.delete')}
                      className="kb-switcher-action danger"
                      onClick={(event) => handleAction(event, onDelete, base)}
                      type="button"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
