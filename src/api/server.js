import { postJson, requestJson } from './http'

export function createServerApi(apiBase, service = 'backupper') {
  const context = { service }
  const describe = summary => ({ ...context, summary })

  return {
    backupperStatus() {
      return requestJson(`${apiBase}/backupper-status`, undefined, describe('查询服务器备份磁盘状态'))
    },
    refreshBackupperStatus() {
      return postJson(`${apiBase}/backupper-status/refresh`, {}, describe('重新统计服务器备份磁盘状态'))
    },
    runMinioCleanup() {
      return postJson(`${apiBase}/minio-cleanup/run`, {}, describe('手动执行 MinIO 回收任务'))
    },
    generateUploadIncompleteReport() {
      return postJson(`${apiBase}/reports/upload-incomplete`, {}, describe('生成上传未完成 MinIO 报表'))
    },
    clearBuildCache() {
      return postJson(`${apiBase}/build-cache/clear`, {}, describe('清理服务器构建缓存'))
    },
    clearMysqlBinlog() {
      return postJson(`${apiBase}/mysql-binlog/clear`, {}, describe('清理服务器 MySQL binlog'))
    },
    clearDiagnostics() {
      return postJson(`${apiBase}/diagnostics/clear`, {}, describe('清理 success 任务诊断截图和 HTML'))
    },
  }
}
