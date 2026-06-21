/**
 * 微信读书 Agent Skill 封装。
 *
 * 通过腾讯官方 WeRead Agent Gateway 调用用户书架、笔记、划线等能力，
 * 并把单本书的笔记组装为 markdown，供知径 material 导入。
 *
 * @author fxbin
 */

const WEREAD_GATEWAY_URL = 'https://i.weread.qq.com/api/agent/gateway';
const WEREAD_SKILL_VERSION = '1.0.3';
const WEREAD_AUTHORIZATION_PREFIX = 'Bearer ';
const DEFAULT_REQUEST_TIMEOUT_MS = 30_000;

export type WeReadShelfBook = {
  bookId: string;
  title: string;
  author: string;
  cover?: string;
  category?: string;
  readUpdateTime?: number;
  finishReading?: number;
  isTop?: number;
  secret?: number;
};

export type WeReadShelfAlbum = {
  albumInfo: {
    albumId: string;
    name: string;
    authorName: string;
    cover?: string;
    trackCount?: number;
    intro?: string;
  };
};

export type WeReadShelf = {
  books: WeReadShelfBook[];
  albums: WeReadShelfAlbum[];
  mp?: unknown;
  bookCount: number;
};

export type WeReadBookInfo = {
  bookId: string;
  title: string;
  author: string;
  cover?: string;
  intro?: string;
  category?: string;
  publisher?: string;
  publishTime?: string;
  isbn?: string;
  wordCount?: number;
  newRating?: number;
  newRatingCount?: number;
};

export type WeReadBookmark = {
  bookmarkId: string;
  bookId: string;
  chapterUid: number;
  markText: string;
  createTime: number;
  range?: string;
};

export type WeReadChapter = {
  chapterUid: number;
  chapterIdx: number;
  title: string;
};

export type WeReadBookmarkList = {
  updated: WeReadBookmark[];
  chapters: WeReadChapter[];
  book: WeReadBookInfo;
};

export type WeReadReview = {
  review: {
    reviewId: string;
    content: string;
    createTime: number;
    chapterName?: string;
  };
};

export type WeReadReviewList = {
  reviews: WeReadReview[];
  totalCount: number;
  hasMore: number;
  synckey: number;
};

export type WeReadImportResult = {
  materialId: string;
  title: string;
  contentText: string;
  bookmarkCount: number;
  reviewCount: number;
};

/**
 * 微信读书 API 调用异常。
 */
export class WeReadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WeReadError';
  }
}

/**
 * 微信读书 Agent Gateway 客户端。
 */
export class WeReadClient {
  constructor(private readonly apiKey: string) {}

  /**
   * 向微信读书 Agent Gateway 发起通用调用。
   *
   * @param apiName - 接口名，如 `/shelf/sync`
   * @param payload - 业务参数，会与 `api_name` 和 `skill_version` 平铺发送
   * @returns 接口返回的 JSON 数据
   * @throws {WeReadError} 网络或接口返回错误时抛出
   */
  async request<T>(apiName: string, payload: Record<string, unknown> = {}): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), DEFAULT_REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(WEREAD_GATEWAY_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `${WEREAD_AUTHORIZATION_PREFIX}${this.apiKey}`,
        },
        body: JSON.stringify({
          api_name: apiName,
          skill_version: WEREAD_SKILL_VERSION,
          ...payload,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new WeReadError(`微信读书接口返回 HTTP ${response.status}`);
      }

      const data = (await response.json()) as { errcode?: number; errmsg?: string; upgrade_info?: unknown } & T;

      if (data.upgrade_info) {
        throw new WeReadError('微信读书 Skill 需要升级，请按官方指引更新后重试');
      }

      if (data.errcode !== undefined && data.errcode !== 0) {
        throw new WeReadError(data.errmsg || `微信读书接口错误，errcode=${data.errcode}`);
      }

      return data;
    } catch (error) {
      if (error instanceof WeReadError) {
        throw error;
      }
      if (error instanceof Error && error.name === 'AbortError') {
        throw new WeReadError('微信读书接口请求超时');
      }
      throw new WeReadError(error instanceof Error ? error.message : String(error));
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * 获取当前用户书架。
   */
  async getShelf(): Promise<WeReadShelf> {
    return this.request<WeReadShelf>('/shelf/sync');
  }

  /**
   * 获取单本书籍基本信息。
   *
   * @param bookId - 微信读书书籍 ID
   */
  async getBookInfo(bookId: string): Promise<WeReadBookInfo> {
    return this.request<WeReadBookInfo>('/book/info', { bookId });
  }

  /**
   * 获取单本书籍的划线内容列表。
   *
   * @param bookId - 微信读书书籍 ID
   */
  async getBookmarkList(bookId: string): Promise<WeReadBookmarkList> {
    return this.request<WeReadBookmarkList>('/book/bookmarklist', { bookId });
  }

  /**
   * 获取单本书籍的个人想法与点评。
   *
   * @param bookId - 微信读书书籍 ID
   */
  async getReviewList(bookId: string): Promise<WeReadReviewList> {
    return this.request<WeReadReviewList>('/review/list/mine', { bookid: bookId });
  }
}

/**
 * 根据时间戳生成可读日期字符串。
 *
 * @param timestamp - 秒级 Unix 时间戳
 */
function formatWeReadDate(timestamp: number | undefined): string {
  if (!timestamp) {
    return '';
  }
  const date = new Date(timestamp * 1000);
  return date.toISOString().slice(0, 10);
}

/**
 * 将微信读书单本书的划线与个人想法组装为 markdown 文本。
 *
 * @param book - 书籍信息
 * @param bookmarks - 划线列表
 * @param reviews - 个人想法列表
 * @returns 供 material 保存的 markdown 文本
 */
export function buildWeReadMaterialMarkdown(
  book: WeReadBookInfo,
  bookmarks: WeReadBookmarkList,
  reviews: WeReadReviewList,
): string {
  const chapterMap = new Map<number, WeReadChapter>();
  for (const chapter of bookmarks.chapters ?? []) {
    chapterMap.set(chapter.chapterUid, chapter);
  }

  const lines: string[] = [];
  lines.push(`# 《${book.title}》阅读笔记`);
  if (book.author) {
    lines.push(`- 作者：${book.author}`);
  }
  if (book.category) {
    lines.push(`- 分类：${book.category}`);
  }
  lines.push('');

  if (bookmarks.updated?.length === 0 && reviews.reviews?.length === 0) {
    lines.push('该书暂无划线或想法。');
    return lines.join('\n');
  }

  const chapterGroups = new Map<number, WeReadBookmark[]>();
  for (const bookmark of bookmarks.updated ?? []) {
    const group = chapterGroups.get(bookmark.chapterUid) ?? [];
    group.push(bookmark);
    chapterGroups.set(bookmark.chapterUid, group);
  }

  const reviewMap = new Map<string, WeReadReview[]>();
  for (const review of reviews.reviews ?? []) {
    const key = review.review.chapterName || '未分类';
    const group = reviewMap.get(key) ?? [];
    group.push(review);
    reviewMap.set(key, group);
  }

  for (const [chapterUid, groupBookmarks] of chapterGroups) {
    const chapter = chapterMap.get(chapterUid);
    const chapterTitle = chapter?.title || '未知章节';
    lines.push(`## ${chapterTitle}`);
    lines.push('');

    for (const bookmark of groupBookmarks) {
      lines.push(`> ${bookmark.markText}`);
      lines.push(`> — 划线于 ${formatWeReadDate(bookmark.createTime)}`);
      lines.push('');
    }
  }

  if (reviewMap.size > 0) {
    lines.push('## 我的想法');
    lines.push('');
    for (const [chapterName, groupReviews] of reviewMap) {
      lines.push(`### ${chapterName}`);
      lines.push('');
      for (const review of groupReviews) {
        lines.push(review.review.content);
        lines.push(`> 写于 ${formatWeReadDate(review.review.createTime)}`);
        lines.push('');
      }
    }
  }

  return lines.join('\n');
}
