# 知径

知径是一个个人知识库与知识转化工作台。当前仓库已经跑通本地单人版知识库闭环：前端原型、Fastify API、SQLite 事实源、DuckDB 分析层，以及 Phase 2 的 Pi runtime 适配入口。

## 当前结构

```text
.
├── apps/
│   ├── api/              # Fastify API，请求入口和任务状态查询
│   └── web/              # 前端原型
│       ├── index.html
│       └── src/
├── packages/
│   ├── core/             # 领域模型、SQLite 事实源和 DuckDB 分析查询
│   ├── pi-runtime/       # Pi 薄适配入口，支持 @earendil-works/pi-ai 与 mock fallback
│   └── shared/           # 前后端共享类型和输入分类
├── DESIGN.md            # 项目级设计标准，来自 Stitch 设计基准
├── package.json         # 根目录统一运行脚本
├── package-lock.json
├── tsconfig.base.json
└── .gitignore
```

## 运行

```bash
npm run dev:web
npm run dev:api
npm run build
npm run typecheck
npm run preview
```

## Pi 配置

Phase 2 已接入 `@earendil-works/pi-ai`。默认使用 `openai/gpt-4o-mini`，检测不到 provider API key 时自动回退到本地 mock，保证开发闭环不断。

```bash
export OPENAI_API_KEY=...
# 可选：
export ZHIJING_PI_PROVIDER=openai
export ZHIJING_PI_MODEL=gpt-4o-mini
export ZHIJING_PI_ENABLED=1
export ZHIJING_PI_FALLBACK=0  # 可选：关闭 mock fallback，用于验证真实 Pi 调用失败路径
```

## 目录边界

- `apps/web`：用户可见界面，包含工作台、知识库详情、资料库、Kit 运行页和产物页。
- `apps/api`：请求入口，提供 health、dashboard、intake、知识库详情和任务查询。
- `packages/core`：业务事实源，使用 SQLite 保存 KnowledgeBase / Material / Card / Task / Artifact，并用 DuckDB 做本地分析视图。
- `packages/pi-runtime`：LLM / Pi 的隔离层，后端侧调用 `@earendil-works/pi-ai`，缺少配置时回退到 mock runtime。
- `packages/shared`：共享类型、输入分类、平台识别。
- `DESIGN.md`：项目级设计标准。
