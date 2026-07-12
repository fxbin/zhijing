import type { FastifyInstance } from 'fastify';
import { Readable } from 'node:stream';
import {
  getCurrentProxy,
  detectSystemProxy,
  setManualProxy,
  initProxyDispatcher,
  checkUrlForSsrf,
} from '@zhijing/core';
import {
  PROXY_MAX_BYTES,
  PROXY_VIDEO_MAX_BYTES,
  PROXY_VIDEO_MAX_RANGE_BYTES,
  PROXY_VIDEO_FETCH_TIMEOUT_MS,
  ssrfSafeFetch,
  parsePositiveIntegerHeader,
  buildSafeVideoRangeHeader,
  createByteLimitStream,
  isAbortError,
} from '../common/proxy-stream.js';

/**
 * 注册代理路由（系统代理查询/设置、图片代理、视频代理）。
 * @param app - Fastify 实例
 * @author fxbin
 */
export function registerProxyRoutes(app: FastifyInstance): void {
  app.get('/api/proxy', async () => {
    const proxyUrl = getCurrentProxy();
    const detected = detectSystemProxy();
    return {
      active: Boolean(proxyUrl),
      proxyUrl,
      detected,
      mode: proxyUrl ? 'auto' : 'none',
    };
  });

  app.post<{ Body: { proxyUrl?: string } }>('/api/proxy', async (request, reply) => {
    const raw = typeof request.body?.proxyUrl === 'string' ? request.body.proxyUrl.trim() : '';
    if (!raw) {
      setManualProxy(undefined);
      initProxyDispatcher();
      return { ok: true, active: false, proxyUrl: undefined };
    }
    try {
      const url = new URL(raw);
      if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        return reply.code(400).send({ error: 'proxyUrl must be http or https.' });
      }
      setManualProxy(raw);
      initProxyDispatcher();
      return { ok: true, active: true, proxyUrl: raw };
    } catch {
      return reply.code(400).send({ error: 'Invalid proxyUrl.' });
    }
  });

  app.get<{ Querystring: { url?: string } }>('/api/proxy-image', async (request, reply) => {
    const imageUrl = request.query.url;
    if (!imageUrl || !/^https?:\/\//i.test(imageUrl)) {
      return reply.code(400).send({ error: 'Invalid image URL.' });
    }
    const ssrfCheck = checkUrlForSsrf(imageUrl);
    if (!ssrfCheck.ok) {
      return reply.code(400).send({ error: 'Blocked image URL.' });
    }
    try {
      const isDouyinImage = imageUrl.includes('douyinpic.com') || imageUrl.includes('byteimg.com');
      const response = await ssrfSafeFetch(imageUrl, {
        headers: {
          Referer: isDouyinImage ? 'https://www.douyin.com/' : '',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
      });
      if (!response.ok) {
        return reply.code(response.status).send({ error: 'Image fetch failed.' });
      }
      const contentType = response.headers.get('content-type') ?? 'application/octet-stream';
      if (!contentType.startsWith('image/')) {
        return reply.code(400).send({ error: 'URL did not return an image.' });
      }
      const arrayBuffer = await response.arrayBuffer();
      if (arrayBuffer.byteLength > PROXY_MAX_BYTES) {
        return reply.code(413).send({ error: 'Image too large to proxy.' });
      }
      return reply
        .header('Content-Type', contentType)
        .header('Cache-Control', 'public, max-age=3600')
        .send(Buffer.from(arrayBuffer));
    } catch (error) {
      request.log.error({ error }, 'proxy image failed');
      return reply.code(502).send({ error: 'Image proxy failed.' });
    }
  });

  app.get<{ Querystring: { url?: string } }>('/api/proxy-video', async (request, reply) => {
    const videoUrl = request.query.url;
    if (!videoUrl || !/^https?:\/\//i.test(videoUrl)) {
      return reply.code(400).send({ error: 'Invalid video URL.' });
    }
    const ssrfCheck = checkUrlForSsrf(videoUrl);
    if (!ssrfCheck.ok) {
      return reply.code(400).send({ error: 'Blocked video URL.' });
    }
    try {
      const isDouyinVideo = videoUrl.includes('douyinvod') || videoUrl.includes('bytecdn');
      const headers: Record<string, string> = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      };
      if (isDouyinVideo) {
        headers['Referer'] = 'https://www.douyin.com/';
      }
      const range = request.headers.range;
      const safeRange = buildSafeVideoRangeHeader(range);
      if (range && !safeRange) {
        return reply.code(416).send({ error: 'Video range is too large or invalid.' });
      }
      if (safeRange) {
        headers['Range'] = safeRange;
      }
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), PROXY_VIDEO_FETCH_TIMEOUT_MS);
      reply.raw.on('close', () => {
        if (!reply.raw.writableEnded) {
          controller.abort();
        }
      });
      let response: Awaited<ReturnType<typeof ssrfSafeFetch>>;
      try {
        response = await ssrfSafeFetch(videoUrl, { headers, signal: controller.signal });
      } finally {
        clearTimeout(timeout);
      }
      if (!response.ok && response.status !== 206) {
        return reply.code(response.status).send({ error: 'Video fetch failed.' });
      }
      const contentType = response.headers.get('content-type') ?? 'video/mp4';
      if (!contentType.startsWith('video/') && !contentType.startsWith('application/')) {
        return reply.code(400).send({ error: 'URL did not return a video.' });
      }
      const maxBytes = response.status === 206 ? PROXY_VIDEO_MAX_RANGE_BYTES : PROXY_VIDEO_MAX_BYTES;
      const parsedContentLength = parsePositiveIntegerHeader(response.headers.get('content-length'));
      if (parsedContentLength !== null && parsedContentLength > maxBytes) {
        return reply.code(413).send({ error: 'Video too large to proxy.' });
      }
      const replyHeaders: Record<string, string> = {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600',
        'Accept-Ranges': 'bytes',
      };
      const contentRange = response.headers.get('content-range');
      if (contentRange) {
        replyHeaders['Content-Range'] = contentRange;
      }
      const contentLength = response.headers.get('content-length');
      if (contentLength) {
        replyHeaders['Content-Length'] = contentLength;
      }
      const upstreamBody = response.body;
      if (!upstreamBody) {
        return reply.code(502).send({ error: 'Video stream unavailable.' });
      }
      const sourceStream = Readable.fromWeb(
        upstreamBody as Parameters<typeof Readable.fromWeb>[0],
      );
      const limitStream = createByteLimitStream(maxBytes);
      let streamErrorHandled = false;
      const handleStreamError = (error: Error) => {
        if (streamErrorHandled) return;
        streamErrorHandled = true;
        if (isAbortError(error) || reply.raw.destroyed) {
          request.log.debug({ error }, 'proxy video stream closed');
        } else {
          request.log.error({ error }, 'proxy video stream failed');
        }
        if (!reply.raw.destroyed) {
          reply.raw.destroy(isAbortError(error) ? undefined : error);
        }
      };
      sourceStream.on('error', handleStreamError);
      limitStream.on('error', handleStreamError);
      const nodeStream = sourceStream.pipe(limitStream);
      return reply
        .code(response.status === 206 ? 206 : 200)
        .headers(replyHeaders)
        .send(nodeStream);
    } catch (error) {
      request.log.error({ error }, 'proxy video failed');
      return reply.code(502).send({ error: 'Video proxy failed.' });
    }
  });
}
