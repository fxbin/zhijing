/**
 * 阅读行为追踪工具，记录用户在工作区详情视图的停留时长。
 * 当用户切换工作区或离开详情视图时，自动上报停留时长到后端。
 * @author fxbin
 */

import api from './api';

const READING_SESSION_MIN_DURATION_MS = 1000;

let currentSession = null;

/**
 * 开始记录用户在某个工作区详情视图的阅读会话。
 * 如果已有进行中的会话，先上报上一个会话。
 * @param {string} workspaceId - 工作区 ID
 */
export function startReadingSession(workspaceId) {
  if (!workspaceId) return;
  if (currentSession && currentSession.workspaceId === workspaceId) return;
  if (currentSession) {
    void flushReadingSession();
  }
  currentSession = { workspaceId, startedAt: Date.now() };
}

/**
 * 上报当前阅读会话的停留时长到后端。
 * 静默失败，不影响用户体验。
 */
export async function flushReadingSession() {
  if (!currentSession) return;
  const session = currentSession;
  currentSession = null;
  const durationMs = Date.now() - session.startedAt;
  if (durationMs < READING_SESSION_MIN_DURATION_MS) return;
  try {
    await api.post('/api/reading-sessions', {
      cardId: session.workspaceId,
      workspaceId: session.workspaceId,
      durationMs,
    });
  } catch {
    // 静默失败，不影响用户体验
  }
}
