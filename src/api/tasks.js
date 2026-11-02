import { requestJson } from './http'

export function createTasksApi(apiBase, service = 'monitor') {
  const context = { service }
  const describe = summary => ({ ...context, summary })

  return {
    loadMonitorTasks(page = 1, limit = 20, filters = {}) {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) })
      if (filters.status && filters.status !== 'all') params.set('status', filters.status)
      if (filters.topic && filters.topic !== 'all') params.set('topic', filters.topic)
      if (filters.taskType && filters.taskType !== 'all') params.set('taskType', filters.taskType)
      if (filters.stage && filters.stage !== 'all') params.set('stage', filters.stage)
      if (filters.search) params.set('search', filters.search)
      return requestJson(`${apiBase}/video-tasks/monitor?${params.toString()}`, undefined, describe('查询监控任务分页列表'))
    },

    loadTaskProgress(taskId) {
      return requestJson(`${apiBase}/video-tasks/${encodeURIComponent(taskId)}/progress`, undefined, describe('查询单任务阶段进度'))
    },

    loadTaskProgressBatch(taskIds) {
      return requestJson(`${apiBase}/video-tasks/progress/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskIds }),
      }, describe('批量查询任务阶段进度'))
    },

    loadServiceHeartbeats() {
      return requestJson(`${apiBase}/services/heartbeats`, undefined, describe('查询各服务心跳状态'))
    },

    loadTaskTypes() {
      return requestJson(`${apiBase}/video-tasks/monitor/filters`, undefined, describe('查询监控任务筛选选项'))
    },
  }
}
