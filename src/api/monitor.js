import { requestJson } from './http'

export function createMonitorApi(apiBase) {
  return {
    loadMonitorTasks() {
      return requestJson(`${apiBase}/video-tasks/monitor?limit=0`)
    },

    markTaskReady(taskId) {
      return requestJson(`${apiBase}/video-tasks/${encodeURIComponent(taskId)}/ready`, { method: 'POST' })
    },

    loadFailedUploadSubmissions(platform) {
      const params = new URLSearchParams({ platform })
      return requestJson(`${apiBase}/upload-submissions/failed?${params.toString()}`)
    },

    retryUploadSubmissions(platform, ids) {
      return requestJson(`${apiBase}/upload-submissions/failed/${encodeURIComponent(platform)}/retry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      })
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

    loadWhisperWordTimestamps(taskId) {
      return requestJson(`${apiBase}/video-tasks/${encodeURIComponent(taskId)}/whisper-word-timestamps`)
    },

    loadUploaderDiagnostics(taskId) {
      return requestJson(`${apiBase}/video-tasks/${encodeURIComponent(taskId)}/uploader-diagnostics`)
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
