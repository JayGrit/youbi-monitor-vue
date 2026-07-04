import { requestJson } from './http'

export function createOperatorDiagnosticsApi(apiBase, service = 'monitor') {
  const base = `${apiBase}/operator`
  const context = { service }

  function queryString(params) {
    const search = new URLSearchParams()
    Object.entries(params || {}).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        value.filter(Boolean).forEach(item => search.append(key, item))
      } else if (value !== undefined && value !== null && String(value).trim() !== '') {
        search.set(key, String(value).trim())
      }
    })
    const text = search.toString()
    return text ? `?${text}` : ''
  }

  return {
    listQueue(params) {
      return requestJson(`${base}/queue${queryString(params)}`, undefined, context)
    },
    listTasks(params) {
      return requestJson(`${base}/tasks${queryString(params)}`, undefined, context)
    },
    getTask(opId) {
      return requestJson(`${base}/tasks/${encodeURIComponent(opId)}`, undefined, context)
    },
    getDiagnostics(opId, params) {
      return requestJson(`${base}/tasks/${encodeURIComponent(opId)}/diagnostics${queryString(params)}`, undefined, context)
    },
  }
}
