import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronUp, Database, Pencil, Plus, Trash2 } from 'lucide-react';
import { formatBaseMeta } from '../utils/knowledge';

/**
 * 顶部知识库切换器。
 *
 * 显示当前选中的知识库，点击后展开下拉面板切换、新建、编辑或删除知识库。
 *
 * @param {object} props
 * @param {Array<{id?: string, title: string}>} props.knowledgeBases - 知识库列表
 * @param {string|null} props.selectedKnowledgeBaseId - 当前选中的知识库 ID
 * @param {(id: string) => void} props.onSelect - 选择知识库时的回调
 * @param {() => void} props.onCreate - 点击新建知识库时的回调
 * @param {(base: {id: string, title: string, summary: string}) => void} props.onEdit - 点击编辑知识库时的回调
 * @param {(base: {id: string, title: string}) => void} props.onDelete - 点击删除知识库时的回调
 * @author fxbin
 */
export default function KnowledgeBaseSwitcher({ knowledgeBases, selectedKnowledgeBaseId, onSelect, onCreate, onEdit, onDelete }) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef(null);

  const selectedBase = knowledgeBases.find((base) => base.id === selectedKnowledgeBaseId)
    ?? knowledgeBases[0]
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
   * 选中知识库并关闭下拉面板。
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
        <span className="kb-switcher-title">{selectedBase?.title ?? t('knowledgeBase.select')}</span>
        {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {isOpen && (
        <div className="kb-switcher-panel">
          <div className="kb-switcher-head">
            <span>{t('knowledgeBase.switch')}</span>
            <button onClick={onCreate} type="button">
              <Plus size={14} />
              {t('common.create')}
            </button>
          </div>
          <div className="kb-switcher-list">
            {knowledgeBases.length === 0 && (
              <span className="kb-switcher-empty">{t('common.empty')}</span>
            )}
            {knowledgeBases.map((base) => (
              <button
                className={base.id === selectedKnowledgeBaseId ? 'selected' : ''}
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
                      aria-label={t('knowledgeBase.edit')}
                      className="kb-switcher-action"
                      onClick={(event) => handleAction(event, onEdit, base)}
                      type="button"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      aria-label={t('knowledgeBase.delete')}
                      className="kb-switcher-action danger"
                      onClick={(event) => handleAction(event, onDelete, base)}
                      type="button"
                    >
                      <Trash2 size={14} />
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
