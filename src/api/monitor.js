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

    loadTaskProgressBatch(taskIds) {
      return requestJson(`${apiBase}/video-tasks/progress/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskIds }),
      })
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

    loadTaskFlow(taskId, stage) {
      const params = new URLSearchParams({ stage })
      return requestJson(`${apiBase}/video-tasks/${encodeURIComponent(taskId)}/flow?${params.toString()}`)
    },

    loadWhisperWordTimestamps(taskId) {
      return requestJson(`${apiBase}/video-tasks/${encodeURIComponent(taskId)}/whisper-word-timestamps`)
    },

    loadWhisperProcessing(taskId) {
      return requestJson(`${apiBase}/video-tasks/${encodeURIComponent(taskId)}/whisper-processing`)
    },

    loadOperatorDiagnostics(opId) {
      return requestJson(`${apiBase}/operator/tasks/${encodeURIComponent(opId)}/diagnostics`)
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

    listStaticAssets({ type, taskId, scope, keyword, limit, offset } = {}) {
      const params = new URLSearchParams()
      if (type) params.set('type', type)
      if (taskId) params.set('taskId', taskId)
      if (scope && scope !== 'all') params.set('scope', scope)
      if (keyword) params.set('keyword', keyword)
      if (limit !== undefined && limit !== null) params.set('limit', String(limit))
      if (offset !== undefined && offset !== null) params.set('offset', String(offset))
      const query = params.toString()
      return requestJson(`${apiBase}/assets${query ? `?${query}` : ''}`)
    },

    getStaticAsset(id) {
      return requestJson(`${apiBase}/assets/${encodeURIComponent(id)}`)
    },

    createStaticTextAsset({ taskId, type, content, remark }) {
      return requestJson(`${apiBase}/assets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId, type, content, remark }),
      })
    },

    uploadStaticAsset({ type, taskId, remark, file }) {
      const form = new FormData()
      form.append('type', type)
      if (taskId) form.append('taskId', taskId)
      if (remark) form.append('remark', remark)
      form.append('file', file)
      return requestJson(`${apiBase}/assets/upload`, {
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

    saveTranslatorSegmentDstText(taskId, itemIndex, dstText) {
      return requestJson(`${apiBase}/video-tasks/${encodeURIComponent(taskId)}/translator-segments/${encodeURIComponent(itemIndex)}/dst-text`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dstText }),
      })
    },
  }
}
