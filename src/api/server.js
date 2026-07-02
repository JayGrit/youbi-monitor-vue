import { postJson, requestJson } from './http'

export function createServerApi(apiBase) {
  return {
    backupperStatus() {
      return requestJson(`${apiBase}/server/backupper-status`)
    },
    clearBuildCache() {
      return postJson(`${apiBase}/server/build-cache/clear`, {})
    },
    clearDiagnostics() {
      return postJson(`${apiBase}/server/diagnostics/clear`, {})
    },
  }
}
