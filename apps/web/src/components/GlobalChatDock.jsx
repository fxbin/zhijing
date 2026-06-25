/**
 * 全局对话胶囊：跨视图常驻的浮动对话面板。
 *
 * 默认收起为右下角悬浮球，点击展开成 floating 窗口。
 * 状态（mode/minimized/position）持久化在独立 localStorage 键下，
 * 不影响工作区详情页内嵌的对话面板。
 *
 * @module components/GlobalChatDock
 */

import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Clock3,
  Database,
  Send,
  Sparkles,
  SquareArrowOutUpRight,
} from 'lucide-react';
import { useCardTypeLabel } from '../utils/i18nLabels';
import { useChatLayout } from '../hooks/useChatLayout';
import AIChatShell from './AIChatShell';
import EmptyState from './EmptyState';
import SourceCitation from './SourceCitation';

const DOCK_STORAGE_KEY = 'zhijing-chat-dock';

/**
 * 全局对话胶囊组件。
 * @param {object} props - 组件属性
 * @param {string} props.apiStatus - API 在线状态
 * @param {object} props.assistantAnswer - 助手回答对象
 * @param {string} props.assistantQuestion - 当前问题输入
 * @param {object} props.detail - 当前工作区详情
 * @param {boolean} props.isAsking - 是否正在提问
 * @param {object[]} [props.workspaces=[]] - 全量工作区列表
 * @param {object[]} [props.messages=[]] - 历史消息列表
 * @param {() => void} props.onAsk - 提问回调
 * @param {(artifact: object, meta?: object) => void} props.onOpenArtifact - 打开产物回调
 * @param {(workspaceId: string) => void} [props.onSelectWorkspace] - 选择工作区回调
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
  onOpenArtifact,
  onSelectWorkspace,
  selectedWorkspaceId,
  setAssistantQuestion,
}) {
  const { t } = useTranslation();
  const cardTypeLabel = useCardTypeLabel();
  const layout = useChatLayout(DOCK_STORAGE_KEY, {
    initialMinimized: true,
    initialMode: 'floating',
  });

  const cards = detail.cards ?? [];
  const materials = detail.materials ?? [];
  const latestAnswerCards = assistantAnswer?.cards?.slice(0, 3) ?? [];
  const latestCitations = assistantAnswer?.citations ?? [];
  const canAsk = apiStatus === 'online' && Boolean(selectedWorkspaceId) && !isAsking;

  /**
   * 自动滚动对话线程到底部，确保最新消息可见。
   */
  useEffect(() => {
    if (layout.minimized) {
      return;
    }
    const thread = document.querySelector('.global-chat-dock .chat-conversation');
    if (thread) {
      thread.scrollTop = thread.scrollHeight;
    }
  }, [messages, assistantAnswer, layout.minimized]);

  /**
   * 监听「请打开对话胶囊」全局事件：产物页等外部入口可 dispatch
   * CustomEvent('zhijing:open-chat') 触发 dock 展开，避免组件层层透传回调。
   */
  useEffect(() => {
    function handleOpen() {
      layout.setMinimized(false);
    }
    window.addEventListener('zhijing:open-chat', handleOpen);
    return () => window.removeEventListener('zhijing:open-chat', handleOpen);
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
              {t('chat.metric.sources')} {materials.length} · {t('chat.metric.cards')} {cards.length}
            </span>
          </div>

          <div className="chat-conversation">
            <div className="assistant-message">
              <Sparkles size={19} />
              <p>{t('chat.answerHint')}</p>
            </div>
            {(messages ?? []).map((message) => {
              const messageCards = (message.cardIds ?? [])
                .map((cardId) => cards.find((card) => card.id === cardId))
                .filter(Boolean);
              const messageArtifact = message.artifactId
                ? detail.artifacts?.find((item) => item.id === message.artifactId)
                : undefined;
              return (
                <div key={message.id} className="chat-history-item">
                  <div className="chat-user">{message.question}</div>
                  <div className="assistant-message">
                    <Sparkles size={19} />
                    <div>
                      <p>{message.answer}</p>
                      {messageCards.length > 0 && (
                        <div className="citation-list">
                          <strong>{t('chat.citedCards')}</strong>
                          {messageCards.map((card) => (
                            <SourceCitation
                              key={card.id}
                              citation={{ id: `citation:card:${card.id}`, kind: 'card', cardId: card.id, title: card.title, preview: card.body.slice(0, 120) }}
                              cards={cards}
                              materials={materials}
                            />
                          ))}
                        </div>
                      )}
                      {messageArtifact && (
                        <button className="assistant-link-button" type="button" onClick={() => onOpenArtifact(messageArtifact, { label: message.question })}>
                          <SquareArrowOutUpRight size={15} />
                          {t('chat.openArtifact')}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            {assistantAnswer?.question && <div className="chat-user">{assistantAnswer.question}</div>}
            {assistantAnswer?.loading && <div className="assistant-message pending"><Clock3 size={19} /><p>{t('chat.loadingAnswer')}</p></div>}
            {assistantAnswer?.error && <div className="assistant-message failed"><Sparkles size={19} /><p>{assistantAnswer.error}</p></div>}
            {assistantAnswer?.message && (
              <div className="assistant-message">
                <Sparkles size={19} />
                <div>
                  <p>{assistantAnswer.artifact?.body ?? assistantAnswer.message}</p>
                  {latestAnswerCards.length > 0 && (
                    <div className="answer-card-list">
                      {latestAnswerCards.map((card) => (
                        <article key={card.id ?? card.title}>
                          <span>{cardTypeLabel(card.type)}</span>
                          <strong>{card.title}</strong>
                        </article>
                      ))}
                    </div>
                  )}
                  <div className="citation-list">
                    <strong>{t('chat.citations')}</strong>
                    {latestCitations.length === 0 ? (
                      <p>{t('chat.noCitations')}</p>
                    ) : latestCitations.slice(0, 6).map((citation) => (
                      <SourceCitation key={citation.id} citation={citation} cards={cards} materials={materials} />
                    ))}
                  </div>
                  {assistantAnswer.artifact && (
                    <button className="assistant-link-button" onClick={() => onOpenArtifact(assistantAnswer.artifact)} type="button">
                      {t('chat.openArtifact')}
                      <SquareArrowOutUpRight size={15} />
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="chat-input-bar">
            <input
              aria-label={t('chat.askAria')}
              disabled={!canAsk}
              onChange={(event) => setAssistantQuestion(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') onAsk();
              }}
              placeholder={canAsk ? t('chat.askPlaceholderOnline') : t('chat.askPlaceholderOffline')}
              value={assistantQuestion}
            />
            <button disabled={!canAsk || !assistantQuestion.trim()} onClick={onAsk} type="button">
              {isAsking ? <Clock3 size={18} /> : <Send size={18} />}
            </button>
          </div>
        </>
      )}
    </AIChatShell>
  );
}
