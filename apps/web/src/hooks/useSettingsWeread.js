/**
 * 设置视图 · 微信读书域状态 Hook。
 * 统一管理微信读书 API Key 输入、配置状态、保存中、测试中、测试结果，
 * 并提供初始配置加载、保存、测试连接三类业务函数。
 * 视图层通过 setStatus 共享跨域状态文案，故作为入参注入。
 * @module hooks/useSettingsWeread
 * @author fxbin
 */

import { useEffect, useState } from 'react';
import api from '../utils/api';

/**
 * 微信读书设置接口路径。
 */
const WEREAD_SETTINGS_PATH = '/api/weread/settings';

/**
 * 微信读书测试接口路径。
 */
const WEREAD_TEST_PATH = '/api/weread/settings/test';

/**
 * API Key 输入框初始为空。
 */
const INITIAL_WEREAD_API_KEY = '';

/**
 * 未配置状态初始值。
 */
const INITIAL_WEREAD_CONFIGURED = false;

/**
 * 初始未在保存中。
 */
const INITIAL_WEREAD_SAVING = false;

/**
 * 初始未在测试中。
 */
const INITIAL_WEREAD_TESTING = false;

/**
 * 初始未产生测试结果。
 */
const INITIAL_WEREAD_TEST_RESULT = null;

/**
 * 使用微信读书域状态。
 * @param {object} params - 入参对象
 * @param {function} params.setStatus - 跨域状态文案更新函数（由视图层维护并注入）
 * @param {function} params.t - i18n 翻译函数
 * @returns {object} 微信读书域 state、setter 与业务函数
 * @author fxbin
 */
export function useSettingsWeread({ setStatus, t }) {
  const [wereadApiKey, setWereadApiKey] = useState(INITIAL_WEREAD_API_KEY);
  const [wereadConfigured, setWereadConfigured] = useState(INITIAL_WEREAD_CONFIGURED);
  const [wereadSaving, setWereadSaving] = useState(INITIAL_WEREAD_SAVING);
  const [wereadTesting, setWereadTesting] = useState(INITIAL_WEREAD_TESTING);
  const [wereadTestResult, setWereadTestResult] = useState(INITIAL_WEREAD_TEST_RESULT);

  useEffect(() => {
    let ignore = false;
    async function loadWeReadSettings() {
      try {
        const result = await api.get(WEREAD_SETTINGS_PATH);
        if (ignore) return;
        setWereadConfigured(result.configured);
      } catch {
        if (!ignore) setWereadConfigured(INITIAL_WEREAD_CONFIGURED);
      }
    }
    loadWeReadSettings();
    return () => {
      ignore = true;
    };
  }, []);

  /**
   * 保存微信读书 API Key。
   * @author fxbin
   */
  async function saveWeReadKey() {
    const value = wereadApiKey.trim();
    if (!value || wereadSaving) return;
    setWereadSaving(true);
    setWereadTestResult(INITIAL_WEREAD_TEST_RESULT);
    try {
      await api.put(WEREAD_SETTINGS_PATH, { apiKey: value });
      setWereadConfigured(true);
      setWereadApiKey(INITIAL_WEREAD_API_KEY);
      setStatus(t('settings.weread.saveSuccess'));
    } catch {
      setStatus(t('settings.weread.saveFailed'));
    } finally {
      setWereadSaving(false);
    }
  }

  /**
   * 测试微信读书 API Key 连接。
   * @author fxbin
   */
  async function testWeReadKey() {
    if (wereadTesting) return;
    setWereadTesting(true);
    setWereadTestResult(INITIAL_WEREAD_TEST_RESULT);
    try {
      const result = await api.post(WEREAD_TEST_PATH);
      setWereadTestResult(result);
      setStatus(result.ok ? t('settings.weread.testSuccess') : t('settings.weread.testFailed'));
    } catch {
      setWereadTestResult({ ok: false, error: t('settings.weread.testFailed') });
      setStatus(t('settings.weread.testFailed'));
    } finally {
      setWereadTesting(false);
    }
  }

  return {
    wereadApiKey,
    setWereadApiKey,
    wereadConfigured,
    wereadSaving,
    wereadTesting,
    wereadTestResult,
    saveWeReadKey,
    testWeReadKey,
  };
}
