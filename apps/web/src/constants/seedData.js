/**
 * 种子数据：在 API 离线时用于本地演示。
 * @module constants/seedData
 */

export const seedKnowledgeBases = [
  { title: 'AI Agent 学习', meta: '12 materials · 42 cards', active: true },
  { title: '小红书运营', meta: '18 materials · 76 cards' },
  { title: '产品调研', meta: '9 materials · 31 cards' },
];

export const seedMaterials = [
  {
    id: 'seed-xhs-1',
    source: 'XIAOHONGSHU',
    platform: 'xiaohongshu',
    status: 'CLASSIFIED',
    title: 'Minimalist Desk Setup Inspiration for 2024',
    summary: 'A collection of clean, highly functional desk setups focusing on neutral tones, cable management, and ergonomic design principles.',
    tags: ['workspace', 'design'],
    time: '2h ago',
    state: 'ready',
    mediaUrls: ['https://images.unsplash.com/photo-1499951360447-b19be8fe80f5?w=400&q=80'],
  },
  {
    id: 'seed-text-1',
    source: 'TEXT SNIPPET',
    status: 'PROCESSING',
    title: '"The essence of strategy is choosing what not to do."',
    summary: '- Michael Porter',
    tags: ['strategy'],
    time: '5h ago',
    state: 'processing',
  },
];
