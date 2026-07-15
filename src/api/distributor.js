import { postJson, requestJson } from './http'
import { normalizeUploadPlatform } from '../utils/uploadPlatform'

export function createDistributorApi(apiBase, service = 'distributor') {
  const context = { service }
  const describe = summary => ({ ...context, summary })

  return {
    stopTask(taskId) {
      return postJson(`${apiBase}/tasks/${encodeURIComponent(taskId)}/stop`, undefined, describe('手动停止运行中任务'))
    },

    retryTask(taskId) {
      return postJson(`${apiBase}/tasks/${encodeURIComponent(taskId)}/retry`, undefined, describe('重试失败流水线任务'))
    },

    restartTask(taskId) {
      return postJson(`${apiBase}/tasks/${encodeURIComponent(taskId)}/restart`, undefined, describe('从头重启流水线任务'))
    },

    deleteTask(taskId) {
      return requestJson(`${apiBase}/tasks/${encodeURIComponent(taskId)}`, { method: 'DELETE' }, describe('删除流水线任务记录'))
    },

    deferTasks(taskIds) {
      return postJson(`${apiBase}/tasks/defer`, { taskIds }, describe('恢复任务为稍后执行'))
    },

    retryUploadSubmissions(platform, ids) {
      const normalized = normalizeUploadPlatform(platform)
      if (!normalized) throw new Error(`Unsupported upload platform: ${platform}`)
      return postJson(`${apiBase}/upload-submissions/${encodeURIComponent(normalized)}/retry`, { ids }, describe('批量重试投稿子任务'))
    },

    markUploadSubmissionsActualPublished(platform, ids) {
      const normalized = normalizeUploadPlatform(platform)
      if (!normalized) throw new Error(`Unsupported upload platform: ${platform}`)
      return postJson(`${apiBase}/upload-submissions/${encodeURIComponent(normalized)}/actual-published`, { ids }, describe('标记投稿已实际发布'))
    },

    abandonUploadSubmissions(platform, ids) {
      const normalized = normalizeUploadPlatform(platform)
      if (!normalized) throw new Error(`Unsupported upload platform: ${platform}`)
      return postJson(`${apiBase}/upload-submissions/${encodeURIComponent(normalized)}/abandon`, { ids }, describe('放弃投稿子任务发布'))
    },
  }
}
