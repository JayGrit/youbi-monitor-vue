import { postJson, requestJson } from './http'
import { normalizeUploadPlatform } from '../utils/uploadPlatform'

export function createDistributorApi(apiBase) {
  return {
    stopTask(taskId) {
      return postJson(`${apiBase}/tasks/${encodeURIComponent(taskId)}/stop`)
    },

    retryTask(taskId) {
      return postJson(`${apiBase}/tasks/${encodeURIComponent(taskId)}/retry`)
    },

    restartTask(taskId) {
      return postJson(`${apiBase}/tasks/${encodeURIComponent(taskId)}/restart`)
    },

    deleteTask(taskId) {
      return requestJson(`${apiBase}/tasks/${encodeURIComponent(taskId)}`, { method: 'DELETE' })
    },

    deferTasks(taskIds) {
      return postJson(`${apiBase}/tasks/defer`, { taskIds })
    },

    retryUploadSubmissions(platform, ids) {
      const normalized = normalizeUploadPlatform(platform)
      if (!normalized) throw new Error(`Unsupported upload platform: ${platform}`)
      return postJson(`${apiBase}/upload-submissions/${encodeURIComponent(normalized)}/retry`, { ids })
    },

    markUploadSubmissionsActualPublished(platform, ids) {
      const normalized = normalizeUploadPlatform(platform)
      if (!normalized) throw new Error(`Unsupported upload platform: ${platform}`)
      return postJson(`${apiBase}/upload-submissions/${encodeURIComponent(normalized)}/actual-published`, { ids })
    },
  }
}
