/**
 * 微信读书分类徽标组件。
 *
 * 依据书籍分类名解析主题色并渲染为圆角徽标。
 * 分类为空时返回 null，不占位。
 *
 * 从 WeReadView.jsx 拆分而来，原行为保持不变。
 *
 * @module views/weread/CategoryChip
 * @author fxbin
 */

import { resolveCategoryTheme } from './utils';

/**
 * 渲染单个分类徽标。
 * @param {Object} props
 * @param {string} props.category - 分类名称（用于解析主题色与展示）
 * @returns {JSX.Element | null}
 */
function CategoryChip({ category }) {
  const theme = resolveCategoryTheme(category);
  if (!theme) return null;
  return (
    <span
      className="weread-category-chip"
      style={{ background: theme.bg, color: theme.color }}
      title={category}
    >
      {category}
    </span>
  );
}

export default CategoryChip;
