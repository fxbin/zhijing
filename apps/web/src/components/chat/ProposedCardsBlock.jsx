/**
 * 提议卡片区块组件。
 *
 * 由 ChatMessageItem 拆分而来，渲染 assistant 消息内嵌的提议卡片列表。
 *
 * @module components/chat/ProposedCardsBlock
 * @author fxbin
 */

/**
 * 提议卡片区块（assistant 消息内嵌）。
 *
 * 与 useProposedCards hook 协同：
 * - proposedCardSelections：选中索引集合
 * - toggleProposedCard：切换单张选中
 * - acceptProposedCards：采纳选中
 * - dismissProposedCards：忽略全部
 * - acceptingCards：采纳进行态
 * - acceptError：采纳错误文案
 *
 * @param {object} props - 组件属性
 * @param {Array<object>} props.proposedCards - 提议卡片列表
 * @param {object} props.state - useProposedCards 返回值
 * @param {function} props.cardTypeLabel - CardType → 本地化文案映射函数
 * @param {function} props.t - i18n 翻译函数
 * @returns {JSX.Element} 提议卡片区块
 * @author fxbin
 */
export default function ProposedCardsBlock({ proposedCards, state, cardTypeLabel, t }) {
  const {
    proposedCardSelections,
    toggleProposedCard,
    acceptingCards,
    acceptError,
    acceptProposedCards,
    dismissProposedCards,
  } = state;

  return (
    <div className="proposed-cards-panel">
      <div className="proposed-cards-head">
        <strong>{t('detail.proposedCardsTitle')}</strong>
        <span className="proposed-cards-hint">{t('detail.proposedCardsHint')}</span>
      </div>
      <div className="proposed-cards-list">
        {proposedCards.map((card, index) => (
          <label
            key={index}
            className={`proposed-card-item ${proposedCardSelections.has(index) ? 'selected' : ''}`}
          >
            <input
              type="checkbox"
              checked={proposedCardSelections.has(index)}
              onChange={() => toggleProposedCard(index)}
            />
            <span className="card-type-badge">{cardTypeLabel(card.type)}</span>
            <div className="proposed-card-body">
              <strong>{card.title}</strong>
              <p>{card.body}</p>
            </div>
          </label>
        ))}
      </div>
      <div className="proposed-cards-actions">
        <button
          type="button"
          className="proposed-cards-accept"
          disabled={acceptingCards || proposedCardSelections.size === 0}
          onClick={() => void acceptProposedCards()}
        >
          {acceptingCards ? t('detail.proposedCardsAccepting') : t('detail.proposedCardsAccept')}
        </button>
        <button
          type="button"
          className="proposed-cards-dismiss"
          disabled={acceptingCards}
          onClick={dismissProposedCards}
        >
          {t('detail.proposedCardsDismiss')}
        </button>
      </div>
      {acceptError && (
        <p className="proposed-cards-error" role="alert">{acceptError}</p>
      )}
    </div>
  );
}
