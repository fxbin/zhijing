/**
 * @module views/settings/constants
 * 设置视图常量与 SETTINGS_TABS 配置构建函数。
 * @author fxbin
 */

import {
  PlugZap,
  BookOpen,
  BarChart3,
  Cpu,
  Layers,
  Database,
  Sparkles,
} from 'lucide-react';

/**
 * 设置分区默认激活 profiles。
 */
const INITIAL_ACTIVE_SECTION = 'profiles';

/**
 * 设置视图 Tab 静态配置（不含 label，label 由 i18n 派生）。
 * group 用于在 Tab 列表中插入分组分隔符。
 */
const SETTINGS_TABS_CONFIG = [
  { key: 'profiles', icon: PlugZap, group: 'integration' },
  { key: 'weread', icon: BookOpen, group: 'integration' },
  { key: 'transparency', icon: BarChart3, group: 'system' },
  { key: 'agentUsage', icon: Cpu, group: 'system' },
  { key: 'capabilities', icon: Layers, group: 'system' },
  { key: 'dataControls', icon: Database, group: 'system' },
  { key: 'kits', icon: Sparkles, group: 'extension' },
];

/**
 * 基于静态配置与 i18n 函数构建含 label 的 Tab 列表。
 * @param {Function} t - i18n 翻译函数
 * @returns {Array<{key: string, icon: object, group: string, label: string}>} 含 label 的 Tab 列表
 */
function buildSettingsTabs(t) {
  const labelMap = {
    profiles: t('settings.profiles'),
    weread: t('settings.weread.title'),
    transparency: t('settings.systemTransparency'),
    agentUsage: t('agentUsage.title'),
    capabilities: t('capabilities.title'),
    dataControls: t('settings.dataControls'),
    kits: t('kit.title'),
  };
  return SETTINGS_TABS_CONFIG.map((tab) => ({ ...tab, label: labelMap[tab.key] }));
}

export { INITIAL_ACTIVE_SECTION, SETTINGS_TABS_CONFIG, buildSettingsTabs };
