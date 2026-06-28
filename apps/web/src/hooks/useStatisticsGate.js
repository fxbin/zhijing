/**
 * 统计视图反虚荣门禁 Hook（NS-4）。
 *
 * 任何统计视图在展示前必须调用本 Hook 评估是否能显示。
 * 默认 hidden（不可见），用户主动开启或后端 gate 评估通过才显示。
 *
 * @module hooks/useStatisticsGate
 * @author fxbin
 */

import { useCallback, useEffect, useState } from 'react';
import api from '../utils/api';
import { STATISTICS_GATE_EVALUATE_PATH, STATISTICS_GATE_STORAGE_PREFIX } from '../constants/weread';

/**
 * 视图元信息：每个统计视图需要声明自己是否依赖行为痕迹、是否跨用户、是否含排序对比等六关自检项。
 */
export const INITIAL_GATE_RESULT = {
  viewId: '',
  score: 0,
  passed: false,
  visibility: 'hidden',
  items: [],
  failedKeys: [],
};

/**
 * 评估本地存储的强制可见/隐藏覆盖。
 */
function readLocalOverride(viewId) {
  if (!viewId) return null;
  try {
    const raw = localStorage.getItem(`${STATISTICS_GATE_STORAGE_PREFIX}${viewId}`);
    if (raw === 'visible' || raw === 'hidden') return raw;
    return null;
  } catch {
    return null;
  }
}

function writeLocalOverride(viewId, visibility) {
  try {
    localStorage.setItem(`${STATISTICS_GATE_STORAGE_PREFIX}${viewId}`, visibility);
  } catch {
    // localStorage 不可用时静默忽略
  }
}

/**
 * 评估统计视图是否允许展示。
 * 评估失败时默认隐藏，必须由用户主动覆盖才能显示。
 *
 * @param {string} viewId 视图唯一标识
 * @param {{
 *   dependsOnBehaviorTrace: boolean,
 *   sharedAcrossUsers: boolean,
 *   hasRankingOrComparison: boolean,
 *   emphasizesQuantity: boolean,
 *   exposesRawData: boolean,
 *   allowsUserChallenge: boolean,
 *   isLinearlyOptimizable: boolean,
 * }} meta 视图元信息
 * @returns {{
 *   result: object,
 *   loading: boolean,
 *   error: object|null,
 *   isAllowed: boolean,
 *   isOverridden: boolean,
 *   override: (visibility: 'visible'|'hidden') => void,
 * }}
 */
export function useStatisticsGate(viewId, meta) {
  const [result, setResult] = useState(() => ({
    ...INITIAL_GATE_RESULT,
    viewId,
  }));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isOverridden, setIsOverridden] = useState(() => readLocalOverride(viewId) !== null);

  useEffect(() => {
    if (!viewId) return undefined;
    let cancelled = false;
    setLoading(true);
    setError(null);
    api
      .post(STATISTICS_GATE_EVALUATE_PATH, { viewId, ...meta })
      .then((response) => {
        if (cancelled) return;
        setResult(response);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err);
        setResult({ ...INITIAL_GATE_RESULT, viewId });
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [viewId, meta && meta.dependsOnBehaviorTrace, meta && meta.sharedAcrossUsers, meta && meta.hasRankingOrComparison, meta && meta.emphasizesQuantity, meta && meta.exposesRawData, meta && meta.allowsUserChallenge, meta && meta.isLinearlyOptimizable]);

  const override = useCallback(
    (visibility) => {
      if (visibility !== 'visible' && visibility !== 'hidden') return;
      writeLocalOverride(viewId, visibility);
      setIsOverridden(true);
    },
    [viewId],
  );

  const localOverride = readLocalOverride(viewId);
  const effectiveVisibility = localOverride ?? result.visibility;
  const isAllowed = effectiveVisibility !== 'hidden';

  return {
    result: { ...result, visibility: effectiveVisibility },
    loading,
    error,
    isAllowed,
    isOverridden,
    override,
  };
}
