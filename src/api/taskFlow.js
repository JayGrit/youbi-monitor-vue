import { requestJson } from './http'

export function createTaskFlowApi(apiBase, service = 'monitor') {
  const context = { service }
  const describe = summary => ({ ...context, summary })

  return {
    loadTaskProgress(taskId) {
      return requestJson(`${apiBase}/video-tasks/${encodeURIComponent(taskId)}/progress`, undefined, describe('加载任务进度'))
    },

    loadTaskFlow(taskId, stage) {
      const params = new URLSearchParams({ stage })
      return requestJson(`${apiBase}/video-tasks/${encodeURIComponent(taskId)}/flow?${params.toString()}`, undefined, describe('加载任务流详情'))
    },

    loadWhisperWordTimestamps(taskId) {
      return requestJson(`${apiBase}/video-tasks/${encodeURIComponent(taskId)}/whisper-word-timestamps`, undefined, describe('加载词级时间轴'))
    },

    loadWhisperProcessing(taskId) {
      return requestJson(`${apiBase}/video-tasks/${encodeURIComponent(taskId)}/whisper-processing`, undefined, describe('加载识别指标'))
    },

    loadOperatorDiagnostics(opId) {
      return requestJson(`${apiBase}/operator/tasks/${encodeURIComponent(opId)}/diagnostics`, undefined, describe('加载执行诊断'))
    },

    saveSpeakerSegmentDstText(taskId, segmentId, dstText) {
      return requestJson(`${apiBase}/video-tasks/${encodeURIComponent(taskId)}/speaker-segments/${encodeURIComponent(segmentId)}/dst-text`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dstText }),
      }, describe('保存配音文本'))
    },

    saveTranslatorSegmentDstText(taskId, itemIndex, dstText) {
      return requestJson(`${apiBase}/video-tasks/${encodeURIComponent(taskId)}/translator-segments/${encodeURIComponent(itemIndex)}/dst-text`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dstText }),
      }, describe('保存翻译文本'))
    },
  }
}
