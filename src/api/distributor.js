import { postJson, requestJson } from './http'
import { normalizeUploadPlatform } from '../utils/uploadPlatform'

export function createDistributorApi(apiBase, service = 'distributor') {
  const context = { service }
  const describe = summary => ({ ...context, summary })

  return {
    stopTask(taskId) {
      return postJson(`${apiBase}/tasks/${encodeURIComponent(taskId)}/stop`, undefined, describe('停止处理任务'))
    },

    retryTask(taskId) {
      return postJson(`${apiBase}/tasks/${encodeURIComponent(taskId)}/retry`, undefined, describe('重试失败任务'))
    },

    restartTask(taskId) {
      return postJson(`${apiBase}/tasks/${encodeURIComponent(taskId)}/restart`, undefined, describe('重启处理任务'))
    },

    deleteTask(taskId) {
      return requestJson(`${apiBase}/tasks/${encodeURIComponent(taskId)}`, { method: 'DELETE' }, describe('删除处理任务'))
    },

    deferTasks(taskIds) {
      return postJson(`${apiBase}/tasks/defer`, { taskIds }, describe('稍后执行任务'))
    },

    retryUploadSubmissions(platform, ids) {
      const normalized = normalizeUploadPlatform(platform)
      if (!normalized) throw new Error(`Unsupported upload platform: ${platform}`)
      return postJson(`${apiBase}/upload-submissions/${encodeURIComponent(normalized)}/retry`, { ids }, describe('重试投稿记录'))
    },

    markUploadSubmissionsActualPublished(platform, ids) {
      const normalized = normalizeUploadPlatform(platform)
      if (!normalized) throw new Error(`Unsupported upload platform: ${platform}`)
      return postJson(`${apiBase}/upload-submissions/${encodeURIComponent(normalized)}/actual-published`, { ids }, describe('标记实际发布'))
    },
  }
}
