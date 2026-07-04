import { requestJson } from './http'

export function createTasksApi(apiBase, service = 'monitor') {
  const context = { service }

  return {
    loadMonitorTasks(page = 1, limit = 20, filters = {}) {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) })
      if (filters.status && filters.status !== 'all') params.set('status', filters.status)
      if (filters.type && filters.type !== 'all') params.set('type', filters.type)
      if (filters.stage && filters.stage !== 'all') params.set('stage', filters.stage)
      if (filters.taskId) params.set('taskId', filters.taskId)
      if (filters.sort && filters.sort !== 'created_desc') params.set('sort', filters.sort)
      return requestJson(`${apiBase}/video-tasks/monitor?${params.toString()}`, undefined, context)
    },

    loadTaskProgress(taskId) {
      return requestJson(`${apiBase}/video-tasks/${encodeURIComponent(taskId)}/progress`, undefined, context)
    },

    loadTaskProgressBatch(taskIds) {
      return requestJson(`${apiBase}/video-tasks/progress/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskIds }),
      }, context)
    },

    loadServiceHeartbeats() {
      return requestJson(`${apiBase}/services/heartbeats`, undefined, context)
    },

    loadTaskTypes() {
      return requestJson(`${apiBase}/accounts/types`, undefined, context)
    },
  }
}
