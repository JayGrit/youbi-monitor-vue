import { requestJson } from './http'

export function createTasksApi(apiBase, service = 'monitor') {
  const context = { service }
  const describe = summary => ({ ...context, summary })

  return {
    loadMonitorTasks(page = 1, limit = 20, filters = {}) {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) })
      if (filters.status && filters.status !== 'all') params.set('status', filters.status)
      if (filters.type && filters.type !== 'all') params.set('type', filters.type)
      if (filters.stage && filters.stage !== 'all') params.set('stage', filters.stage)
      if (filters.taskId) params.set('taskId', filters.taskId)
      if (filters.sort && filters.sort !== 'created_desc') params.set('sort', filters.sort)
      return requestJson(`${apiBase}/video-tasks/monitor?${params.toString()}`, undefined, describe('加载任务列表'))
    },

    loadTaskProgress(taskId) {
      return requestJson(`${apiBase}/video-tasks/${encodeURIComponent(taskId)}/progress`, undefined, describe('加载任务进度'))
    },

    loadTaskProgressBatch(taskIds) {
      return requestJson(`${apiBase}/video-tasks/progress/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskIds }),
      }, describe('批量任务进度'))
    },

    loadServiceHeartbeats() {
      return requestJson(`${apiBase}/services/heartbeats`, undefined, describe('加载服务心跳'))
    },

    loadTaskTypes() {
      return requestJson(`${apiBase}/accounts/types`, undefined, describe('加载任务类型'))
    },
  }
}
