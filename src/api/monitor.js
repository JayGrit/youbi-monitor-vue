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

    loadTaskProgress(taskId) {
      return requestJson(`${apiBase}/video-tasks/${encodeURIComponent(taskId)}/progress`)
    },

    loadServiceHeartbeats() {
      return requestJson(`${apiBase}/services/heartbeats`)
    },

    loadTaskTypes() {
      return requestJson(`${apiBase}/accounts/types`)
    },

    loadFailureLogs() {
      return requestJson(`${apiBase}/failure-logs`)
    },

    markFailureLogActualPublished(logId) {
      return requestJson(`${apiBase}/failure-logs/${encodeURIComponent(logId)}/actual-published`, {
        method: 'POST',
      })
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

    submitNarrationSegments(taskId, response) {
      return requestJson(`${apiBase}/video-tasks/${encodeURIComponent(taskId)}/publisher/narration/segments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response }),
      })
    },

    uploadNarrationImage(taskId, kind, file) {
      const form = new FormData()
      form.append('file', file)
      return requestJson(`${apiBase}/video-tasks/${encodeURIComponent(taskId)}/publisher/narration/images/${encodeURIComponent(kind)}`, {
        method: 'POST',
        body: form,
      })
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
