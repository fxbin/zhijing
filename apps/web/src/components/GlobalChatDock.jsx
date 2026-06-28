/**
 * 全局 AI 助手胶囊：跨视图常驻的浮动对话面板。
 *
 * 默认收起为右下角悬浮球，点击展开成 floating 窗口。
 * 支持概念标签点击与 Cmd+J 快捷键唤起，
 * 统一承载提问、提议卡片采纳、无法回答反馈与历史问题入口。
 *
 * 对话渲染：通过 utils/chatThread.mergeToThread 将流式消息、历史消息、
 * 一次性回答三套结构合并为统一 ChatThreadItem 列表，交由 ChatMessageItem 单一渲染。
 *
 * @module components/GlobalChatDock
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Database,
  HelpCircle,
  History,
  Loader2,
  Send,
  Sparkles,
  Square,
} from 'lucide-react';
import { useChatLayout } from '../hooks/useChatLayout';
import { useProposedCards } from '../hooks/useProposedCards';
import { mergeToThread } from '../utils/chatThread';
import AIChatShell from './AIChatShell';
import ChatHistoryPanel from './ChatHistoryPanel';
import ChatMessageItem from './ChatMessageItem';
import EmptyState from './EmptyState';
import { CHAT_OPEN_EVENT } from '../constants/options';

const DOCK_STORAGE_KEY = 'zhijing-chat-dock';

/**
 * 全局对话胶囊组件。
 * @param {object} props - 组件属性
 * @param {string} props.apiStatus - API 在线状态
 * @param {object} props.assistantAnswer - 助手回答对象（旧一次性路径）
 * @param {string} props.assistantQuestion - 当前问题输入
 * @param {object} props.detail - 当前工作区详情
 * @param {boolean} props.isAsking - 是否正在提问（旧一次性路径）
 * @param {object[]} [props.workspaces=[]] - 全量工作区列表
 * @param {object[]} [props.messages=[]] - 历史消息列表（旧 /ask 路径落库回拉）
 * @param {() => void} props.onAsk - 提问回调（旧一次性路径，保留兼容）
 * @param {(text: string) => void} [props.onStreamAsk] - 流式 Agent 对话提交回调（新路径）
 * @param {object[]} [props.chatMessages=[]] - 流式对话消息列表（useStreamChat 维护）
 * @param {boolean} [props.isStreaming=false] - 流式对话运行态
 * @param {() => void} [props.onClearChat] - 清空流式对话回调
 * @param {(userId: string) => void} [props.onRetryMessage] - 重试上一条流式对话回调
 * @param {(sessionId: string) => void} [props.onSwitchSession] - 切换会话回调
 * @param {string} [props.currentSessionId] - 当前会话 id；用于历史面板高亮
 * @param {() => void} [props.onAbortStream] - 中断当前流式对话回调
 * @param {string} [props.orchestratorMode=''] - 当前编排模式英文标识（mirror/catalyst/navigator）
 * @param {(artifact: object, meta?: object) => void} props.onOpenArtifact - 打开产物回调
 * @param {(workspaceId: string) => void} [props.onSelectWorkspace] - 选择工作区回调
 * @param {(newCards: object[], updatedMessage: object) => void} [props.onCardsAccepted] - 提议卡片采纳成功回调
 * @param {string} props.selectedWorkspaceId - 当前选中工作区 ID
 * @param {(value: string) => void} props.setAssistantQuestion - 设置问题输入
 * @returns {JSX.Element} 对话胶囊
 */
export default function GlobalChatDock({
  apiStatus,
  assistantAnswer,
  assistantQuestion,
  detail,
  isAsking,
  workspaces = [],
  messages = [],
  onAsk,
  onStreamAsk,
  chatMessages = [],
  isStreaming = false,
  orchestratorModeLabel = '',
  orchestratorMode = '',
  orchestratorReason = '',
  onClearChat,
  onRetryMessage,
  onSwitchSession,
  currentSessionId,
  onAbortStream,
  onOpenArtifact,
  onSelectWorkspace,
  onCardsAccepted,
  selectedWorkspaceId,
  setAssistantQuestion,
}) {
  const { t } = useTranslation();
  const layout = useChatLayout(DOCK_STORAGE_KEY, {
    initialMinimized: true,
    initialMode: 'floating',
  });
  const textareaRef = useRef(null);
  const [historyPanelOpen, setHistoryPanelOpen] = useState(false);

  const cards = detail.cards ?? [];
  const materials = detail.materials ?? [];
  const artifacts = detail.artifacts ?? [];
  const canAsk = apiStatus === 'online' && Boolean(selectedWorkspaceId) && !isAsking && !isStreaming;
  const hasStreamPath = typeof onStreamAsk === 'function';
  const questionHistory = materials.filter((material) => material.type === 'question').slice(0, 3);

  const proposedCardsState = useProposedCards({
    selectedWorkspaceId,
    assistantAnswer,
    assistantQuestion,
    onCardsAccepted,
    t,
  });

  /**
   * 将三套消息结构合并为统一 ChatThreadItem 列表，按时间戳排序。
   * 流式消息变化、历史消息变化、一次性回答变化均触发重新合并。
   */
  const threadItems = useMemo(
    () => mergeToThread(chatMessages, messages, artifacts, assistantAnswer),
    [chatMessages, messages, artifacts, assistantAnswer],
  );

  /**
   * 自动滚动对话线程到底部，确保最新消息可见。
   * 监听 threadItems 与 isStreaming，覆盖流式增量与历史加载两种场景。
   */
  useEffect(() => {
    if (layout.minimized) return;
    const thread = document.querySelector('.global-chat-dock .chat-conversation');
    if (thread) {
      thread.scrollTop = thread.scrollHeight;
    }
  }, [threadItems, isStreaming, layout.minimized]);

  /**
   * 输入框自动调整高度，限制在 2-6 行之间。
   */
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    const lineHeight = 24;
    const minHeight = lineHeight * 2;
    const maxHeight = lineHeight * 6;
    ta.style.height = `${Math.min(maxHeight, Math.max(minHeight, ta.scrollHeight))}px`;
  }, [assistantQuestion]);

  /**
   * 监听「请打开对话胶囊」全局事件：产物页等外部入口可 dispatch
   * CustomEvent('zhijing:open-chat') 触发 dock 展开，避免组件层层透传回调。
   */
  useEffect(() => {
    function handleOpen() {
      layout.setMinimized(false);
    }
    window.addEventListener(CHAT_OPEN_EVENT, handleOpen);
    return () => window.removeEventListener(CHAT_OPEN_EVENT, handleOpen);
  }, [layout]);

  return (
    <AIChatShell
      layout={layout}
      title={t('chat.title')}
      className="global-chat-dock"
    >
      {!selectedWorkspaceId ? (
        <div className="global-chat-dock-picker">
          <EmptyState
            title={t('chat.selectWorkspace')}
            body={t('chat.noWorkspaces')}
            icon={Database}
            compact
          />
          {workspaces.length > 0 && (
            <div className="kb-picker-grid">
              {workspaces.map((kb) => (
                <button
                  key={kb.id}
                  className="kb-picker-card"
                  onClick={() => onSelectWorkspace?.(kb.id)}
                  type="button"
                >
                  <Database size={16} />
                  <strong>{kb.title}</strong>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="global-chat-dock-context">
            <button
              className="global-chat-dock-switch"
              onClick={() => onSelectWorkspace?.('')}
              type="button"
            >
              <Database size={14} />
              <span>{detail.title}</span>
            </button>
            <span className="global-chat-dock-stats">
              {orchestratorModeLabel && (
                <span
                  className={`chat-mode-badge chat-mode-${orchestratorModeLabel}`}
                  title={orchestratorReason}
                >
                  {orchestratorModeLabel}
                </span>
              )}
              {t('chat.metric.sources')} {materials.length} · {t('chat.metric.cards')} {cards.length}
            </span>
            <button
              type="button"
              className={`global-chat-dock-history-btn ${historyPanelOpen ? 'active' : ''}`}
              onClick={() => setHistoryPanelOpen((prev) => !prev)}
              title={t('chat.historyToggle')}
              aria-label={t('chat.historyToggle')}
              aria-expanded={historyPanelOpen}
              disabled={isStreaming}
            >
              <History size={14} />
            </button>
          </div>

          {historyPanelOpen && (
            <ChatHistoryPanel
              workspaceId={selectedWorkspaceId}
              currentSessionId={currentSessionId}
              onSwitch={onSwitchSession}
              onClose={() => setHistoryPanelOpen(false)}
            />
          )}

          <div className="chat-conversation">
            <div className="chat-message-item chat-message-hint">
              <Sparkles size={19} />
              <p>{t('chat.answerHint')}</p>
            </div>
            {threadItems.map((item) => (
              <ChatMessageItem
                key={item.id}
                item={item}
                cards={cards}
                materials={materials}
                proposedCardsState={proposedCardsState}
                onOpenArtifact={onOpenArtifact}
                onRetry={onRetryMessage}
                isStreaming={isStreaming}
              />
            ))}
            {orchestratorMode === 'catalyst' && hasStreamPath && threadItems.length > 0 && canAsk && (
              <button
                className="chat-message-skeptic"
                type="button"
                onClick={() => onStreamAsk(t('chat.skepticChallengeMessage'))}
                title={t('chat.skepticChallenge')}
              >
                <HelpCircle size={14} />
                {t('chat.skepticChallenge')}
              </button>
            )}
            {threadItems.length > 0 && !isStreaming && !isAsking && onClearChat && (
              <button className="chat-message-clear" type="button" onClick={onClearChat}>
                {t('chat.clearHistory')}
              </button>
            )}
          </div>

          {questionHistory.length > 0 && (
            <section className="question-history" aria-label={t('detail.questionHistory')}>
              <div className="question-history-head">
                <History size={16} />
                <strong>{t('detail.questionHistory')}</strong>
              </div>
              {questionHistory.map((material) => (
                <button
                  key={material.id ?? material.title}
                  onClick={() => setAssistantQuestion(material.rawInput ?? material.title)}
                  type="button"
                >
                  {material.rawInput ?? material.title}
                </button>
              ))}
            </section>
          )}

          <div className="chat-input-bar">
            <textarea
              ref={textareaRef}
              aria-label={t('chat.askAria')}
              disabled={!canAsk}
              onChange={(event) => setAssistantQuestion(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  if (hasStreamPath && assistantQuestion.trim()) {
                    onStreamAsk(assistantQuestion);
                  } else if (!hasStreamPath && assistantQuestion.trim()) {
                    onAsk();
                  }
                }
              }}
              placeholder={canAsk ? t('chat.askPlaceholderOnline') : t('chat.askPlaceholderOffline')}
              value={assistantQuestion}
              rows={2}
            />
            <button
              disabled={!canAsk || !assistantQuestion.trim()}
              onClick={() => {
                if (hasStreamPath) {
                  onStreamAsk(assistantQuestion);
                } else {
                  onAsk();
                }
              }}
              type="button"
            >
              {isAsking ? <Loader2 size={18} className="chat-message-tool-spinner" /> : <Send size={18} />}
            </button>
            {isStreaming && onAbortStream && (
              <button
                className="chat-message-abort"
                onClick={onAbortStream}
                type="button"
                aria-label={t('chat.stopAsk')}
              >
                <Square size={16} />
              </button>
            )}
          </div>
        </>
      )}
    </AIChatShell>
  );
}
