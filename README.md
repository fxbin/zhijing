# 知径

知径是一个个人知识库与知识转化工作台。当前仓库先保留可运行的前端原型，并为后续导入解析、知识库生成、Workflow Kit 编排和产物生成预留工程边界。

## 当前结构

```text
.
├── apps/
│   ├── api/              # Fastify API，当前使用内存数据
│   └── web/              # 前端原型，遵循 Stitch 设计
│       ├── index.html
│       └── src/
├── packages/
│   ├── core/             # 领域模型与内存业务闭环
│   ├── pi-runtime/       # Pi 薄适配入口，Phase 2 接 @earendil-works/pi-ai
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

## 目录边界

- `apps/web`：用户可见界面，包含工作台、知识库详情、资料库、Kit 运行页和产物页。
- `apps/api`：请求入口，提供 health、dashboard、intake、知识库详情和任务查询。
- `packages/core`：业务事实源，目前是内存版 KnowledgeBase / Material / Card / Task / Artifact 闭环。
- `packages/pi-runtime`：LLM / Pi 的隔离层，当前是 mock runtime，下一阶段接 `@earendil-works/pi-ai`。
- `packages/shared`：共享类型、输入分类、平台识别。
- `DESIGN.md`：设计系统真源，后续改 UI 先读这个文件。
- `docs/`：产品规划、PRD、路线图等过程文档，本地保留但不提交。
- `stitch_/`：Sketch/Stitch 参考原型，本地保留但不作为运行时依赖。
- `.lazyweb/`、`.skill-*`：设计研究和智能团队过程资产，本地保留但不提交。

## 初期数据策略

初期数据库采用 `SQLite + DuckDB` 组合，先满足本地优先和可验证闭环，不急着引入重型服务。

- `SQLite`：作为产品事实源，保存知识库、资料、知识卡、任务、产物、引用关系和后续用户本地配置。
- `DuckDB`：作为本地分析与整理工作台，处理批量导入、资料清洗、统计视图、导出分析和后续知识图谱/报表类产物。
- `packages/core`：先保留领域接口，下一阶段从内存仓储替换为 SQLite adapter；DuckDB 在资料导入和产物分析进入真实场景后接入。
- 生产化之前暂不引入 PostgreSQL / pgvector，避免过早增加部署和运维复杂度。

## 原型设计硬约束

前端原型必须遵循 `stitch_/` 中的 Stitch 设计。

- 开发任何页面前，先看对应的 Stitch 截图和 `code.html`。
- 如果 Stitch 里的 HTML / 样式结构可以直接使用，优先迁移到 `apps/web`，再改造成我们的 React 组件。
- 如果不能直接复用，也必须保持 Stitch 的信息架构、视觉密度、布局节奏和交互状态。
- 不允许另起一套与 Stitch 冲突的视觉语言。
- `stitch_/` 仍然只是参考资产；运行时不直接引用它，复用内容必须进入 `apps/web`。

## 后续工程结构

后端不急着一次性铺开。等开始接真实数据和 AI 编排时，按这个方向拆：

```text
apps/
├── web/                 # 前端应用
├── api/                 # 请求服务：用户、知识库、材料、任务入口
└── worker/              # 后台任务：链接解析、转写、向量化、Kit 编排

packages/
├── core/                # 领域模型：Material、KnowledgeBase、Card、Artifact
├── connectors/          # 小红书、抖音、OpenSquilla、Pi 等外部集成
├── kit-runtime/         # Skill / Kit 编排运行层
└── shared/              # 前后端共享类型与工具
```

现阶段只创建真实需要的目录；未来模块落地时再新增对应目录和测试。

## 后续开发任务

1. `Phase 1C`：完善本地知识库闭环
   - 增加 SQLite 仓储适配器，替换当前内存数据源。
   - 知识库详情页继续细化真实 materials / cards / artifacts 展示。
   - 任务状态从单条展示升级为任务列表和失败态提示。
   - 增加基础空状态和 API 未启动提示。

2. `Phase 1D`：接入 DuckDB 本地分析层
   - 为资料导入和知识库概览建立分析视图。
   - 支持批量材料统计、来源分布和产物导出所需的轻量查询。

3. `Phase 2`：接入 Pi 结构化生成
   - 安装并固定 `@earendil-works/pi-ai`。
   - 用 `packages/pi-runtime` 封装 `completeStructured`。
   - 替换当前 mock generation。
   - 输出 schema 覆盖主题骨架、资料摘要、知识卡片和引用范围。

4. `Phase 3`：资料导入与降级策略
   - 任意链接先保存。
   - 识别小红书、抖音、普通网页。
   - 解析失败时保留原链接并提示用户补正文。

5. `Phase 4`：知识库问答与引用
   - 当前知识库范围内检索材料和卡片。
   - 通过 Pi 生成回答。
   - 回答必须展示引用范围；无来源时标记为 AI 推断。

6. `Phase 5`：轻量 Kit 与 Artifact
   - 先实现学习研究 Kit。
   - 运行 Workflow Run。
   - 生成 Artifact 并回流到知识库。
