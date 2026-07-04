import { requestJson } from './http'

export function createStaticAssetsApi(apiBase, service = 'monitor') {
  const context = { service }
  const describe = summary => ({ ...context, summary })

  return {
    listStaticAssets({ type, taskId, scope, keyword, limit, offset } = {}) {
      const params = new URLSearchParams()
      if (type) params.set('type', type)
      if (taskId) params.set('taskId', taskId)
      if (scope && scope !== 'all') params.set('scope', scope)
      if (keyword) params.set('keyword', keyword)
      if (limit !== undefined && limit !== null) params.set('limit', String(limit))
      if (offset !== undefined && offset !== null) params.set('offset', String(offset))
      const query = params.toString()
      return requestJson(`${apiBase}/assets${query ? `?${query}` : ''}`, undefined, describe('加载素材列表'))
    },

    getStaticAsset(id) {
      return requestJson(`${apiBase}/assets/${encodeURIComponent(id)}`, undefined, describe('加载素材详情'))
    },

    createStaticTextAsset({ taskId, type, content, remark }) {
      return requestJson(`${apiBase}/assets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId, type, content, remark }),
      }, describe('创建文本素材'))
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
      }, describe('上传静态素材'))
    },
  }
}
