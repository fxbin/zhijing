/**
 * Markdown 文件读写器（P9-2a）。
 *
 * 负责知径卡片 / 资料与 Markdown 文件之间的双向转换：
 *  - 手写轻量级 YAML frontmatter 解析器（不依赖 gray-matter / js-yaml）
 *  - 手写 frontmatter 序列化器
 *  - MarkdownFileAdapter 静态工具类
 *
 * 本模块已按功能域物理拆分至 `./markdown/` 子目录：
 *  - constants.ts   模块内部常量
 *  - types.ts        frontmatter 元数据类型
 *  - parser.ts       YAML frontmatter 解析器
 *  - serializer.ts   YAML frontmatter 序列化器
 *  - mappers.ts      普通对象 → 强类型 frontmatter 映射器
 *  - adapter.ts      MarkdownFileAdapter 适配器类
 *
 * 本文件保留为 barrel re-export，保持对外 API 表面不变，
 * 下游从 `./markdown-file.js` 导入的代码零破坏。
 *
 * @author fxbin
 */

export { MarkdownFileAdapter } from './markdown/adapter.js';
export type { CardFrontmatter, MaterialFrontmatter, WorkspaceFrontmatter } from './markdown/types.js';
