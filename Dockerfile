# syntax=docker/dockerfile:1.7
# 知径（Zhijing）生产部署 Dockerfile
# 多阶段构建：builder 构建前端+安装全量依赖，runner 运行 API+前端+Python Playwright
# author: fxbin

# ============ 阶段1：构建前端与依赖安装 ============
FROM node:22-bookworm-slim AS builder

ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

WORKDIR /app

# 先复制 package 文件，利用 Docker 层缓存
COPY package.json ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY packages/core/package.json ./packages/core/
COPY packages/shared/package.json ./packages/shared/
COPY packages/pi-runtime/package.json ./packages/pi-runtime/
COPY packages/agent/package.json ./packages/agent/

# 安装全量依赖（含 devDependencies，构建需要）
# 不复制 lock 文件并在容器内重新生成：规避 npm optional dependencies bug（npm/cli#4828）
# 该 bug 在跨平台 lock 文件场景下会漏装目标平台的 native binding（rolldown / lightningcss / esbuild 等），
# 导致容器内 vite build 报 Cannot find native binding
# 使用 npmmirror 国内镜像源加速依赖下载
RUN npm install --no-audit --no-fund --include=optional \
        --registry=https://registry.npmmirror.com

# 复制源码
COPY . .

# 构建前端与所有包
RUN npm run build

# 剪掉 devDependencies，仅保留生产依赖
# 保持与 install 相同的镜像源，避免 prune 时回退到官方源
RUN npm prune --omit=dev --registry=https://registry.npmmirror.com

# ============ 阶段2：运行时镜像 ============
FROM node:22-bookworm-slim AS runner

# 替换为阿里云镜像源，加速 apt-get 下载
RUN sed -i 's|deb.debian.org|mirrors.aliyun.com|g' /etc/apt/sources.list.d/debian.sources

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

# 安装 Python Playwright + f2 + Chromium 浏览器
# f2 提供抖音 msToken/a_bogus 签名算法，使数据请求无需常驻浏览器
# Playwright 仅用于定期获取访客 cookie，仍需 Chromium
# 使用国内镜像加速：pip 走腾讯云，Chromium 二进制走 npmmirror
RUN python3 -m pip install --no-cache-dir --break-system-packages --timeout 600 \
        -i https://mirrors.cloud.tencent.com/pypi/simple \
        playwright==1.49.1 \
        f2 \
    && PLAYWRIGHT_DOWNLOAD_HOST=https://cdn.npmmirror.com/binaries/playwright \
       python3 -m playwright install chromium \
    && python3 -m playwright install-deps chromium

WORKDIR /app

# 从 builder 复制 node_modules、构建产物、源码（tsx 运行需要 .ts 源文件）
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/apps ./apps
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/scripts ./scripts

# 数据目录（SQLite 文件，持久卷挂载点）
RUN mkdir -p /app/.data
VOLUME ["/app/.data"]

EXPOSE 8787

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:8787/health || exit 1

# 用 tsx 直接运行 TypeScript（tsx 已在 @zhijing/api 的 dependencies 中）
CMD ["npx", "tsx", "apps/api/src/server.ts"]
