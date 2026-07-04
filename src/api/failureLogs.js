import { requestJson } from './http'

export function createFailureLogsApi(apiBase, service = 'monitor') {
  const context = { service }
  const describe = summary => ({ ...context, summary })

  return {
    loadFailureLogs() {
      return requestJson(`${apiBase}/failure-logs`, undefined, describe('查询流水线失败日志列表'))
    },
  }
}
