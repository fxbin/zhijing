# syntax=docker/dockerfile:1.7
# 知径（Zhijing）生产部署 Dockerfile
# 多阶段构建：builder 构建前端+安装全量依赖，runner 运行 API+前端+Python Playwright
# author: fxbin

# ============ 阶段1：构建前端与依赖安装 ============
FROM node:22-bookworm-slim AS builder

ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

WORKDIR /app

# 先复制 package 文件，利用 Docker 层缓存
COPY package.json package-lock.json* ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY packages/core/package.json ./packages/core/
COPY packages/shared/package.json ./packages/shared/
COPY packages/pi-runtime/package.json ./packages/pi-runtime/
COPY packages/agent/package.json ./packages/agent/

# 安装全量依赖（含 devDependencies，构建需要）
# 显式安装 rolldown linux native binding，规避 npm optional dependencies bug（npm/cli#4828）
# 该 bug 在跨平台 lock 文件场景下会漏装目标平台的 native binding，导致 vite build 报 Cannot find native binding
RUN npm install --no-audit --no-fund --include=optional && \
    npm install --no-audit --no-fund --no-save @rolldown/binding-linux-x64-gnu@1.0.3

# 复制源码
COPY . .

# 构建前端与所有包
RUN npm run build

# 剪掉 devDependencies，仅保留生产依赖
RUN npm prune --omit=dev

# ============ 阶段2：运行时镜像 ============
FROM node:22-bookworm-slim AS runner

ENV NODE_ENV=production
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
ENV PLAYWRIGHT_SKIP_BROWSER_GC=1
# 容器内默认监听 0.0.0.0
ENV HOST=0.0.0.0
ENV PORT=8787

# 安装 Python3 + Playwright Chromium 系统依赖
# Playwright Chromium 需要大量系统库，使用官方安装脚本
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    python3-venv \
    curl \
    ca-certificates \
    # Playwright Chromium 运行时依赖
    libnss3 \
    libnspr4 \
    libdbus-1-3 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libxss1 \
    libasound2 \
    libatspi2.0-0 \
    libxshmfence1 \
    fonts-liberation \
    fonts-noto-cjk \
    && rm -rf /var/lib/apt/lists/*

# 安装 Python Playwright + Chromium 浏览器
RUN python3 -m pip install --no-cache-dir --break-system-packages playwright==1.49.1 \
    && python3 -m playwright install chromium \
    && python3 -m playwright install-deps chromium

WORKDIR /app

# 从 builder 复制 node_modules、构建产物、源码（tsx 运行需要 .ts 源文件）
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/apps ./apps
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/scripts ./scripts

# 数据目录（SQLite 文件，Zeabur 持久卷挂载点）
RUN mkdir -p /app/.data
VOLUME ["/app/.data"]

EXPOSE 8787

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:8787/health || exit 1

# 用 tsx 直接运行 TypeScript（tsx 已在 @zhijing/api 的 dependencies 中）
CMD ["npx", "tsx", "apps/api/src/server.ts"]
