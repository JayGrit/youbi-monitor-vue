import { postJson, requestJson } from './http'

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
      return requestJson(`${base}/queue${queryString(params)}`, undefined, describe('查询Operator执行队列'))
    },
    deleteQueueTasks(tasks) {
      return postJson(`${base}/queue/delete`, { tasks }, describe('删除未开始的 Operator 任务'))
    },
    updateQueuePriorities(tasks) {
      return postJson(`${base}/queue/priority`, { tasks }, describe('调整 Operator 任务优先级'))
    },
    listTasks(params) {
      return requestJson(`${base}/tasks${queryString(params)}`, undefined, describe('查询Operator任务列表'))
    },
    getTask(opId) {
      return requestJson(`${base}/tasks/${encodeURIComponent(opId)}`, undefined, describe('查询Operator任务详情'))
    },
    getDiagnostics(opId) {
      return requestJson(`${base}/tasks/${encodeURIComponent(opId)}/diagnostics`, undefined, describe('查询Operator诊断详情'))
    },
  }
}
