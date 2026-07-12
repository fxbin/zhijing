/**
 * 资料库操作域 · 收集与导入状态 Hook。
 *
 * 管理 inbox 收集输入值、捕获模式（auto/batch）、收集与文件导入中的标记位，
 * 以及处理中状态文案轮播定时器。提供单条/批量收集、本地文件导入、
 * 触发外部解析三类业务函数。
 *
 * @module hooks/libraryOps/useCaptureState
 * @author fxbin
 */

import { useEffect, useRef, useState } from 'react';
import api from '../../utils/api';
import { splitBatchCaptureInput } from '../../utils/material';
import {
  maxImportedFileSize,
  supportedImportExtensions,
} from '../../constants/options';
import { INTAKE_PATH } from '../../constants/apiPaths';
import {
  DEFAULT_CAPTURE_MODE,
  LOCAL_FILE_PREFIX,
} from './constants';

/**
 * 处理中文案轮播间隔（毫秒）。
 */
const PROCESSING_STAGE_INTERVAL_MS = 3500;

/**
 * 使用收集与导入状态。
 * @param {object} params - 入参对象
 * @param {function} params.t - i18n 翻译函数
 * @param {string} params.apiStatus - API 连接状态
 * @param {function} params.setStatus - 设置状态文案（来自数据域 hook）
 * @param {function} params.setCaptureSummary - 设置捕获汇总（来自数据域 hook）
 * @param {function} params.loadMaterials - 重新加载资料列表（来自数据域 hook）
 * @param {function} [params.onCaptureResult] - 收集结果回调
 * @param {function} [params.onParseMaterial] - 解析资料回调
 * @returns {object} 收集域 state、setter 与业务函数
 * @author fxbin
 */
export function useCaptureState({
  t,
  apiStatus,
  setStatus,
  setCaptureSummary,
  loadMaterials,
  onCaptureResult,
  onParseMaterial,
}) {
  const [captureValue, setCaptureValue] = useState('');
  const [captureMode, setCaptureMode] = useState(DEFAULT_CAPTURE_MODE);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isImportingFile, setIsImportingFile] = useState(false);

  const isProcessing = isCapturing || isImportingFile;
  const processingStageRef = useRef(0);
  const processingTimerRef = useRef(null);
  const processingStages = [
    t('library.status.processingStage1'),
    t('library.status.processingStage2'),
    t('library.status.processingStage3'),
  ];

  useEffect(() => {
    if (!isProcessing) {
      if (processingTimerRef.current) {
        clearInterval(processingTimerRef.current);
        processingTimerRef.current = null;
      }
      processingStageRef.current = 0;
      return undefined;
    }
    setStatus(processingStages[0]);
    processingTimerRef.current = setInterval(() => {
      processingStageRef.current = (processingStageRef.current + 1) % processingStages.length;
      setStatus(processingStages[processingStageRef.current]);
    }, PROCESSING_STAGE_INTERVAL_MS);
    return () => {
      if (processingTimerRef.current) clearInterval(processingTimerRef.current);
    };
  }, [isProcessing]);

  /**
   * 触发收集：依据捕获模式走单条或批量路径，写入捕获汇总与状态文案，结束后重新加载资料。
   * @author fxbin
   */
  async function capture() {
    const value = captureValue.trim();
    if (!value || isCapturing || apiStatus !== 'online') return;
    setIsCapturing(true);
    const batchItems = captureMode === 'batch' ? splitBatchCaptureInput(value) : [];
    try {
      if (captureMode === 'batch') {
        if (batchItems.length === 0) throw new Error('Empty batch.');
        let captured = 0;
        let failed = 0;
        let lastResult = null;
        for (const input of batchItems) {
          try {
            lastResult = await api.post(INTAKE_PATH, { input });
            captured += 1;
          } catch {
            failed += 1;
          }
        }
        if (lastResult) onCaptureResult(lastResult);
        setCaptureValue('');
        setStatus(failed ? t('library.status.captureBatchResultWithFailed', { captured, failed }) : t('library.status.captureBatchResultSuccess', { captured }));
        setCaptureSummary({ message: failed ? t('library.status.captureBatchResultWithFailed', { captured, failed }) : t('library.status.captureBatchResultSuccess', { captured }), count: captured, at: Date.now() });
        await loadMaterials();
        return;
      }
      const result = await api.post(INTAKE_PATH, { input: value });
      onCaptureResult(result);
      setCaptureValue('');
      setStatus(result.message);
      setCaptureSummary({ message: result.message || t('library.status.materialCaptured'), count: 1, at: Date.now() });
      await loadMaterials();
    } catch {
      setStatus(t('library.status.captureFailed'));
    } finally {
      setIsCapturing(false);
    }
  }

  /**
   * 导入本地文本文件：校验类型与大小后读取内容并归集到 inbox。
   * @param {Event} event - 文件输入 change 事件
   * @author fxbin
   */
  async function importTextFile(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || isImportingFile) return;
    if (apiStatus !== 'online') {
      setStatus(t('library.status.apiDisconnectedImport'));
      return;
    }
    const lowerName = file.name.toLowerCase();
    const isSupported = supportedImportExtensions.some((extension) => lowerName.endsWith(extension));
    if (!isSupported) {
      setStatus(t('library.status.unsupportedFileType'));
      return;
    }
    if (file.size > maxImportedFileSize) {
      setStatus(t('library.status.fileTooLarge'));
      return;
    }
    setIsImportingFile(true);
    try {
      const text = (await file.text()).trim();
      if (!text) throw new Error('Empty file.');
      const result = await api.post(INTAKE_PATH, { input: `${LOCAL_FILE_PREFIX}${file.name}\n\n${text}` });
      onCaptureResult(result);
      setStatus(result.message);
      setCaptureSummary({ message: result.message || t('library.status.localFileCaptured'), count: 1, at: Date.now() });
      await loadMaterials();
    } catch {
      setStatus(t('library.status.importFileFailed'));
    } finally {
      setIsImportingFile(false);
    }
  }

  /**
   * 触发外部解析资料并重新加载列表。
   * @param {string} materialId - 资料 ID
   * @author fxbin
   */
  async function parseFromLibrary(materialId) {
    if (!onParseMaterial) return;
    await onParseMaterial(materialId);
    await loadMaterials();
  }

  return {
    captureValue,
    setCaptureValue,
    captureMode,
    setCaptureMode,
    isCapturing,
    isImportingFile,
    capture,
    importTextFile,
    parseFromLibrary,
  };
}
