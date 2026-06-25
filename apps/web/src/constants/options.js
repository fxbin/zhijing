/**
 * 选项常量：视图集合、筛选选项、捕获模式、导入限制等。
 * @module constants/options
 */

export const knownViews = new Set([
  'workspace',
  'detail',
  'library',
  'search',
  'kits',
  'workflow',
  'artifact',
  'maps',
  'chat',
  'recall',
  'export',
  'assets',
  'compare',
  'conflicts',
  'insights',
  'path',
  'archive',
  'settings',
  'weread',
]);

export const materialFilterOptions = [
  { key: 'all', label: 'library.filter.all' },
  { key: 'link', label: 'library.filter.link' },
  { key: 'text', label: 'library.filter.text' },
  { key: 'question', label: 'library.filter.question' },
  { key: 'failed', label: 'library.filter.failed' },
  { key: 'parsing', label: 'library.filter.parsing' },
];

export const captureModeOptions = ['auto', 'link', 'text', 'batch'];

export const supportedImportExtensions = ['.md', '.markdown', '.txt'];

export const maxImportedFileSize = 2 * 1024 * 1024;

export const searchScopeOptions = [
  { key: 'all', label: 'search.scope.all' },
  { key: 'workspace', label: 'search.scope.workspace' },
  { key: 'material', label: 'search.scope.material' },
  { key: 'card', label: 'search.scope.card' },
  { key: 'artifact', label: 'search.scope.artifact' },
];

export const CITATION_SNIPPET_LIMIT = 280;

export const TOP_SEARCH_STORAGE_KEY = 'zhijing:topSearch';

export const TOP_SEARCH_EVENT = 'zhijing:top-search';

export const PATH_CARD_ID_STORAGE_KEY = 'zhijing:pathCardId';

export const SEARCH_HISTORY_STORAGE_KEY = 'zhijing:searchHistory';

export const SEARCH_HISTORY_MAX_COUNT = 5;
