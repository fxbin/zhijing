# 知径 Zhijing

> 个人知识管理工具 · 从资料导入到知识地图到对话回忆的完整闭环

知径是一个面向个人学习者和知识工作者的本地优先知识管理工具。它不只是把资料存起来，而是帮你把碎片化的信息**结构化成知识卡片**，**可视化成知识地图**，并通过**对话回忆**巩固理解。

## 核心能力

| 能力 | 说明 |
|---|---|
| 📥 多源资料导入 | 微信读书、抖音、小红书、网页链接、纯文本、文件夹批量导入 |
| 🎴 结构化知识卡片 | AI 从资料中提取概念卡、方法卡、事实卡、问题卡，支持编辑与版本回溯 |
| 🗺️ 知识地图可视化 | 力导向图展示卡片关联，支持手动连边、布局调整、点击跳转 |
| 💬 对话回忆 | 基于知识库的智能问答，苏格拉底式追问引导深度思考 |
| 📤 产物导出 | 将知识库整理为可分享的结构化产物 |
| 🔍 全文检索 | 跨工作区、跨卡片的语义搜索 |

## 技术栈

| 层 | 技术 | 说明 |
|---|---|---|
| Monorepo | npm workspaces | 统一 npm，6 个包协同 |
| 前端 | React 19 + Vite | 原生 CSS 设计系统，CSS 变量驱动 |
| 后端 | Fastify 5 + better-sqlite3 | 薄路由层，业务逻辑下沉 core |
| 核心逻辑 | TypeScript strict | 纯逻辑层，无框架依赖 |
| LLM 适配 | pi-runtime | 多 Provider 支持，结构化输出校验 |
| 视频解析 | Playwright + Chromium | 抖音/小红书视频元数据提取 |

## 项目结构

```text
apps/
├── api/              后端服务 (Fastify + SQLite)
└── web/              前端应用 (React + Vite)
packages/
├── core/             纯业务逻辑层 (含单元测试)
├── pi-runtime/       结构化输出校验运行时
├── agent/            AI Agent 编排层
└── shared/           跨包共享类型定义
```

## 快速开始

### 环境要求

- Node.js 22+
- npm 10+（禁止 pnpm/yarn）
- Python 3.10+（抖音视频解析需要）
- Playwright Chromium（抖音视频解析需要）

### 安装与运行

```bash
# 安装依赖
npm install

# 安装 Playwright 浏览器（抖音解析需要）
npx playwright install chromium
# 或 Python 版
pip install playwright && playwright install chromium

# 启动前端开发服务器
npm run dev

# 启动后端开发服务器（另开终端）
npm run dev:api
```

前端运行在 `http://127.0.0.1:5173`，后端运行在 `http://127.0.0.1:8787`。

### LLM 配置

知径支持多 LLM Provider，通过环境变量配置：

```bash
export ZHIJING_PI_PROVIDER=openai          # 或 deepseek、qwen、doubao 等
export ZHIJING_PI_MODEL=gpt-4o-mini
export ZHIJING_PI_API_KEY=sk-your-key
export ZHIJING_PI_ENABLED=1
```

未配置 API Key 时自动回退到 mock 模式，保证开发闭环不断。

### 验证门禁

```bash
npm run typecheck && npm test && npm run build -w @zhijing/web
```

## 部署

知径支持 Docker 部署，适合公网体验版。

```bash
# 构建镜像
docker build -t zhijing .

# 运行（生产模式，API 同时 serve 前端）
docker run -p 8787:8787 \
  -e NODE_ENV=production \
  -e ZHIJING_ACCESS_PASSWORD=your-password \
  -e ZHIJING_PI_API_KEY=your-llm-key \
  -e ZHIJING_ALLOWED_ORIGINS=https://your-domain \
  -v zhijing-data:/app/.data \
  zhijing
```

完整环境变量参考见 [.env.example](./.env.example)。

## 设计系统

| Token | 值 | 用途 |
|---|---|---|
| Scholar Blue | `#2C5F8D` | 主色（概念卡、主按钮） |
| Sage Green | `#6B8E7F` | 辅色（方法卡、成功状态） |
| Amethyst | `#8B6FB0` | 事实卡 |
| Amber | `#D4944A` | 问题卡 |

知识卡片类型：`concept` / `method` / `fact` / `question` / `general`。

## 参赛信息

本项目参加 **TRAE AI 创造力大赛**，使用 TRAE IDE 完成全部开发。

- 体验链接：[部署后补充]
- 创作思路：见大赛作品帖
- 开发工具：TRAE IDE

## License

MIT
