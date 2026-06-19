/**
 * 对话视图：独立的知识库对话页，展示历史消息与引用卡片。
 * @module views/ChatView
 */

import {
  CircleX,
  Clock3,
  Send,
  Sparkles,
  SquareArrowOutUpRight,
} from 'lucide-react';
import { formatPercent } from '../utils/format';
import SourceCitation from '../components/SourceCitation';

/**
 * 知识库对话视图。
 * @param {object} props - 组件属性
 * @param {string} props.apiStatus - API 在线状态
 * @param {object} props.assistantAnswer - 助手回答对象
 * @param {string} props.assistantQuestion - 当前问题输入
 * @param {object} props.detail - 知识库详情
 * @param {boolean} props.isAsking - 是否正在提问
 * @param {() => void} props.onAsk - 提问回调
 * @param {(artifact: object, meta?: object) => void} props.onOpenArtifact - 打开产物回调
 * @param {string} props.selectedKnowledgeBaseId - 当前选中知识库 ID
 * @param {(value: string) => void} props.setAssistantQuestion - 设置问题输入
 * @param {(view: string) => void} props.setView - 切换视图
 * @returns {JSX.Element} 对话视图
 */
export default function ChatView({
  apiStatus,
  assistantAnswer,
  assistantQuestion,
  detail,
  isAsking,
  onAsk,
  onOpenArtifact,
  selectedKnowledgeBaseId,
  setAssistantQuestion,
  setView,
}) {
  const cards = detail.cards ?? [];
  const materials = detail.materials ?? [];
  const latestAnswerCards = assistantAnswer?.cards?.slice(0, 3) ?? [];
  const latestCitations = assistantAnswer?.citations ?? [];
  const canAsk = apiStatus === 'online' && Boolean(selectedKnowledgeBaseId) && !isAsking;
  const starterPrompts = [
    '这个知识库最重要的三个概念是什么？',
    '有哪些内容还缺少可靠来源？',
    '帮我把这些资料整理成一个行动清单。',
  ];

  return (
    <section className="page-main full">
      <div className="chat-workbench">
        <aside className="chat-context-panel">
          <button className="back-button" onClick={() => setView('detail')} type="button">← Back to Knowledge Base</button>
          <span>Knowledge Chat</span>
          <h2>{detail.title}</h2>
          <p>{detail.summary}</p>
          <div className="chat-context-stats">
            <div><strong>{materials.length}</strong><span>sources</span></div>
            <div><strong>{cards.length}</strong><span>cards</span></div>
            <div><strong>{formatPercent(detail.sourcedRatio)}</strong><span>sourced</span></div>
          </div>
          <div className="prompt-stack">
            <strong>Suggested Questions</strong>
            {starterPrompts.map((prompt) => (
              <button key={prompt} onClick={() => setAssistantQuestion(prompt)} type="button">{prompt}</button>
            ))}
          </div>
        </aside>

        <section className="chat-main-panel">
          <div className="chat-thread-head">
            <Sparkles size={24} />
            <div>
              <span>Assistant Onboarding</span>
              <h3>Ask from your sourced knowledge</h3>
            </div>
          </div>
          <div className="chat-conversation">
            <div className="assistant-message">
              <Sparkles size={19} />
              <p>我会优先使用当前知识库里的资料和卡片回答；没有来源时会明确标注。</p>
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
                          <strong>引用卡片</strong>
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
                          <SquareArrowOutUpRight size={15} /> 打开产物
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            {assistantAnswer?.question && <div className="chat-user">{assistantAnswer.question}</div>}
            {assistantAnswer?.loading && <div className="assistant-message pending"><Clock3 size={19} /><p>正在整理当前知识库里的资料和卡片...</p></div>}
            {assistantAnswer?.error && <div className="assistant-message failed"><CircleX size={19} /><p>{assistantAnswer.error}</p></div>}
            {assistantAnswer?.message && (
              <div className="assistant-message">
                <Sparkles size={19} />
                <div>
                  <p>{assistantAnswer.artifact?.body ?? assistantAnswer.message}</p>
                  {latestAnswerCards.length > 0 && (
                    <div className="answer-card-list">
                      {latestAnswerCards.map((card) => (
                        <article key={card.id ?? card.title}>
                          <span>{card.type}</span>
                          <strong>{card.title}</strong>
                        </article>
                      ))}
                    </div>
                  )}
                  <div className="citation-list">
                    <strong>引用来源</strong>
                    {latestCitations.length === 0 ? (
                      <p>当前回答没有可用来源，属于 AI 骨架内容。</p>
                    ) : latestCitations.slice(0, 6).map((citation) => (
                      <SourceCitation key={citation.id} citation={citation} cards={cards} materials={materials} />
                    ))}
                  </div>
                  {assistantAnswer.artifact && (
                    <button className="assistant-link-button" onClick={() => onOpenArtifact(assistantAnswer.artifact)} type="button">
                      Open Artifact
                      <SquareArrowOutUpRight size={15} />
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
          <div className="chat-input-bar">
            <input
              aria-label="在独立对话页提问"
              disabled={!canAsk}
              onChange={(event) => setAssistantQuestion(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') onAsk();
              }}
              placeholder={canAsk ? 'Ask this knowledge base...' : 'Select a knowledge base and keep API online to ask.'}
              value={assistantQuestion}
            />
            <button disabled={!canAsk || !assistantQuestion.trim()} onClick={onAsk} type="button">
              {isAsking ? <Clock3 size={18} /> : <Send size={18} />}
            </button>
          </div>
        </section>
      </div>
    </section>
  );
}
