import { requestJson } from './http'

export function createTaskFlowApi(apiBase, service = 'monitor') {
  const context = { service }

  return {
    loadTaskProgress(taskId) {
      return requestJson(`${apiBase}/video-tasks/${encodeURIComponent(taskId)}/progress`, undefined, context)
    },

    loadTaskFlow(taskId, stage) {
      const params = new URLSearchParams({ stage })
      return requestJson(`${apiBase}/video-tasks/${encodeURIComponent(taskId)}/flow?${params.toString()}`, undefined, context)
    },

    loadWhisperWordTimestamps(taskId) {
      return requestJson(`${apiBase}/video-tasks/${encodeURIComponent(taskId)}/whisper-word-timestamps`, undefined, context)
    },

    loadWhisperProcessing(taskId) {
      return requestJson(`${apiBase}/video-tasks/${encodeURIComponent(taskId)}/whisper-processing`, undefined, context)
    },

    loadOperatorDiagnostics(opId) {
      return requestJson(`${apiBase}/operator/tasks/${encodeURIComponent(opId)}/diagnostics`, undefined, context)
    },

    saveSpeakerSegmentDstText(taskId, segmentId, dstText) {
      return requestJson(`${apiBase}/video-tasks/${encodeURIComponent(taskId)}/speaker-segments/${encodeURIComponent(segmentId)}/dst-text`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dstText }),
      }, context)
    },

    saveTranslatorSegmentDstText(taskId, itemIndex, dstText) {
      return requestJson(`${apiBase}/video-tasks/${encodeURIComponent(taskId)}/translator-segments/${encodeURIComponent(itemIndex)}/dst-text`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dstText }),
      }, context)
    },
  }
}
