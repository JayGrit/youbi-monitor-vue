import { requestJson } from './http'

export function createMonitorApi(apiBase) {
  return {
    loadMonitorTasks() {
      return requestJson(`${apiBase}/video-tasks/monitor?limit=100`)
    },

    markTaskReady(taskId) {
      return requestJson(`${apiBase}/video-tasks/${encodeURIComponent(taskId)}/ready`, { method: 'POST' })
    },

    stopTask(taskId) {
      return requestJson(`${apiBase}/video-tasks/${encodeURIComponent(taskId)}/stop`, { method: 'POST' })
    },

    restartTask(taskId) {
      return requestJson(`${apiBase}/video-tasks/${encodeURIComponent(taskId)}/restart`, { method: 'POST' })
    },

    deleteTask(taskId) {
      return requestJson(`${apiBase}/video-tasks/${encodeURIComponent(taskId)}`, { method: 'DELETE' })
    },

    loadTaskFlow(taskId) {
      return requestJson(`${apiBase}/video-tasks/${encodeURIComponent(taskId)}/flow`)
    },

    saveSpeakerSegmentDstText(taskId, segmentId, dstText) {
      return requestJson(`${apiBase}/video-tasks/${encodeURIComponent(taskId)}/speaker-segments/${encodeURIComponent(segmentId)}/dst-text`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dstText }),
      })
    },
  }
}
