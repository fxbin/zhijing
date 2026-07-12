/**
 * 工具调用结构化结果渲染组件。
 *
 * 由 ChatMessageItem 拆分而来，负责按工具名定向渲染结构化 details。
 *
 * @module components/chat/ToolResultDetails
 * @author fxbin
 */

import { safeFormatJson } from './constants';

/**
 * 按工具名定向渲染结构化 details。
 *
 * 已识别的工具名与渲染策略：
 * - search_cards：列表展示返回的卡片（type 徽章 + 标题 + 摘要）
 * - search_materials：列表展示返回的资料（platform/parseStatus 徽章 + 标题 + 预览）
 * - get_workspace_summary：紧凑展示工作区概览（标题 / 摘要 / 来源·卡片·资料数）
 * - web_search：列表展示联网搜索结果（标题 + URL + 摘要）
 * - fetch_web_page：展示单页抓取结果（标题 + URL + 正文预览）
 * - deep_search：展示深度搜索结果（来源 + 候选主张 + 缺口/冲突）
 * - 其他：回退到 JSON.stringify 折叠展示
 *
 * @param {object} props - 组件属性
 * @param {string} props.toolName - 工具名
 * @param {unknown} props.details - 结构化结果
 * @param {function} props.t - i18n 翻译函数
 * @returns {JSX.Element|null} 结构化结果节点
 * @author fxbin
 */
export default function ToolResultDetails({ toolName, details, t }) {
  if (!details || typeof details !== 'object') return null;

  if (toolName === 'search_cards') {
    const casted = details;
    const items = Array.isArray(casted.items) ? casted.items : [];
    if (items.length === 0) return null;
    return (
      <details className="chat-message-tool-structured">
        <summary>{t('chat.toolResultCards', { count: casted.count ?? items.length })}</summary>
        <ul className="chat-tool-cards-list">
          {items.map((card) => (
            <li key={card.id}>
              <span className="chat-tool-card-type">{card.type}</span>
              <span className="chat-tool-card-title">{card.title}</span>
              {card.body && <p className="chat-tool-card-body">{card.body}</p>}
            </li>
          ))}
        </ul>
      </details>
    );
  }

  if (toolName === 'search_materials') {
    const casted = details;
    const items = Array.isArray(casted.items) ? casted.items : [];
    if (items.length === 0) return null;
    return (
      <details className="chat-message-tool-structured">
        <summary>{t('chat.toolResultMaterials', { count: casted.count ?? items.length })}</summary>
        <ul className="chat-tool-materials-list">
          {items.map((material) => (
            <li key={material.id}>
              <div className="chat-tool-material-head">
                <span className="chat-tool-material-title">{material.title}</span>
                {material.platform && <span className="chat-tool-material-platform">{material.platform}</span>}
                {material.parseStatus && <span className="chat-tool-material-status">{material.parseStatus}</span>}
              </div>
              {material.preview && <p className="chat-tool-material-preview">{material.preview}</p>}
            </li>
          ))}
        </ul>
      </details>
    );
  }

  if (toolName === 'get_workspace_summary') {
    const overview = details;
    if (!overview || typeof overview !== 'object' || !overview.title) return null;
    return (
      <details className="chat-message-tool-structured">
        <summary>{t('chat.toolResultOverview')}</summary>
        <div className="chat-tool-overview">
          <strong>{overview.title}</strong>
          {overview.summary && <p>{overview.summary}</p>}
          <span className="chat-tool-overview-meta">
            {t('chat.toolResultOverviewFields', {
              sourceCount: overview.sourceCount ?? 0,
              cardCount: overview.cardCount ?? 0,
              materialCount: overview.materialCount ?? 0,
            })}
          </span>
          {overview.stage && <span className="chat-tool-overview-stage">{overview.stage}</span>}
        </div>
      </details>
    );
  }

  if (toolName === 'web_search') {
    const casted = details;
    const items = Array.isArray(casted.results) ? casted.results : [];
    return (
      <details className="chat-message-tool-structured">
        <summary>
          {t('chat.toolResultWebSearch', {
            count: casted.count ?? items.length,
            defaultValue: `联网搜索返回 ${casted.count ?? items.length} 条结果`,
          })}
        </summary>
        {casted.errorMessage && (
          <p className="chat-tool-search-error">{casted.errorMessage}</p>
        )}
        {items.length > 0 && (
          <ul className="chat-tool-search-list">
            {items.map((result, index) => (
              <li key={result.url || index}>
                <a
                  className="chat-tool-search-title"
                  href={result.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  {result.title || result.url}
                </a>
                {result.url && <span className="chat-tool-search-url">{result.url}</span>}
                {result.snippet && <p className="chat-tool-search-snippet">{result.snippet}</p>}
              </li>
            ))}
          </ul>
        )}
      </details>
    );
  }

  if (toolName === 'fetch_web_page') {
    const casted = details;
    return (
      <details className="chat-message-tool-structured">
        <summary>
          {casted.ok
            ? t('chat.toolResultFetchWebPage', { defaultValue: '网页正文' })
            : t('chat.toolResultFetchWebPageFailed', { defaultValue: '网页抓取失败' })}
        </summary>
        {casted.errorMessage && (
          <p className="chat-tool-search-error">{casted.errorMessage}</p>
        )}
        <div className="chat-tool-overview">
          {casted.title && <strong>{casted.title}</strong>}
          {casted.url && (
            <a className="chat-tool-search-url" href={casted.url} target="_blank" rel="noreferrer">
              {casted.url}
            </a>
          )}
          {casted.text && <p className="chat-tool-material-preview">{casted.text}</p>}
        </div>
      </details>
    );
  }

  if (toolName === 'deep_search') {
    const casted = details;
    const sources = Array.isArray(casted.sources) ? casted.sources : [];
    const claims = Array.isArray(casted.claims) ? casted.claims : [];
    const conflicts = Array.isArray(casted.conflicts) ? casted.conflicts : [];
    const gaps = Array.isArray(casted.gaps) ? casted.gaps : [];
    return (
      <details className="chat-message-tool-structured">
        <summary>
          {t('chat.toolResultDeepSearch', {
            count: sources.length,
            defaultValue: `深度搜索返回 ${sources.length} 个来源`,
          })}
        </summary>
        {casted.errorMessage && (
          <p className="chat-tool-search-error">{casted.errorMessage}</p>
        )}
        {sources.length > 0 && (
          <ul className="chat-tool-search-list">
            {sources.map((source, index) => (
              <li key={source.url || index}>
                <a className="chat-tool-search-title" href={source.url} target="_blank" rel="noreferrer">
                  {source.title || source.url}
                </a>
                {source.url && <span className="chat-tool-search-url">{source.url}</span>}
                {source.snippet && <p className="chat-tool-search-snippet">{source.snippet}</p>}
                {source.textPreview && <p className="chat-tool-search-snippet">{source.textPreview}</p>}
                {source.errorMessage && <p className="chat-tool-search-error">{source.errorMessage}</p>}
              </li>
            ))}
          </ul>
        )}
        {claims.length > 0 && (
          <div className="chat-tool-overview">
            <strong>{t('chat.toolResultDeepSearchClaims', { defaultValue: '候选主张' })}</strong>
            {claims.slice(0, 5).map((claim, index) => (
              <p key={`${claim.sourceUrl || index}-${index}`}>{claim.claim}</p>
            ))}
          </div>
        )}
        {(conflicts.length > 0 || gaps.length > 0) && (
          <div className="chat-tool-overview">
            {conflicts.map((conflict, index) => (
              <p key={`conflict-${index}`}>{conflict}</p>
            ))}
            {gaps.map((gap, index) => (
              <p key={`gap-${index}`}>{gap}</p>
            ))}
          </div>
        )}
      </details>
    );
  }

  return (
    <details className="chat-message-tool-structured">
      <summary>{t('chat.toolResultStructured')}</summary>
      <pre className="chat-message-tool-details-text">{safeFormatJson(details)}</pre>
    </details>
  );
}
