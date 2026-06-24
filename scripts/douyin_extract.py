#!/usr/bin/env python3
"""
抖音视频提取脚本

接收抖音短链/长链 URL，通过 Playwright 拦截 aweme/detail API 响应，
提取视频地址、封面、作者、描述等元数据，输出 JSON。

用法：python3 scripts/douyin_extract.py <url>

环境变量：
  DOUYIN_PROXY — 代理地址（如 http://127.0.0.1:7890），可选
  HTTP_PROXY / HTTPS_PROXY — 标准代理环境变量，可选

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
import json
import os
import re
import subprocess
import sys
import urllib.parse

from playwright.async_api import async_playwright

PAGE_TIMEOUT_MS = 60000
WAIT_AFTER_LOAD_MS = 8000
USER_AGENT = (
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) '
    'AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'
)


def resolve_short_url(short_url):
    """解析短链，返回标准视频页 URL"""
    result = subprocess.run(
        ['curl', '-Ls', '-o', '/dev/null', '-w', '%{url_effective}', short_url],
        capture_output=True, text=True, timeout=30,
    )
    effective_url = result.stdout.strip()
    match = re.search(r'/video/(\d+)', effective_url)
    if match:
        return f'https://www.douyin.com/video/{match.group(1)}'
    return effective_url


def get_proxy():
    """从环境变量获取代理地址"""
    return (
        os.environ.get('DOUYIN_PROXY')
        or os.environ.get('HTTPS_PROXY')
        or os.environ.get('HTTP_PROXY')
        or None
    )


async def fetch_douyin_detail(page_url):
    """用 Playwright 拦截 aweme/detail API 响应，提取视频元数据"""
    detail_json = None

    async with async_playwright() as p:
        launch_options = {'headless': True}
        proxy = get_proxy()
        if proxy:
            launch_options['proxy'] = {'server': proxy}

        browser = await p.chromium.launch(**launch_options)
        context = await browser.new_context(
            user_agent=USER_AGENT,
            viewport={'width': 1280, 'height': 720},
        )
        page = await context.new_page()

        async def on_response(response):
            nonlocal detail_json
            u = response.url
            if 'aweme/v1/web/aweme/detail' in u:
                try:
                    text = await response.text()
                    if text and text.strip():
                        parsed = json.loads(text)
                        if parsed.get('aweme_detail'):
                            detail_json = parsed
                except Exception:
                    pass

        page.on('response', on_response)

        await page.goto(page_url, wait_until='domcontentloaded', timeout=PAGE_TIMEOUT_MS)
        await page.wait_for_timeout(WAIT_AFTER_LOAD_MS)

        await browser.close()

    return detail_json


def extract_media_from_detail(detail_json):
    """从 aweme/detail API 响应中提取视频地址、封面、作者、描述"""
    detail = detail_json.get('aweme_detail') or detail_json.get('aweme', {})
    if not detail:
        return None

    video = detail.get('video', {})
    result = {}

    play_addr = video.get('play_addr', {})
    if play_addr:
        url_list = play_addr.get('url_list', [])
        if url_list:
            result['play_addr'] = url_list[0]

    cover = video.get('cover', {})
    if cover:
        url_list = cover.get('url_list', [])
        if url_list:
            result['cover'] = url_list[0]

    dynamic_cover = video.get('dynamic_cover', {})
    if dynamic_cover:
        url_list = dynamic_cover.get('url_list', [])
        if url_list:
            result['dynamic_cover'] = url_list[0]

    origin_cover = video.get('origin_cover', {})
    if origin_cover:
        url_list = origin_cover.get('url_list', [])
        if url_list:
            result['origin_cover'] = url_list[0]

    result['desc'] = detail.get('desc', '')
    result['aweme_id'] = detail.get('aweme_id', '')

    author = detail.get('author', {})
    result['nickname'] = author.get('nickname', '')
    result['author_id'] = author.get('uid', '')

    stats = detail.get('statistics', {})
    result['digg_count'] = stats.get('digg_count', 0)
    result['comment_count'] = stats.get('comment_count', 0)
    result['share_count'] = stats.get('share_count', 0)

    result['duration'] = video.get('duration', 0)

    return result


async def main():
    if len(sys.argv) < 2:
        print(json.dumps({'error': '缺少 URL 参数'}), file=sys.stderr)
        sys.exit(1)

    input_url = sys.argv[1]

    try:
        page_url = resolve_short_url(input_url)
        detail_json = await fetch_douyin_detail(page_url)

        if not detail_json:
            print(json.dumps({'error': '未能拦截到抖音 API 响应，可能需要配置代理或稍后重试'}))
            sys.exit(1)

        media_info = extract_media_from_detail(detail_json)
        if not media_info or not media_info.get('play_addr'):
            print(json.dumps({'error': 'API 响应中未找到视频地址'}))
            sys.exit(1)

        media_info['page_url'] = page_url
        print(json.dumps(media_info, ensure_ascii=False))

    except Exception as e:
        print(json.dumps({'error': str(e)}))
        sys.exit(1)


if __name__ == '__main__':
    asyncio.run(main())
