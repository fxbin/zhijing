#!/usr/bin/env node
/**
 * 提取前端代码中所有 react-i18next 的 t() 调用键，用于核对翻译覆盖。
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC_DIR = path.join(__dirname, '..', 'apps', 'web', 'src');

function walk(dir) {
  const entries = [];
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      entries.push(...walk(full));
    } else if (/\.(js|jsx|ts|tsx)$/.test(name)) {
      entries.push(full);
    }
  }
  return entries;
}

function extractKeys(content) {
  const keys = new Set();
  // 匹配 t('key') 或 t("key", { ... }) 或 t(`key`)
  const regex = /t\(\s*['"`]([^'"`]+)['"`]/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    keys.add(match[1]);
  }
  return keys;
}

function collectKeys() {
  const allKeys = new Set();
  for (const file of walk(SRC_DIR)) {
    const content = fs.readFileSync(file, 'utf-8');
    for (const key of extractKeys(content)) {
      allKeys.add(key);
    }
  }
  return Array.from(allKeys).sort();
}

console.log(collectKeys().join('\n'));
