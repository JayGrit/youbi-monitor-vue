import { postJson, requestJson } from './http'

export function createServerApi(apiBase, service = 'backupper') {
  const context = { service }

  return {
    backupperStatus() {
      return requestJson(`${apiBase}/backupper-status`, undefined, context)
    },
    clearBuildCache() {
      return postJson(`${apiBase}/build-cache/clear`, {}, context)
    },
    clearDiagnostics() {
      return postJson(`${apiBase}/diagnostics/clear`, {}, context)
    },
  }
}
