import { requestJson } from './http'

export function createMonitorApi(apiBase) {
  return {
    loadMonitorTasks(page = 1, limit = 20, filters = {}) {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) })
      if (filters.status && filters.status !== 'all') params.set('status', filters.status)
      if (filters.type && filters.type !== 'all') params.set('type', filters.type)
      if (filters.stage && filters.stage !== 'all') params.set('stage', filters.stage)
      if (filters.taskId) params.set('taskId', filters.taskId)
      if (filters.sort && filters.sort !== 'created_desc') params.set('sort', filters.sort)
      return requestJson(`${apiBase}/video-tasks/monitor?${params.toString()}`)
    },

    loadTaskTypes() {
      return requestJson(`${apiBase}/accounts/types`)
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

    loadFailedTasks() {
      return requestJson(`${apiBase}/task-failures`)
    },

    rollbackFailedTasks(submissionIds) {
      return requestJson(`${apiBase}/task-failures/rollback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submissionIds }),
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

    loadWhisperProcessing(taskId) {
      return requestJson(`${apiBase}/video-tasks/${encodeURIComponent(taskId)}/whisper-processing`)
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
