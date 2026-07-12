/**
 * 流式 Agent 对话状态 Hook 入口（re-export 壳）。
 *
 * 实现已迁移至 ./streamChat/useStreamChat，本文件仅作转发，
 * 保持 hooks/useStreamChat.js 对外 API 表面不变，下游零破坏。
 *
 * @module hooks/useStreamChat
 * @author fxbin
 */

export { useStreamChat } from './streamChat/useStreamChat';
