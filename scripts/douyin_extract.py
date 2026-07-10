#!/usr/bin/env python3
"""
抖音视频提取脚本（f2 + Playwright 混合方案）

接收抖音短链/长链 URL，通过 f2 库调用抖音 web API 提取视频元数据。
f2 内置 msToken / a_bogus 签名算法，无需浏览器即可发起请求；
但仍需访客 cookie（60+ 键），由 Playwright 定期获取并缓存。

架构：
  1. Cookie 缓存：Playwright 打开抖音首页获取访客 cookie，缓存到本地文件，
     有效期内复用，避免每次请求都启动浏览器。
  2. f2 提取：用缓存的 cookie + f2 签名算法调用 aweme/detail API，轻量高效。

用法：python3 scripts/douyin_extract.py <url>

环境变量：
  DOUYIN_PROXY — 代理地址（如 http://127.0.0.1:7890），可选
  HTTP_PROXY / HTTPS_PROXY — 标准代理环境变量，可选
  DOUYIN_COOKIE_TTL — cookie 缓存有效期（秒），默认 21600（6 小时）

输出：JSON 格式，包含以下字段：
  - play_addr: 视频地址（含音频流）
  - cover: 封面图地址
  - dynamic_cover: 动态封面地址
  - origin_cover: 原始封面地址
  - desc: 视频描述
  - aweme_id: 视频 ID
  - nickname: 作者昵称
  - author_id: 作者 ID
  - digg_count: 点赞数
  - comment_count: 评论数
  - share_count: 分享数
  - duration: 视频时长（毫秒）
  - page_url: 解析后的视频页 URL

author: fxbin
"""
import asyncio
import contextlib
import json
import os
import sys
import tempfile
import time

from playwright.async_api import async_playwright


PAGE_TIMEOUT_MS = 60000
WAIT_AFTER_LOAD_MS = 5000
USER_AGENT = (
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) '
    'AppleWebKit/537.36 (KHTML, like Gecko) '
    'Chrome/130.0.0.0 Safari/537.36 Edg/130.0.0.0'
)
DOUYIN_HOME_URL = 'https://www.douyin.com/'
COOKIE_TTL_DEFAULT_SEC = 21600
COOKIE_CACHE_FILE = os.path.join(
    tempfile.gettempdir(), 'zhijing_douyin_cookie.json'
)


def get_proxy():
    """从环境变量获取代理地址，返回代理 URL 字符串或 None"""
    return (
        os.environ.get('DOUYIN_PROXY')
        or os.environ.get('HTTPS_PROXY')
        or os.environ.get('HTTP_PROXY')
        or None
    )


def get_cookie_ttl():
    """从环境变量获取 cookie 缓存有效期（秒），默认 6 小时"""
    raw = os.environ.get('DOUYIN_COOKIE_TTL')
    if not raw:
        return COOKIE_TTL_DEFAULT_SEC
    try:
        value = int(raw)
        return value if value > 0 else COOKIE_TTL_DEFAULT_SEC
    except ValueError:
        return COOKIE_TTL_DEFAULT_SEC


def load_cached_cookie():
    """读取缓存 cookie，若存在且未过期则返回 cookie 字符串，否则返回 None"""
    if not os.path.exists(COOKIE_CACHE_FILE):
        return None
    try:
        with open(COOKIE_CACHE_FILE, 'r', encoding='utf-8') as f:
            data = json.load(f)
        ttl = get_cookie_ttl()
        if time.time() - data.get('ts', 0) < ttl and data.get('cookie'):
            return data['cookie']
    except (json.JSONDecodeError, OSError):
        pass
    return None


def save_cached_cookie(cookie_str):
    """将 cookie 字符串及当前时间戳写入缓存文件"""
    try:
        with open(COOKIE_CACHE_FILE, 'w', encoding='utf-8') as f:
            json.dump({'cookie': cookie_str, 'ts': time.time()}, f)
    except OSError:
        pass


async def fetch_visitor_cookie():
    """用 Playwright 打开抖音首页，获取访客 cookie 并返回 cookie 字符串"""
    async with async_playwright() as p:
        launch_options = {'headless': True}
        proxy = get_proxy()
        if proxy:
            launch_options['proxy'] = {'server': proxy}

        browser = await p.chromium.launch(**launch_options)
        context = await browser.new_context(user_agent=USER_AGENT)
        page = await context.new_page()

        await page.goto(
            DOUYIN_HOME_URL,
            wait_until='domcontentloaded',
            timeout=PAGE_TIMEOUT_MS,
        )
        await page.wait_for_timeout(WAIT_AFTER_LOAD_MS)

        cookies = await context.cookies()
        await browser.close()

    cookie_str = '; '.join(f"{c['name']}={c['value']}" for c in cookies)
    return cookie_str


async def get_cookie():
    """获取访客 cookie：优先读缓存，缓存失效时用 Playwright 重新获取"""
    cached = load_cached_cookie()
    if cached:
        return cached, True
    cookie_str = await fetch_visitor_cookie()
    save_cached_cookie(cookie_str)
    return cookie_str, False


def disable_bark_notification():
    """关闭 f2 默认开启的 Bark 通知，避免无意义的 405 错误日志"""
    try:
        from f2.apps.bark.utils import ClientConfManager as BarkClientConfManager
        BarkClientConfManager.enable_bark = classmethod(lambda cls: False)
    except ImportError:
        pass


async def resolve_aweme_id(input_url):
    """从抖音短链/长链中提取 aweme_id（视频 ID）"""
    from f2.apps.douyin.utils import AwemeIdFetcher
    return await AwemeIdFetcher.get_aweme_id(input_url)


async def fetch_video_detail(aweme_id, cookie_str):
    """用 f2 调用抖音 aweme/detail API，返回原始响应字典"""
    from f2.apps.douyin.handler import DouyinHandler

    proxy = get_proxy()
    proxies = {'http://': None, 'https://': None}
    if proxy:
        proxies = {'http://': proxy, 'https://': proxy}

    kwargs = {
        'headers': {
            'User-Agent': USER_AGENT,
            'Referer': 'https://www.douyin.com/',
        },
        'cookie': cookie_str,
        'proxies': proxies,
    }

    handler = DouyinHandler(kwargs)
    video = await handler.fetch_one_video(aweme_id=aweme_id)
    return video._to_raw()


def extract_media_info(raw, aweme_id, input_url):
    """从 f2 原始响应中提取标准化的视频元数据字段"""
    detail = raw.get('aweme_detail') or raw
    if not isinstance(detail, dict):
        return None

    video = detail.get('video', {}) or {}
    result = {}

    for field_name, addr_key in [
        ('play_addr', 'play_addr'),
        ('cover', 'cover'),
        ('dynamic_cover', 'dynamic_cover'),
        ('origin_cover', 'origin_cover'),
    ]:
        addr = video.get(addr_key, {}) or {}
        url_list = addr.get('url_list', []) or []
        if url_list:
            result[field_name] = url_list[0]

    result['desc'] = detail.get('desc', '')
    result['aweme_id'] = detail.get('aweme_id', aweme_id)

    author = detail.get('author', {}) or {}
    result['nickname'] = author.get('nickname', '')
    result['author_id'] = author.get('uid', '')

    stats = detail.get('statistics', {}) or {}
    result['digg_count'] = stats.get('digg_count', 0)
    result['comment_count'] = stats.get('comment_count', 0)
    result['share_count'] = stats.get('share_count', 0)

    result['duration'] = video.get('duration', 0)

    result['page_url'] = f'https://www.douyin.com/video/{result["aweme_id"]}'

    return result


async def prewarm():
    """预热模式：仅获取并缓存访客 cookie，不提取视频数据。

    用于服务启动时提前准备好 cookie，使后续视频提取请求直接命中缓存。
    """
    disable_bark_notification()
    cookie_str, from_cache = await get_cookie()
    print(
        f'[prewarm] cookie 来源: {"缓存" if from_cache else "Playwright 新获取"}, '
        f'长度: {len(cookie_str)} 字符',
        file=sys.stderr,
    )


@contextlib.contextmanager
def suppress_stdout():
    """将 stdout 临时重定向到 stderr，防止第三方库的输出污染 JSON 结果。

    f2 库内部可能往 stdout 打印日志，导致 Node.js 端 JSON.parse 失败。
    使用此上下文管理器包裹 f2 调用，确保只有最终的 JSON 输出到 stdout。
    """
    old_stdout = sys.stdout
    sys.stdout = sys.stderr
    try:
        yield
    finally:
        sys.stdout = old_stdout


async def main():
    if len(sys.argv) < 2:
        print(json.dumps({'error': '缺少 URL 参数'}), file=sys.stderr)
        sys.exit(1)

    if sys.argv[1] == '--prewarm':
        await prewarm()
        return

    input_url = sys.argv[1]
    media_info = None

    try:
        disable_bark_notification()

        with suppress_stdout():
            cookie_str, from_cache = await get_cookie()
            print(
                f'[cookie] 来源: {"缓存" if from_cache else "Playwright 新获取"}, '
                f'长度: {len(cookie_str)} 字符'
            )

            aweme_id = await resolve_aweme_id(input_url)
            print(f'[aweme_id] {aweme_id}')

            raw = await fetch_video_detail(aweme_id, cookie_str)

            media_info = extract_media_info(raw, aweme_id, input_url)
            if not media_info or not media_info.get('play_addr'):
                save_cached_cookie('')
                media_info = None

        if media_info:
            print(json.dumps(media_info, ensure_ascii=False))
        else:
            print(json.dumps({'error': 'API 响应中未找到视频地址，cookie 可能已失效'}))
            sys.exit(1)

    except Exception as e:
        print(json.dumps({'error': str(e)}))
        sys.exit(1)


if __name__ == '__main__':
    asyncio.run(main())
