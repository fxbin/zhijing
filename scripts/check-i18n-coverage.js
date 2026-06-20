#!/usr/bin/env node
/**
 * 检查 react-i18next 翻译键覆盖情况：对比 i18n/index.js 与代码中的 t() 调用。
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ZH_FILE = path.join(__dirname, '..', 'apps', 'web', 'src', 'i18n', 'locales', 'zh.json');
const EN_FILE = path.join(__dirname, '..', 'apps', 'web', 'src', 'i18n', 'locales', 'en.json');
const SRC_DIR = path.join(__dirname, '..', 'apps', 'web', 'src');

function extractI18nKeys(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const obj = JSON.parse(content);
  return new Set(Object.keys(obj));
}

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

function extractCodeKeys(content) {
  const keys = new Set();
  const regex = /t\(\s*['"`]([^'"`]+)['"`]/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    const key = match[1];
    // 过滤动态插值键与明显误匹配
    if (/\$\{/.test(key)) continue;
    if (/^(a|q|svg|updated_desc|learning_research)$/.test(key)) continue;
    keys.add(key);
  }
  return keys;
}

function extractCodeKeysFromDir(dir) {
  const all = new Set();
  for (const file of walk(dir)) {
    const content = fs.readFileSync(file, 'utf-8');
    for (const key of extractCodeKeys(content)) {
      all.add(key);
    }
  }
  return all;
}

const zhKeys = extractI18nKeys(ZH_FILE);
const enKeys = extractI18nKeys(EN_FILE);
const codeKeys = extractCodeKeysFromDir(SRC_DIR);

const missingInZh = [];
const missingInEn = [];
for (const key of codeKeys) {
  if (!zhKeys.has(key)) missingInZh.push(key);
  if (!enKeys.has(key)) missingInEn.push(key);
}

console.log(`代码中 t() 键总数: ${codeKeys.size}`);
console.log(`zh.json 已定义键总数: ${zhKeys.size}`);
console.log(`en.json 已定义键总数: ${enKeys.size}`);
console.log(`zh.json 缺失键数: ${missingInZh.length}`);
console.log(`en.json 缺失键数: ${missingInEn.length}`);

function printMissing(label, missing) {
  if (missing.length === 0) return;
  console.log(`\n${label}：`);
  const grouped = {};
  for (const key of missing.sort()) {
    const ns = key.split('.')[0];
    grouped[ns] = grouped[ns] || [];
    grouped[ns].push(key);
  }
  for (const ns of Object.keys(grouped).sort()) {
    console.log(`\n[${ns}]`);
    for (const key of grouped[ns]) {
      console.log(`  ${key}`);
    }
  }
}

printMissing('zh.json 缺失的键（按命名空间分组）', missingInZh);
printMissing('en.json 缺失的键（按命名空间分组）', missingInEn);
