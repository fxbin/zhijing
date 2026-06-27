/**
 * 通知下拉组件：将任务列表收纳到顶部通知铃铛中。
 * 红点表示未读任务数，打开下拉或点击"全部已读"后红点消失。
 * @module components/NotificationDropdown
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Bell, ClipboardList, CheckCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import EmptyState from './EmptyState';
import TaskList from './TaskList';

/**
 * 已读标记持久化 key。
 */
const READ_TASK_IDS_STORAGE_KEY = 'zhijing:readTaskIds';

/**
 * 读取已读任务 ID 集合。
 * @returns {Set<string>} 已读任务 ID 集合
 */
function loadReadTaskIds() {
  try {
    const raw = localStorage.getItem(READ_TASK_IDS_STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? new Set(parsed) : new Set();
  } catch {
    return new Set();
  }
}

/**
 * 持久化已读任务 ID 集合。
 * @param {Set<string>} readIds - 已读任务 ID 集合
 */
function saveReadTaskIds(readIds) {
  try {
    localStorage.setItem(READ_TASK_IDS_STORAGE_KEY, JSON.stringify([...readIds]));
  } catch {
    // 存储失败时静默降级，不影响 UI 交互
  }
}

/**
 * 顶部通知铃铛下拉菜单。
 * @param {object} props - 组件属性
 * @param {Array<object>} props.tasks - 任务数组
 * @returns {JSX.Element} 通知下拉组件
 * @author fxbin
 */
export default function NotificationDropdown({ tasks }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [readTaskIds, setReadTaskIds] = useState(() => loadReadTaskIds());
  const containerRef = useRef(null);

  /**
   * 未读任务列表：任务 ID 不在已读集合中的即为未读。
   */
  const unreadTasks = useMemo(
    () => tasks.filter((task) => !readTaskIds.has(task.id)),
    [tasks, readTaskIds],
  );

  /**
   * 将当前所有任务标记为已读，并持久化。
   */
  const markAllAsRead = useCallback(() => {
    const nextReadIds = new Set(readTaskIds);
    tasks.forEach((task) => nextReadIds.add(task.id));
    setReadTaskIds(nextReadIds);
    saveReadTaskIds(nextReadIds);
  }, [tasks, readTaskIds]);

  /**
   * 打开下拉时自动将当前可见任务标记为已读。
   */
  useEffect(() => {
    if (open && unreadTasks.length > 0) {
      markAllAsRead();
    }
  }, [open, unreadTasks.length, markAllAsRead]);

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
        {unreadTasks.length > 0 && <span className="notification-badge">{unreadTasks.length}</span>}
      </button>
      {open && (
        <div className="notification-menu" role="menu">
          <div className="notification-menu-head">
            <ClipboardList size={18} />
            <span>{t('taskList.title')}</span>
            {tasks.length > 0 && (
              <button
                type="button"
                className="notification-mark-all"
                onClick={markAllAsRead}
              >
                <CheckCheck size={14} />
                {t('notification.markAllRead')}
              </button>
            )}
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
