#!/usr/bin/env node
/**
 * 扫描前端源码中可能的未翻译英文 UI 字符串。
 * 输出 JSX 文本节点与常见属性（placeholder/title/aria-label/alt/label）中的英文文本。
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

function stripComments(content) {
  return content
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '');
}

function isEnglishText(text) {
  const trimmed = text.trim();
  if (!trimmed) return false;
  if (/^\d+([%°])?$/.test(trimmed)) return false;
  if (/^[#\.]?[a-zA-Z0-9_-]+$/.test(trimmed) && !/[\s]/.test(trimmed)) {
    // 可能是类名、变量名、slug、颜色名
    return false;
  }
  if (/^[a-z][a-zA-Z0-9_-]*$/.test(trimmed) && trimmed.length < 25) {
    // 单个英文单词，可能是类型/状态键，暂不报
    return false;
  }
  if (/[\u4e00-\u9fa5]/.test(trimmed)) return false;
  if (!/[A-Za-z]/.test(trimmed)) return false;
  return true;
}

function extractJsxText(content) {
  const results = [];
  const regex = />([^<>{}\n]*?)</g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    const text = match[1];
    if (/[;=&|!]|return\s|if\s|\s=>\s/.test(text)) continue;
    if (isEnglishText(text)) {
      results.push(text.trim());
    }
  }
  return results;
}

function extractAttributeStrings(content) {
  const results = [];
  const attrs = ['placeholder', 'title', 'aria-label', 'alt', 'label', 'value', 'defaultValue'];
  const regex = new RegExp(`(?:${attrs.join('|')})=(?:"([^"]+)"|'([^']+)')`, 'g');
  let match;
  while ((match = regex.exec(content)) !== null) {
    const text = match[1] ?? match[2];
    if (isEnglishText(text)) {
      results.push(text.trim());
    }
  }
  return results;
}

function main() {
  const findings = [];
  for (const file of walk(SRC_DIR)) {
    const raw = fs.readFileSync(file, 'utf-8');
    const content = stripComments(raw);
    const jsxTexts = extractJsxText(content);
    const attrTexts = extractAttributeStrings(content);
    if (jsxTexts.length > 0 || attrTexts.length > 0) {
      findings.push({ file: path.relative(SRC_DIR, file), jsxTexts, attrTexts });
    }
  }

  if (findings.length === 0) {
    console.log('未发现明显未翻译的英文 UI 文本。');
    return;
  }

  for (const { file, jsxTexts, attrTexts } of findings) {
    console.log(`\n${file}`);
    for (const text of jsxTexts) {
      console.log(`  [JSX] ${text}`);
    }
    for (const text of attrTexts) {
      console.log(`  [ATTR] ${text}`);
    }
  }
}

main();
