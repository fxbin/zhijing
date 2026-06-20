#!/usr/bin/env node
/**
 * 扫描 zh.json 中仍使用英文短语的翻译值。
 * 输出值由英文单词组成（可能含数字/标点）且不含中文的键。
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ZH_FILE = path.join(__dirname, '..', 'apps', 'web', 'src', 'i18n', 'locales', 'zh.json');

const content = fs.readFileSync(ZH_FILE, 'utf-8');
const obj = JSON.parse(content);

function isMostlyEnglish(value) {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (/[\u4e00-\u9fa5]/.test(trimmed)) return false;
  if (!/[A-Za-z]/.test(trimmed)) return false;
  const words = trimmed.split(/\s+/).filter((w) => /[A-Za-z]/.test(w));
  if (words.length < 2) return false;
  return true;
}

const matches = [];
for (const [key, value] of Object.entries(obj)) {
  if (isMostlyEnglish(value)) {
    matches.push({ key, value });
  }
}

console.log(`zh.json 中疑似仍为英文的条目：${matches.length}\n`);
for (const { key, value } of matches.sort((a, b) => a.key.localeCompare(b.key))) {
  console.log(`${key}: ${value}`);
}
