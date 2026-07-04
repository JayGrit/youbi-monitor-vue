import { postJson, requestJson } from './http'

export function createServerApi(apiBase, service = 'backupper') {
  const context = { service }
  const describe = summary => ({ ...context, summary })

  return {
    backupperStatus() {
      return requestJson(`${apiBase}/backupper-status`, undefined, describe('加载备份状态'))
    },
    clearBuildCache() {
      return postJson(`${apiBase}/build-cache/clear`, {}, describe('清理构建缓存'))
    },
    clearDiagnostics() {
      return postJson(`${apiBase}/diagnostics/clear`, {}, describe('清理诊断文件'))
    },
  }
}
