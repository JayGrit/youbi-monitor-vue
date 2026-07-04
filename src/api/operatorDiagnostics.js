import { requestJson } from './http'

export function createOperatorDiagnosticsApi(apiBase, service = 'monitor') {
  const base = `${apiBase}/operator`
  const context = { service }
  const describe = summary => ({ ...context, summary })

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
      return requestJson(`${base}/queue${queryString(params)}`, undefined, describe('加载执行队列'))
    },
    listTasks(params) {
      return requestJson(`${base}/tasks${queryString(params)}`, undefined, describe('加载执行任务'))
    },
    getTask(opId) {
      return requestJson(`${base}/tasks/${encodeURIComponent(opId)}`, undefined, describe('加载执行详情'))
    },
    getDiagnostics(opId, params) {
      return requestJson(`${base}/tasks/${encodeURIComponent(opId)}/diagnostics${queryString(params)}`, undefined, describe('加载诊断详情'))
    },
  }
}
