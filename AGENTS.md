# AGENTS.md — 知径项目 AI 协作上下文

> 本文件供 AI 编码代理快速建立项目上下文。修改代码前请先通读「验证门禁」与「禁忌清单」。

## 项目使命

知径（Zhijing）是一个个人知识管理工具，覆盖「主题创建 → 资料导入 → 结构化卡片 → 知识地图 → 对话回忆 → 产物导出」的完整闭环。详见 [README.md](./README.md) 与 [DESIGN.md](./DESIGN.md)。

## 技术栈

| 层 | 技术 | 说明 |
| --- | --- | --- |
| Monorepo | npm workspaces | **禁止引入 pnpm/yarn**，统一 npm |
| 前端 | React 18 + Vite | 当前为单文件 `apps/web/src/main.jsx`（约 3700+ 行） |
| 样式 | 原生 CSS | `apps/web/src/styles.css`，CSS 变量驱动设计系统 |
| 后端 | Fastify + better-sqlite3 | `apps/api/src/app.ts` |
| 核心逻辑 | TypeScript（纯逻辑，无框架） | `packages/core` |
| 运行时校验 | TypeScript | `packages/pi-runtime`，结构化输出校验 |
| 共享类型 | TypeScript | `packages/shared` |
| 语言 | TypeScript strict | 全量 strict 模式 |

## 目录结构

```
apps/
├── api/              后端服务 (Fastify + SQLite)
│   └── src/{app.ts, server.ts}
└── web/              前端应用 (React + Vite)
    └── src/{main.jsx, styles.css}
packages/
├── core/             纯业务逻辑层 (含单元测试 index.test.ts)
├── pi-runtime/       结构化输出校验运行时
└── shared/           跨包共享类型定义
```

## 开发命令

```bash
npm install                # 安装依赖（仅 npm）
npm run dev                # 启动前端 dev server
npm run dev:api            # 启动后端 dev server
npm run typecheck          # 类型检查 (shared/core/pi-runtime/api 四包)
npm test                   # 单元测试 (core 包, tsx --test)
npm run build -w @zhijing/web   # 前端生产构建 (含转换检查)
npm run build              # 全量构建 (5 包)
```

## 验证门禁（每次代码改动后必跑）

```bash
npm run typecheck && npm test && npm run build -w @zhijing/web
```

三项全绿方可提交。不得绕过门禁提交未验证代码。

## 架构分层约束

1. **core 为纯逻辑层**：禁止引入 Fastify/React 等框架依赖；业务逻辑下沉至此，api 保持薄路由。
2. **api 为薄路由层**：仅做 HTTP 适配、参数校验、调用 core，不承载业务规则。
3. **web 单文件现状**：`main.jsx` 暂为单文件，组件拆分延迟到 X-4 专项；此前阶段控制单次 diff 体量，做外科手术式修改。
4. **SQLite schema 变更**：一律走 `_migrate` 追加块，兼容新旧数据库；测试需覆盖全新库与迁移库两条路径。
5. **pi-runtime 校验**：每个结构化输出 schema 必须配 `validateStructuredOutput` + mock-runtime 测试。

## 提交规范

- 采用 **Conventional Commits（中文描述）**：`feat:` / `fix:` / `docs:` / `chore:` / `refactor:`
- 示例：`feat: 补齐知识地图原型`
- **每一小步迭代完成后及时提交**，避免大量改动堆积。
- 提交前确保验证门禁全绿。
- **禁止提交过程性产物**：`docs/`、`stitch_/`、`.skill-*/`、`.env*`、`*.sqlite*`、`dist/` 等已在 `.gitignore`。
- **禁止在提交信息中包含内部任务编号**：如 `D1-1`、`D5-3`、`P0-1`、`X-3` 等内部规划编号不得出现在 commit message 的标题或正文中。提交信息应只描述功能变更本身，内部编号仅用于 `docs/plan/` 下的进度文档。

## 设计系统

| Token | 值 | 用途 |
| --- | --- | --- |
| Scholar Blue | `#2C5F8D` | 主色（concept 卡片、主按钮、链接） |
| Sage Green | `#6B8E7F` | 辅色（method 卡片、成功状态、已溯源） |
| 字体 | Inter | 全站统一 |
| 栅格 | 8px grid | 间距与尺寸基准 |

知识卡片类型：`concept` / `method` / `fact`(`#8B6FB0`) / `question`(`#D4944A`) / `general`。

## 禁忌清单

- ❌ 禁止引入 pnpm / yarn（统一 npm workspaces）
- ❌ 禁止提交 `.env` / 密钥 / 凭证
- ❌ 禁止绕过验证门禁（typecheck + test + build）提交
- ❌ 禁止在 `main.jsx` 单文件阶段引入过大 diff（拆分前保持外科手术式修改）
- ❌ 禁止在 core 包引入框架依赖
- ❌ 禁止行尾注释（用户编码规范）
- ❌ 禁止使用魔法值（用户编码规范）
- ❌ 禁止未经允许编写单元测试用例（用户编码规范）
- ❌ 禁止在提交信息中包含内部任务编号（如 D1-1、P0-1、X-3 等）

## 进度与规划（本地，已 gitignore）

- **Resume anchor**：`docs/plan/progress-master.md` — 每次会话先读此文件定位当前阶段与下一步。
- **任务分解**：`docs/plan/task-breakdown.md`
- **工程约束**：`.skill-harness/engineering-constraints.md`

> 上述文件均为本地过程产物，不进入版本库；如需了解当前进度，请直接读取。
