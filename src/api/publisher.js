import { requestJson } from './http'

export function createPublisherApi(apiBase, service = 'monitor') {
  const context = { service }
  const describe = summary => ({ ...context, summary })

  return {
    submitNarrationSegments(taskId, response) {
      return requestJson(`${apiBase}/video-tasks/${encodeURIComponent(taskId)}/publisher/narration/segments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response }),
      }, describe('提交解说分段'))
    },

    uploadNarrationImage(taskId, kind, file) {
      const form = new FormData()
      form.append('file', file)
      return requestJson(`${apiBase}/video-tasks/${encodeURIComponent(taskId)}/publisher/narration/images/${encodeURIComponent(kind)}`, {
        method: 'POST',
        body: form,
      }, describe('上传解说图片'))
    },
  }
}
