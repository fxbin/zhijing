/**
 * 知识库详情视图：展示卡片、来源、实体、Roadmap 与 AI 助手面板。
 * @module views/DetailView
 */

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  BarChart3,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CircleX,
  Clock3,
  History,
  Send,
  Sparkles,
  SquareArrowOutUpRight,
  Users,
} from 'lucide-react';
import { materialMediaUrls } from '../utils/material';
import { formatPercent } from '../utils/format';
import { extractConceptTags, groupCardsByType } from '../utils/knowledge';
import { useCardTypeLabel, useClaimStatusLabel, useIntakeKindLabel, useParseStatusLabel } from '../utils/i18nLabels';
import EmptyState from '../components/EmptyState';
import MediaPreview from '../components/MediaPreview';
import SourceCitation from '../components/SourceCitation';
import TaskStatus from '../components/TaskStatus';

/**
 * 知识库详情视图。
 * @param {object} props - 组件属性
 * @param {string} props.apiStatus - API 在线状态
 * @param {object} props.analytics - 知识库分析数据
 * @param {object} props.assistantAnswer - 助手回答对象
 * @param {string} props.assistantQuestion - 当前问题输入
 * @param {object} props.detail - 知识库详情
 * @param {boolean} props.isAsking - 是否正在提问
 * @param {object} props.latestTask - 最近任务
 * @param {Array} props.messages - 历史消息列表
 * @param {() => void} props.onAsk - 提问回调
 * @param {(artifact: object, meta?: object) => void} props.onOpenArtifact - 打开产物回调
 * @param {(materialId: string) => void} props.onParseMaterial - 解析资料回调
 * @param {string} props.parsingMaterialId - 正在解析的资料 ID
 * @param {string} props.selectedKnowledgeBaseId - 当前选中知识库 ID
 * @param {(value: string) => void} props.setAssistantQuestion - 设置问题输入
 * @param {(view: string) => void} props.setView - 切换视图
 * @returns {JSX.Element} 详情视图
 */
export default function DetailView({
  apiStatus,
  analytics,
  assistantAnswer,
  assistantQuestion,
  detail,
  isAsking,
  latestTask,
  messages,
  onAsk,
  onOpenArtifact,
  onParseMaterial,
  parsingMaterialId,
  selectedKnowledgeBaseId,
  setAssistantQuestion,
  setView,
}) {
  const { t } = useTranslation();
  const cardTypeLabel = useCardTypeLabel();
  const claimStatusLabel = useClaimStatusLabel();
  const parseStatusLabel = useParseStatusLabel();
  const intakeKindLabel = useIntakeKindLabel();
  const [feedMode, setFeedMode] = useState('feed');
  const [feedViewMode, setFeedViewMode] = useState('grouped');
  const [collapsedGroups, setCollapsedGroups] = useState(new Set());
  const cards = detail.cards ?? [];
  const materials = detail.materials ?? [];
  const artifacts = detail.artifacts ?? [];
  const roadmapCards = cards.slice(0, 4);
  const conceptTags = extractConceptTags(cards);
  const cardGroups = groupCardsByType(cards);
  const canAsk = apiStatus === 'online' && Boolean(selectedKnowledgeBaseId) && !isAsking;
  const latestAnswerCards = assistantAnswer?.cards?.slice(0, 2) ?? [];
  const latestCitations = assistantAnswer?.citations ?? [];
  const questionHistory = materials.filter((material) => material.type === 'question').slice(0, 3);
  const totals = analytics?.totals;
  const statusDistribution = analytics?.materialStatusDistribution?.slice(0, 4) ?? [];
  const platformDistribution = analytics?.platformDistribution?.slice(0, 4) ?? [];
  const CARD_TYPE_ORDER = ['concept', 'method', 'case', 'step', 'viewpoint', 'fact', 'question', 'general'];
  const sortedGroupEntries = CARD_TYPE_ORDER
    .filter((type) => (cardGroups[type]?.length ?? 0) > 0)
    .map((type) => [type, cardGroups[type]]);

  const [entities, setEntities] = useState([]);
  const [loadingEntities, setLoadingEntities] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [entityError, setEntityError] = useState('');
  const [highlightedCardId, setHighlightedCardId] = useState(null);

  useEffect(() => {
    if (!selectedKnowledgeBaseId) return;
    let ignore = false;
    setLoadingEntities(true);
    setEntityError('');
    async function loadEntities() {
      try {
        const response = await fetch(`/api/knowledge-bases/${selectedKnowledgeBaseId}/entities`);
        if (!response.ok) return;
        const payload = await response.json();
        if (!ignore) setEntities(payload.entities ?? []);
      } catch {
        if (!ignore) setEntities([]);
      } finally {
        if (!ignore) setLoadingEntities(false);
      }
    }
    loadEntities();
    return () => { ignore = true; };
  }, [selectedKnowledgeBaseId]);

  /**
   * 点击 Roadmap 节点后滚动并高亮对应卡片。
   * @param {string} cardId - 卡片 ID
   */
  function handleRoadmapNodeClick(cardId) {
    setHighlightedCardId(cardId);
    const element = document.getElementById(`card-${cardId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    const timer = setTimeout(() => setHighlightedCardId(null), 2000);
    return () => clearTimeout(timer);
  }

  /**
   * 切换 Feed 分组的折叠状态。
   * @param {string} type - 卡片类型
   */
  function toggleGroup(type) {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  }

  async function extractEntitiesAction() {
    if (!selectedKnowledgeBaseId || extracting) return;
    setExtracting(true);
    setEntityError('');
    try {
      const response = await fetch(`/api/knowledge-bases/${selectedKnowledgeBaseId}/entities/extract`, { method: 'POST' });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        setEntityError(payload.error ?? '实体提取失败');
        return;
      }
      const payload = await response.json();
      setEntities(payload.entities ?? []);
    } catch {
      setEntityError('网络错误，实体提取失败');
    } finally {
      setExtracting(false);
    }
  }

  const ENTITY_TYPE_LABELS = {
    person: '人物',
    organization: '组织',
    concept: '概念',
    tool: '工具',
    place: '地点',
    event: '事件',
    other: '其他',
  };

  return (
    <section className="page-grid">
      <div className="page-main">
        <p className="breadcrumb">Workspace / {detail.title}</p>
        <div className="page-title-row">
          <div>
            <span className="status-chip">In Progress</span>
            <h2>{detail.title}</h2>
            <p>{detail.summary}</p>
          </div>
          <div className="page-title-actions">
            <button onClick={() => setView('chat')} type="button">Chat</button>
            <button onClick={() => setView('recall')} type="button">Recall</button>
            <button onClick={() => setView('export')} type="button">Export</button>
            <button onClick={() => setView('workflow')} type="button">Run Kit</button>
          </div>
        </div>
        {analytics && (
          <section className="detail-metrics" aria-label="知识库指标">
            <article>
              <span>Sources</span>
              <strong>{totals?.materials ?? materials.length}</strong>
            </article>
            <article>
              <span>Cards</span>
              <strong>{totals?.cards ?? cards.length}</strong>
            </article>
            <article>
              <span>Sourced</span>
              <strong>{formatPercent(analytics.sourcedRatio)}</strong>
            </article>
            <article>
              <span>Tasks</span>
              <strong>{totals?.tasks ?? 0}</strong>
            </article>
          </section>
        )}
        {cards.length > 0 && (
          <section className="detail-analysis" aria-label="卡片与来源分析">
            <div className="analysis-head">
              <BarChart3 size={18} />
              <strong>卡片类型分布</strong>
            </div>
            <div className="analysis-bars">
              {Object.entries(cardGroups).map(([type, group]) => {
                const ratio = cards.length > 0 ? Math.round((group.length / cards.length) * 100) : 0;
                return (
                  <div className="analysis-bar-row" key={type}>
                    <span className={`analysis-bar-label type-${type}`}>{cardTypeLabel(type)}</span>
                    <div className="analysis-bar-track">
                      <div className={`analysis-bar-fill type-${type}`} style={{ width: `${ratio}%` }} />
                    </div>
                    <span className="analysis-bar-count">{group.length} ({ratio}%)</span>
                  </div>
                );
              })}
            </div>
            <div className="analysis-coverage">
              <span>来源覆盖率</span>
              <strong>{formatPercent(cards.length > 0 ? cards.filter((card) => card.claimStatus === 'sourced').length / cards.length : 0)}</strong>
              <small>{cards.filter((card) => card.claimStatus === 'sourced').length} / {cards.length} 张已溯源</small>
            </div>
          </section>
        )}
        <div className="detail-layout">
          <aside className="roadmap">
            <h3>Roadmap</h3>
            {roadmapCards.map((card, index) => (
              <div
                className={`roadmap-node ${index === 0 ? 'active' : ''} ${card.claimStatus === 'sourced' ? 'done' : ''}`}
                key={card.id ?? card.title}
                onClick={() => handleRoadmapNodeClick(card.id)}
                onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') handleRoadmapNodeClick(card.id); }}
                role="button"
                tabIndex={0}
                title="点击跳转到对应卡片"
              >
                <span className="roadmap-index">{index + 1}</span>
                <div className="roadmap-body">
                  <strong>{card.title}</strong>
                  <small>{card.claimStatus === 'sourced' ? '已溯源' : 'AI 骨架，待补充来源'}</small>
                </div>
              </div>
            ))}
          </aside>
          <section className="entity-panel">
            <div className="panel-title">
              <Users size={20} />
              <div>
                <span>Entities</span>
                <h4>实体清单</h4>
              </div>
              <button
                className="entity-extract-btn"
                type="button"
                onClick={extractEntitiesAction}
                disabled={extracting || cards.length === 0}
                title={cards.length === 0 ? '需要先生成知识卡片' : '从当前卡片中提取实体'}
              >
                {extracting ? '提取中…' : '提取实体'}
              </button>
            </div>
            {entityError && <p className="entity-error">{entityError}</p>}
            {loadingEntities ? (
              <p className="entity-empty">加载中…</p>
            ) : entities.length === 0 ? (
              <p className="entity-empty">暂无实体。点击「提取实体」从知识库卡片中识别人物、组织、概念、工具等。</p>
            ) : (
              <ul className="entity-list">
                {entities.map((entity) => (
                  <li key={entity.id} className="entity-item">
                    <div className="entity-head">
                      <strong>{entity.name}</strong>
                      <span className="entity-type-badge">{ENTITY_TYPE_LABELS[entity.type] ?? entity.type}</span>
                    </div>
                    <p>{entity.description}</p>
                    <small>{entity.sourceCardIds.length} 张卡片提及</small>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section className="feed">
            <div className="tabs">
              <button className={feedMode === 'feed' ? 'active' : ''} onClick={() => setFeedMode('feed')} type="button">Structured Feed</button>
              <button className={feedMode === 'cluster' ? 'active' : ''} onClick={() => setFeedMode('cluster')} type="button">Connections</button>
            </div>
            {cards.length === 0 ? (
              <EmptyState title="暂无知识卡片" body="创建主题或导入资料后，这里会生成结构化卡片。" />
            ) : feedMode === 'feed' ? (
              <>
                <div className="feed-controls">
                  <div className="feed-type-distribution">
                    {sortedGroupEntries.map(([type, group]) => {
                      const ratio = cards.length > 0 ? Math.round((group.length / cards.length) * 100) : 0;
                      return (
                        <div
                          key={type}
                          className={`feed-dist-segment type-${type}`}
                          style={{ width: `${ratio}%` }}
                          title={`${cardTypeLabel(type)}: ${group.length} (${ratio}%)`}
                        >
                          <span className="feed-dist-label">{cardTypeLabel(type)}</span>
                          <span className="feed-dist-count">{group.length}</span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="feed-view-toggle">
                    <button className={feedViewMode === 'grouped' ? 'active' : ''} onClick={() => setFeedViewMode('grouped')} type="button">{t('detail.groupedView')}</button>
                    <button className={feedViewMode === 'list' ? 'active' : ''} onClick={() => setFeedViewMode('list')} type="button">{t('detail.listView')}</button>
                  </div>
                </div>
                {feedViewMode === 'grouped' ? (
                  <div className="feed-groups">
                    {sortedGroupEntries.map(([type, group]) => {
                      const isCollapsed = collapsedGroups.has(type);
                      return (
                        <section className="feed-group" key={type}>
                          <header className="feed-group-head" onClick={() => toggleGroup(type)}>
                            <div>
                              <i className={`feed-group-dot ${type}`} />
                              <strong>{cardTypeLabel(type)}</strong>
                              <small>{group.length} 张</small>
                            </div>
                            {isCollapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
                          </header>
                          {!isCollapsed && (
                            <div className="feed-group-body">
                              {group.map((card) => (
                                <article
                                  id={`card-${card.id}`}
                                  className={`knowledge-card type-${card.type ?? 'general'} ${highlightedCardId === card.id ? 'highlighted' : ''}`}
                                  key={card.id ?? card.title}
                                >
                                  <div className="card-head">
                                    <span className="card-type-badge">{cardTypeLabel(card.type)}</span>
                                    {card.claimStatus === 'sourced' && (
                                      <span className="card-source-badge"><CheckCircle2 size={14} />{claimStatusLabel(card.claimStatus)}</span>
                                    )}
                                  </div>
                                  <h3>{card.title}</h3>
                                  <p>{card.body}</p>
                                  <footer>{claimStatusLabel(card.claimStatus)} · {card.updatedAt ? new Date(card.updatedAt).toLocaleDateString() : 'today'}</footer>
                                </article>
                              ))}
                            </div>
                          )}
                        </section>
                      );
                    })}
                  </div>
                ) : (
                  <div className="feed-list">
                    {cards.map((card) => (
                      <article
                        id={`card-${card.id}`}
                        className={`knowledge-card type-${card.type ?? 'general'} ${highlightedCardId === card.id ? 'highlighted' : ''}`}
                        key={card.id ?? card.title}
                      >
                        <div className="card-head">
                          <span className="card-type-badge">{cardTypeLabel(card.type)}</span>
                          {card.claimStatus === 'sourced' && (
                            <span className="card-source-badge"><CheckCircle2 size={14} />{claimStatusLabel(card.claimStatus)}</span>
                          )}
                        </div>
                        <h3>{card.title}</h3>
                        <p>{card.body}</p>
                        <footer>{claimStatusLabel(card.claimStatus)} · {card.updatedAt ? new Date(card.updatedAt).toLocaleDateString() : 'today'}</footer>
                      </article>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="card-cluster">
                {Object.entries(cardGroups).map(([type, group]) => (
                  <section className="cluster-group" key={type}>
                    <header className="cluster-head">
                      <i className={`cluster-type-dot ${type}`} />
                      <strong>{cardTypeLabel(type)}</strong>
                      <small>{group.length} 张</small>
                    </header>
                    {group.map((card) => (
                      <article className={`knowledge-card type-${type}`} key={card.id ?? card.title}>
                        <h3>{card.title}</h3>
                        <p>{card.body}</p>
                        {card.claimStatus === 'sourced' && (
                          <span className="card-source-badge"><CheckCircle2 size={14} />{claimStatusLabel(card.claimStatus)}</span>
                        )}
                      </article>
                    ))}
                  </section>
                ))}
              </div>
            )}
            {cards.length > 0 && conceptTags.length > 0 && (
              <div className="concept-tags">
                <div className="concept-tags-head">
                  <Sparkles size={16} />
                  <strong>Related Concepts</strong>
                </div>
                <div className="concept-tag-list">
                  {conceptTags.map((tag) => (
                    <button className="concept-tag" key={tag} onClick={() => setAssistantQuestion(tag)} type="button">{tag}</button>
                  ))}
                </div>
              </div>
            )}
            {materials.length === 0 && <EmptyState title="暂无来源资料" body="保存链接后，来源会作为可追溯依据显示在这里。" />}
            {materials.map((material) => (
              <article className="source-strip" key={material.id ?? material.title}>
                <BookOpen size={22} />
                <div>
                  <strong>{material.title}</strong>
                  <span>
                    {material.platform ?? intakeKindLabel(material.type)} · {parseStatusLabel(material.parseStatus)}
                    {materialMediaUrls(material).length > 0 ? ` · ${materialMediaUrls(material).length} 个媒体` : ''}
                  </span>
                  <MediaPreview urls={materialMediaUrls(material)} compact />
                </div>
                {material.type === 'link' && (
                  <button
                    disabled={parsingMaterialId === material.id || material.parseStatus === 'parsing' || material.parseStatus === 'ingested'}
                    onClick={() => onParseMaterial(material.id)}
                    type="button"
                  >
                    {material.parseStatus === 'failed' ? t('detail.retryButton') : material.parseStatus === 'ingested' ? t('detail.parsedButton') : t('detail.parseButton')}
                  </button>
                )}
              </article>
            ))}
          </section>
        </div>
      </div>
      <aside className="assistant-panel">
        <h3>AI Assistant</h3>
        <p>当前知识库有 {detail.sourceCount ?? materials.length} 条资料、{detail.cardCount ?? cards.length} 张卡片。</p>
        {analytics && (
          <section className="source-health">
            <div>
              <strong>Source Health</strong>
              <span>{analytics.generatedAt ? new Date(analytics.generatedAt).toLocaleTimeString() : 'now'}</span>
            </div>
            <div className="health-list">
              {statusDistribution.map((item) => (
                <p key={item.name}><span>{item.name}</span><strong>{item.count}</strong></p>
              ))}
            </div>
            <div className="health-list muted">
              {platformDistribution.map((item) => (
                <p key={item.name}><span>{item.name}</span><strong>{item.count}</strong></p>
              ))}
            </div>
          </section>
        )}
        <TaskStatus task={latestTask} />
        <div className="assistant-thread">
          <div className="assistant-message">
            <Sparkles size={19} />
            <p>{artifacts[0]?.body ?? '我会基于当前知识库里的资料和卡片回答问题。'}</p>
          </div>
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
                        <span>{cardTypeLabel(card.type)}</span>
                        <strong>{card.title}</strong>
                      </article>
                    ))}
                  </div>
                )}
                {assistantAnswer.citations && (
                  <div className="citation-list">
                    <strong>引用来源</strong>
                    {latestCitations.length === 0 ? (
                      <p>当前回答没有可用来源，属于 AI 骨架内容。</p>
                    ) : latestCitations.slice(0, 6).map((citation) => (
                      <SourceCitation key={citation.id} citation={citation} cards={cards} materials={materials} />
                    ))}
                  </div>
                )}
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
        {questionHistory.length > 0 && (
          <section className="question-history" aria-label="最近问题">
            <div className="question-history-head">
              <History size={16} />
              <strong>Recent Questions</strong>
            </div>
            {questionHistory.map((material) => (
              <button key={material.id ?? material.title} onClick={() => setAssistantQuestion(material.rawInput ?? material.title)} type="button">
                {material.rawInput ?? material.title}
              </button>
            ))}
          </section>
        )}
        <div className="assistant-input">
          <input
            aria-label="向当前知识库提问"
            disabled={!canAsk}
            onChange={(event) => setAssistantQuestion(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') onAsk();
            }}
            placeholder={apiStatus === 'online' && selectedKnowledgeBaseId ? 'Ask this knowledge base...' : 'Select a synced knowledge base first'}
            value={assistantQuestion}
          />
          <button disabled={!canAsk || !assistantQuestion.trim()} onClick={onAsk} title="Ask" type="button">
            <Send size={18} />
          </button>
        </div>
      </aside>
    </section>
  );
}
