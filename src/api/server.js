import { postJson, requestJson } from './http'

export function createServerApi(apiBase) {
  return {
    backupperStatus() {
      return requestJson(`${apiBase}/backupper-status`)
    },
    clearBuildCache() {
      return postJson(`${apiBase}/build-cache/clear`, {})
    },
    clearDiagnostics() {
      return postJson(`${apiBase}/diagnostics/clear`, {})
    },
  }
}
