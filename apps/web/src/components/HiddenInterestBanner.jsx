/**
 * 隐性真兴趣提示横幅（NS-8）。
 *
 * 当 Q3（隐性真兴趣象限）存在未上架但笔记深度达标的书目时，
 * 后端 buildHiddenInterestHint 返回 shouldShow=true，
 * 本组件以轻量横幅形式展示代表书目与总数，并提供三条操作：
 *
 * 1. 标记已展示（markShown）：记录 lastShownAt，触发 24h 频控冷却
 * 2. 忽略此本（onDismissBook）：将该本书加入 dismissedBookIds，不再提示
 * 3. 永久关闭（onTogglePermanent）：设置 permanentlyDismissed=true，彻底关闭
 *
 * 当 hint 为 null 或 hint.shouldShow 为 false 时，组件返回 null（不渲染）。
 *
 * @module components/HiddenInterestBanner
 * @author fxbin
 */

const MODE_BANNER = 'banner_24h';
const REASON_FALLBACK = '';

/**
 * @param {object} props
 * @param {object|null} [props.hint] 隐性真兴趣提示对象（shouldShow / mode / totalCount / representativeBook / reason）
 * @param {() => Promise<boolean>} [props.onMarkShown] 标记已展示回调
 * @param {(bookId: string) => Promise<boolean>} [props.onDismissBook] 忽略单本回调
 * @param {() => Promise<boolean>} [props.onTogglePermanent] 永久关闭回调
 * @param {boolean} [props.busy] 操作进行中（禁用按钮）
 * @returns {JSX.Element|null}
 */
export default function HiddenInterestBanner({
  hint,
  onMarkShown,
  onDismissBook,
  onTogglePermanent,
  busy = false,
}) {
  if (!hint || !hint.shouldShow || hint.mode !== MODE_BANNER) {
    return null;
  }

  const representative = hint.representativeBook;
  const total = typeof hint.totalCount === 'number' ? hint.totalCount : 0;
  const reason = hint.reason || REASON_FALLBACK;

  const handleDismissBook = () => {
    if (representative && onDismissBook) {
      onDismissBook(representative.bookId);
    }
  };

  return (
    <div className="hidden-interest-banner" role="status" aria-live="polite">
      <div className="hidden-interest-banner__body">
        <div className="hidden-interest-banner__title">
          {total > 0
            ? `发现了 ${total} 本你默默深读但没上架的书`
            : '发现了你默默深读的书'}
        </div>
        {representative ? (
          <div className="hidden-interest-banner__book">
            <span className="hidden-interest-banner__book-title">{representative.title}</span>
            {representative.isDeep ? (
              <span className="hidden-interest-banner__badge">深度笔记</span>
            ) : null}
          </div>
        ) : null}
        {reason ? (
          <div className="hidden-interest-banner__reason">{reason}</div>
        ) : null}
      </div>
      <div className="hidden-interest-banner__actions">
        <button
          type="button"
          className="hidden-interest-banner__btn hidden-interest-banner__btn--primary"
          onClick={onMarkShown}
          disabled={busy}
        >
          知道了
        </button>
        {representative && onDismissBook ? (
          <button
            type="button"
            className="hidden-interest-banner__btn"
            onClick={handleDismissBook}
            disabled={busy}
          >
            忽略此本
          </button>
        ) : null}
        {onTogglePermanent ? (
          <button
            type="button"
            className="hidden-interest-banner__btn hidden-interest-banner__btn--ghost"
            onClick={onTogglePermanent}
            disabled={busy}
          >
            永久关闭
          </button>
        ) : null}
      </div>
    </div>
  );
}
