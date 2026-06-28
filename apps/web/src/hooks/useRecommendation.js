/**
 * 微信读书推荐列表 + A/B 实验桶 Hook（NS-5 全量整合）。
 *
 * 封装两件事：
 * 1. 实验桶分配（control / treatment）：localStorage 覆盖 > workspaceId 哈希分流 > 默认 control。
 *    control 沿用现有三策略排序；treatment 在排序中给 Q1∪Q3 种子书加权（后端处理）。
 * 2. 推荐列表请求：携带 bucket 参数调 /api/weread/recommendations，返回结构化结果。
 *
 * 桶分配为确定性哈希，同一 workspaceId 永远落到同一桶，保证灰度期间用户体验稳定。
 *
 * @module hooks/useRecommendation
 * @author fxbin
 */

import { useCallback, useEffect, useState } from 'react';
import api from '../utils/api';
import {
  WEREAD_RECOMMENDATIONS_PATH,
  RECOMMEND_BUCKET_STORAGE_KEY,
  RECOMMEND_BUCKET_VALUES,
  RECOMMEND_BUCKET_DEFAULT,
} from '../constants/weread';

/**
 * 哈希乘子（djb2 变体）。
 */
const HASH_SEED = 5381;

/**
 * 字符串确定性哈希（djb2 变体）。
 * 同一输入恒定输出，用于实验桶稳定分流。
 * @param {string} str 待哈希字符串
 * @returns {number} 非负整数
 */
function hashString(str) {
  let h = HASH_SEED;
  for (let i = 0; i < str.length; i += 1) {
    h = ((h << 5) + h + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

/**
 * 读取 localStorage 中的桶覆盖（灰度手动指定）。
 * @returns {string|null} 合法桶值或 null
 */
function readBucketOverride() {
  try {
    const raw = localStorage.getItem(RECOMMEND_BUCKET_STORAGE_KEY);
    if (RECOMMEND_BUCKET_VALUES.includes(raw)) return raw;
    return null;
  } catch {
    return null;
  }
}

/**
 * 解析当前实验桶：覆盖 > 哈希分流 > 默认。
 * @param {string} workspaceId 工作区 ID（分流种子）
 * @returns {string} control 或 treatment
 */
export function resolveRecommendationBucket(workspaceId) {
  const override = readBucketOverride();
  if (override) return override;
  if (!workspaceId) return RECOMMEND_BUCKET_DEFAULT;
  return hashString(workspaceId) % 2 === 0 ? RECOMMEND_BUCKET_DEFAULT : 'treatment';
}

/**
 * 拉取推荐列表并自动分配实验桶。
 *
 * @param {string|null} [workspaceId] 当前工作区 ID
 * @param {{ forceBucket?: string }} [options] 可选强制桶（调试用）
 * @returns {{
 *   data: object|null,
 *   recommendations: Array<object>,
 *   coverageGaps: Array<object>,
 *   total: number,
 *   bucket: string,
 *   loading: boolean,
 *   error: object|null,
 *   refresh: () => void,
 * }}
 */
export function useRecommendation(workspaceId, options) {
  const forceBucket = options && options.forceBucket;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const bucket = forceBucket || resolveRecommendationBucket(workspaceId || '');

  const refresh = useCallback(() => {
    setRefreshKey((prev) => prev + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (workspaceId) params.set('workspaceId', workspaceId);
    params.set('bucket', bucket);
    const url = `${WEREAD_RECOMMENDATIONS_PATH}?${params.toString()}`;
    api
      .get(url)
      .then((response) => {
        if (cancelled) return;
        setData(response);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err);
        setData(null);
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [workspaceId, bucket, refreshKey]);

  const recommendations = data && Array.isArray(data.recommendations) ? data.recommendations : [];
  const coverageGaps = data && Array.isArray(data.coverageGaps) ? data.coverageGaps : [];

  return {
    data,
    recommendations,
    coverageGaps,
    total: recommendations.length,
    bucket,
    loading,
    error,
    refresh,
  };
}
