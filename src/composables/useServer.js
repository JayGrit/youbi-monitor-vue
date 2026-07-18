import { ref } from 'vue'

export function useServer(serverApi) {
  const backupperDiskStatus = ref(null)
  const backupperDiskStatusText = ref('')
  const loading = ref(false)
  const error = ref('')
  const actionBusy = ref('')
  const actionMessage = ref('')
  const uploadIncompleteReport = ref(null)
  const uploadIncompleteReportError = ref('')

  async function loadServerStatus() {
    loading.value = true
    error.value = ''
    try {
      const status = await serverApi.backupperStatus()
      applyServerStatus(status)
    } catch (err) {
      error.value = err?.message || String(err)
    } finally {
      loading.value = false
    }
  }

  async function refreshServerStatus() {
    actionBusy.value = 'refresh-status'
    actionMessage.value = ''
    error.value = ''
    try {
      const status = await serverApi.refreshBackupperStatus()
      applyServerStatus(status)
      const statTime = formatServerStatTime(status?.createdAt)
      actionMessage.value = statTime
        ? `服务器硬盘统计已更新：${statTime}`
        : (status?.message || '服务器硬盘统计已更新')
    } catch (err) {
      error.value = err?.message || String(err)
    } finally {
      actionBusy.value = ''
    }
  }

  function applyServerStatus(status) {
    backupperDiskStatus.value = status || null
    backupperDiskStatusText.value = status?.components?.disk?.payload?.statusText || status?.statusText || ''
  }

  function formatServerStatTime(value) {
    if (!value) return ''
    const match = String(value).match(/(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2})/)
    if (match) return `${match[1]}-${match[2]}-${match[3]} ${match[4]}:${match[5]}`
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return ''
    return new Intl.DateTimeFormat('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(date).replace(/\//g, '-')
  }

  async function runServerAction(action, confirmText) {
    if (!window.confirm(confirmText)) return
    actionBusy.value = action
    actionMessage.value = ''
    error.value = ''
    try {
      const actions = {
        'minio-cleanup': serverApi.runMinioCleanup,
        'build-cache': serverApi.clearBuildCache,
        'mysql-binlog': serverApi.clearMysqlBinlog,
        diagnostics: serverApi.clearDiagnostics,
      }
      const payload = await actions[action]()
      actionMessage.value = payload?.message || '操作完成'
      if (payload?.status) applyServerStatus(payload.status)
      await loadServerStatus()
    } catch (err) {
      error.value = err?.message || String(err)
    } finally {
      actionBusy.value = ''
    }
  }

  function clearBuildCache() {
    return runServerAction('build-cache', '确认清空服务器 Docker 构建缓存？')
  }

  function runMinioCleanup() {
    return runServerAction('minio-cleanup', '确认手动执行一次 MinIO 回收任务？')
  }

  function clearMysqlBinlog() {
    return runServerAction('mysql-binlog', '确认清理 MySQL binlog？')
  }

  function clearDiagnostics() {
    return runServerAction('diagnostics', '确认删除 success 任务的诊断截图和 HTML？')
  }

  async function generateUploadIncompleteReport() {
    actionBusy.value = 'upload-incomplete-report'
    actionMessage.value = ''
    uploadIncompleteReportError.value = ''
    error.value = ''
    try {
      uploadIncompleteReport.value = await serverApi.generateUploadIncompleteReport()
      actionMessage.value = uploadIncompleteReport.value?.message || '上传未完成报表已拉取'
    } catch (err) {
      uploadIncompleteReportError.value = err?.message || String(err)
    } finally {
      actionBusy.value = ''
    }
  }

  return {
    backupperDiskStatus,
    backupperDiskStatusText,
    loading,
    error,
    actionBusy,
    actionMessage,
    uploadIncompleteReport,
    uploadIncompleteReportError,
    loadServerStatus,
    refreshServerStatus,
    runMinioCleanup,
    clearBuildCache,
    clearMysqlBinlog,
    clearDiagnostics,
    generateUploadIncompleteReport,
  }
}
