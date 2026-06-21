/**
 * 通知下拉组件：将任务列表收纳到顶部通知铃铛中。
 * @module components/NotificationDropdown
 */

import { useEffect, useRef, useState } from 'react';
import { Bell, ClipboardList } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import EmptyState from './EmptyState';
import TaskList from './TaskList';

/**
 * 顶部通知铃铛下拉菜单。
 * @param {object} props - 组件属性
 * @param {Array<object>} props.tasks - 任务数组
 * @returns {JSX.Element} 通知下拉组件
 */
export default function NotificationDropdown({ tasks }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    /**
     * 点击下拉外部时关闭菜单。
     * @param {MouseEvent} event - 鼠标点击事件
     */
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="notification-dropdown" ref={containerRef}>
      <button
        type="button"
        className="notification-trigger"
        title={t('common.notifications')}
        onClick={() => setOpen((previous) => !previous)}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <Bell size={22} />
        {tasks.length > 0 && <span className="notification-badge">{tasks.length}</span>}
      </button>
      {open && (
        <div className="notification-menu" role="menu">
          <div className="notification-menu-head">
            <ClipboardList size={18} />
            <span>{t('taskList.title')}</span>
          </div>
          {tasks.length > 0 ? (
            <TaskList tasks={tasks} showTitle={false} />
          ) : (
            <EmptyState title={t('taskList.noTasks')} body={t('taskList.noTasksHint')} />
          )}
        </div>
      )}
    </div>
  );
}
