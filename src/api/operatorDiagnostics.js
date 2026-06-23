import { requestJson } from './http'

export function createOperatorDiagnosticsApi(apiBase) {
  const base = `${apiBase}/operator`

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
    listTasks(params) {
      return requestJson(`${base}/tasks${queryString(params)}`)
    },
    getTask(opId) {
      return requestJson(`${base}/tasks/${encodeURIComponent(opId)}`)
    },
    getDiagnostics(opId, params) {
      return requestJson(`${base}/tasks/${encodeURIComponent(opId)}/diagnostics${queryString(params)}`)
    },
  }
}
