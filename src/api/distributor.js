import { postJson, requestJson } from './http'
import { normalizeUploadPlatform } from '../utils/uploadPlatform'

export function createDistributorApi(apiBase, service = 'distributor') {
  const context = { service }

  return {
    stopTask(taskId) {
      return postJson(`${apiBase}/tasks/${encodeURIComponent(taskId)}/stop`, undefined, context)
    },

    retryTask(taskId) {
      return postJson(`${apiBase}/tasks/${encodeURIComponent(taskId)}/retry`, undefined, context)
    },

    restartTask(taskId) {
      return postJson(`${apiBase}/tasks/${encodeURIComponent(taskId)}/restart`, undefined, context)
    },

    deleteTask(taskId) {
      return requestJson(`${apiBase}/tasks/${encodeURIComponent(taskId)}`, { method: 'DELETE' }, context)
    },

    deferTasks(taskIds) {
      return postJson(`${apiBase}/tasks/defer`, { taskIds }, context)
    },

    retryUploadSubmissions(platform, ids) {
      const normalized = normalizeUploadPlatform(platform)
      if (!normalized) throw new Error(`Unsupported upload platform: ${platform}`)
      return postJson(`${apiBase}/upload-submissions/${encodeURIComponent(normalized)}/retry`, { ids }, context)
    },

    markUploadSubmissionsActualPublished(platform, ids) {
      const normalized = normalizeUploadPlatform(platform)
      if (!normalized) throw new Error(`Unsupported upload platform: ${platform}`)
      return postJson(`${apiBase}/upload-submissions/${encodeURIComponent(normalized)}/actual-published`, { ids }, context)
    },
  }
}
