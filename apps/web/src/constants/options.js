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
  'synthesis',
  'compare',
  'conflicts',
  'settings',
]);

export const materialFilterOptions = [
  { key: 'all', label: 'All Materials' },
  { key: 'link', label: 'Links' },
  { key: 'text', label: 'Text' },
  { key: 'question', label: 'Questions' },
  { key: 'failed', label: 'Failed' },
  { key: 'parsing', label: 'Parsing' },
];

export const captureModeOptions = ['auto', 'link', 'text', 'batch'];

export const supportedImportExtensions = ['.md', '.markdown', '.txt'];

export const maxImportedFileSize = 2 * 1024 * 1024;

export const searchScopeOptions = [
  { key: 'all', label: 'All' },
  { key: 'knowledge_base', label: 'Knowledge Bases' },
  { key: 'material', label: 'Materials' },
  { key: 'card', label: 'Cards' },
  { key: 'artifact', label: 'Artifacts' },
];

export const CITATION_SNIPPET_LIMIT = 280;
