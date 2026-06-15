# 知径

知径是一个个人知识库与知识转化工作台。当前仓库先保留可运行的前端原型，并为后续导入解析、知识库生成、Workflow Kit 编排和产物生成预留工程边界。

## 当前结构

```text
.
├── apps/
│   ├── api/              # Fastify API，当前使用内存数据
│   └── web/              # 前端原型
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
- `DESIGN.md`：项目级设计标准。
