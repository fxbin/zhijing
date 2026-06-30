/**
 * 会话历史管理面板。
 *
 * 在对话胶囊内浮层展示，列出当前工作区下所有内存会话，
 * 支持：
 * - 切换到指定会话（onSwitch 回调）
 * - 重命名会话（PATCH /api/workspaces/:id/agent/sessions/:sessionId）
 * - 删除会话（DELETE /api/workspaces/:id/agent/sessions/:sessionId）
 *
 * 会话数据仅存在于后端内存中，API 服务重启后清空；
 * 当前列表通过 GET /api/workspaces/:id/agent/sessions 拉取。
 *
 * @module components/ChatHistoryPanel
 * @author fxbin
 */

import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Check, Loader2, MessageSquareText, Pencil, Plus, Trash2, X } from 'lucide-react';
import api from '../utils/api';

/**
 * 工作区接口路径前缀。
 */
const WORKSPACES_PATH = '/api/workspaces';

/**
 * 会话历史面板组件。
 *
 * @param {object} props - 组件属性
 * @param {string} props.workspaceId - 当前工作区 id
 * @param {string} [props.currentSessionId] - 当前会话 id；高亮显示
 * @param {function} [props.onSwitch] - 切换会话回调，签名为 (sessionId) => void | Promise<void>
 * @param {function} [props.onClose] - 关闭面板回调
 * @returns {JSX.Element} 会话历史面板
 * @author fxbin
 */
export default function ChatHistoryPanel({
  workspaceId,
  currentSessionId,
  onSwitch,
  onNewChat,
  isStreaming = false,
  onClose,
}) {
  const { t } = useTranslation();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState('');
  const [editingTitle, setEditingTitle] = useState('');
  const [busyId, setBusyId] = useState('');

  /**
   * 拉取会话列表。
   */
  const refresh = useCallback(async () => {
    if (!workspaceId) return;
    setLoading(true);
    setError('');
    try {
      const payload = await api.get(`${WORKSPACES_PATH}/${workspaceId}/agent/sessions`);
      setSessions(payload?.sessions ?? []);
    } catch (err) {
      setError(err?.serverMessage ?? err?.message ?? t('chat.historyLoadFailed'));
    } finally {
      setLoading(false);
    }
  }, [workspaceId, t]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  /**
   * 进入重命名编辑态。
   * @param {object} session - 会话条目
   */
  function startRename(session) {
    setEditingId(session.sessionId);
    setEditingTitle(session.title);
  }

  /**
   * 取消重命名。
   */
  function cancelRename() {
    setEditingId('');
    setEditingTitle('');
  }

  /**
   * 提交重命名。
   * @param {string} sessionId - 会话 id
   */
  async function submitRename(sessionId) {
    const title = editingTitle.trim();
    if (!title || !workspaceId || !sessionId) return;
    setBusyId(sessionId);
    try {
      await api.patch(
        `${WORKSPACES_PATH}/${workspaceId}/agent/sessions/${sessionId}`,
        { title },
      );
      setSessions((prev) => prev.map((s) => (s.sessionId === sessionId ? { ...s, title } : s)));
      cancelRename();
    } catch (err) {
      setError(err?.serverMessage ?? err?.message ?? t('chat.historyRenameFailed'));
    } finally {
      setBusyId('');
    }
  }

  /**
   * 删除会话。
   * @param {string} sessionId - 会话 id
   */
  async function deleteSession(sessionId) {
    if (!workspaceId || !sessionId) return;
    setBusyId(sessionId);
    try {
      await api.del(`${WORKSPACES_PATH}/${workspaceId}/agent/sessions/${sessionId}`);
      setSessions((prev) => prev.filter((s) => s.sessionId !== sessionId));
    } catch (err) {
      setError(err?.serverMessage ?? err?.message ?? t('chat.historyDeleteFailed'));
    } finally {
      setBusyId('');
    }
  }

  /**
   * 切换到指定会话。
   * @param {string} sessionId - 会话 id
   */
  async function handleSwitch(sessionId) {
    if (!sessionId || typeof onSwitch !== 'function') return;
    try {
      await onSwitch(sessionId);
      if (typeof onClose === 'function') onClose();
    } catch {
      // 切换失败时保持面板打开，便于重试
    }
  }

  /**
   * 新建对话：调用上层清空当前对话并生成新 sessionId，然后关闭面板。
   * 流式进行中时静默返回，避免上下文丢失。
   */
  function handleNewChat() {
    if (isStreaming || typeof onNewChat !== 'function') return;
    onNewChat();
    if (typeof onClose === 'function') onClose();
  }

  return createPortal(
    <div className="chat-history-modal-overlay" onClick={onClose} role="presentation">
      <div
        className="chat-history-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={t('chat.historyTitle')}
      >
        <div className="chat-history-head">
          <strong>
            <MessageSquareText size={14} />
            {t('chat.historyTitle')}
          </strong>
          <div className="chat-history-head-actions">
            <button type="button" className="chat-history-close" onClick={onClose} aria-label={t('chat.historyClose')}>
              <X size={14} />
            </button>
          </div>
        </div>

        {loading && (
          <div className="chat-history-empty">
            <Loader2 size={16} className="chat-history-spinner" />
            <span>{t('chat.historyLoading')}</span>
          </div>
        )}

        {!loading && error && (
          <div className="chat-history-error" role="alert">{error}</div>
        )}

        {!loading && !error && sessions.length === 0 && (
          <div className="chat-history-empty">{t('chat.historyEmpty')}</div>
        )}

        {!loading && !error && sessions.length > 0 && (
          <ul className="chat-history-list">
            {sessions.map((session) => {
              const isCurrent = session.sessionId === currentSessionId;
              const isEditing = editingId === session.sessionId;
              const isBusy = busyId === session.sessionId;
              return (
                <li
                  key={session.sessionId}
                  className={`chat-history-item ${isCurrent ? 'current' : ''}`}
                >
                  <div className="chat-history-item-main">
                    {isEditing ? (
                      <input
                        type="text"
                        className="chat-history-rename-input"
                        value={editingTitle}
                        onChange={(e) => setEditingTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') void submitRename(session.sessionId);
                          if (e.key === 'Escape') cancelRename();
                        }}
                        autoFocus
                        maxLength={80}
                      />
                    ) : (
                      <>
                        <span className="chat-history-item-title" title={session.title}>{session.title}</span>
                        <span className="chat-history-item-meta">
                          {t('chat.historyMessageCount', { count: session.messageCount })}
                          {' · '}
                          {formatRelativeTime(session.lastUsedAt, t)}
                        </span>
                      </>
                    )}
                  </div>

                  <div className="chat-history-item-actions">
                    {isEditing ? (
                      <>
                        <button
                          type="button"
                          className="chat-history-action confirm"
                          onClick={() => void submitRename(session.sessionId)}
                          disabled={isBusy || !editingTitle.trim()}
                          title={t('chat.historyRenameConfirm')}
                        >
                          <Check size={13} />
                        </button>
                        <button
                          type="button"
                          className="chat-history-action cancel"
                          onClick={cancelRename}
                          disabled={isBusy}
                          title={t('chat.historyRenameCancel')}
                        >
                          <X size={13} />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          className="chat-history-action"
                          onClick={() => handleSwitch(session.sessionId)}
                          disabled={isBusy || isCurrent}
                          title={isCurrent ? t('chat.historyCurrent') : t('chat.historySwitch')}
                        >
                          {isBusy ? <Loader2 size={13} className="chat-history-spinner" /> : t('chat.historySwitch')}
                        </button>
                        <button
                          type="button"
                          className="chat-history-action icon"
                          onClick={() => startRename(session)}
                          disabled={isBusy}
                          title={t('chat.historyRename')}
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          type="button"
                          className="chat-history-action icon danger"
                          onClick={() => void deleteSession(session.sessionId)}
                          disabled={isBusy || isCurrent}
                          title={isCurrent ? t('chat.historyCurrentCannotDelete') : t('chat.historyDelete')}
                        >
                          <Trash2 size={13} />
                        </button>
                      </>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>,
    document.body,
  );
}

/**
 * 把 ISO 时间戳格式化为相对时间（如「刚刚」「3 分钟前」「2 小时前」「3 天前」）。
 * 超过 7 天时回退为本地化日期字符串。
 *
 * @param {string} iso - ISO 字符串
 * @param {function} t - i18n 翻译函数
 * @returns {string} 相对时间文案
 * @author fxbin
 */
function formatRelativeTime(iso, t) {
  if (!iso) return '';
  const timestamp = new Date(iso).getTime();
  if (Number.isNaN(timestamp)) return '';
  const diffMs = Date.now() - timestamp;
  const ONE_MINUTE = 60 * 1000;
  const ONE_HOUR = 60 * ONE_MINUTE;
  const ONE_DAY = 24 * ONE_HOUR;
  const SEVEN_DAYS = 7 * ONE_DAY;
  if (diffMs < ONE_MINUTE) return t('chat.historyJustNow');
  if (diffMs < ONE_HOUR) return t('chat.historyMinutesAgo', { count: Math.floor(diffMs / ONE_MINUTE) });
  if (diffMs < ONE_DAY) return t('chat.historyHoursAgo', { count: Math.floor(diffMs / ONE_HOUR) });
  if (diffMs < SEVEN_DAYS) return t('chat.historyDaysAgo', { count: Math.floor(diffMs / ONE_DAY) });
  return new Date(timestamp).toLocaleDateString();
}
