import { requestJson } from './http'

export function createFailureLogsApi(apiBase, service = 'monitor') {
  const context = { service }

  return {
    loadFailureLogs() {
      return requestJson(`${apiBase}/failure-logs`, undefined, context)
    },
  }
}
