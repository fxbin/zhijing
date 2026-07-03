import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const optionsPath = resolve(root, 'apps/web/src/constants/options.js');
const mainPath = resolve(root, 'apps/web/src/main.jsx');

const optionsSource = readFileSync(optionsPath, 'utf8');
const mainSource = readFileSync(mainPath, 'utf8');

const knownViewsBlock = /export const knownViews = new Set\(\[\s*([\s\S]*?)\s*\]\);/.exec(optionsSource);
if (!knownViewsBlock) {
  throw new Error('Unable to find knownViews in apps/web/src/constants/options.js');
}

const knownViews = Array.from(knownViewsBlock[1].matchAll(/'([^']+)'/g), (match) => match[1]);
const renderedViews = new Set(Array.from(mainSource.matchAll(/view === '([^']+)'/g), (match) => match[1]));
const missingViews = knownViews.filter((view) => !renderedViews.has(view));

if (missingViews.length > 0) {
  throw new Error(`knownViews contains routes that main.jsx does not render: ${missingViews.join(', ')}`);
}

console.log(`Web view routes ok: ${knownViews.length} routes render in main.jsx.`);
