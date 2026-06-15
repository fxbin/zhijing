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
- `packages/shared`：共享类型、输入分类、平台识别。
- `DESIGN.md`：设计系统真源，后续改 UI 先读这个文件。
- `docs/`：产品规划、PRD、路线图等过程文档，本地保留但不提交。
- `stitch_/`：Sketch/Stitch 参考原型，本地保留但不作为运行时依赖。
- `.lazyweb/`、`.skill-*`：设计研究和智能团队过程资产，本地保留但不提交。

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
