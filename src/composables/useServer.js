import { ref } from 'vue'

export function useServer(serverApi) {
  const backupperDiskStatus = ref(null)
  const backupperDiskStatusText = ref('')
  const loading = ref(false)
  const error = ref('')
  const actionBusy = ref('')
  const actionMessage = ref('')

  async function loadServerStatus() {
    loading.value = true
    error.value = ''
    try {
      const status = await serverApi.backupperStatus()
      backupperDiskStatus.value = status || null
      backupperDiskStatusText.value = status?.statusText || ''
    } catch (err) {
      error.value = err?.message || String(err)
    } finally {
      loading.value = false
    }
  }

  async function runServerAction(action, confirmText) {
    if (!window.confirm(confirmText)) return
    actionBusy.value = action
    actionMessage.value = ''
    error.value = ''
    try {
      const actions = {
        'build-cache': serverApi.clearBuildCache,
        'mysql-binlog': serverApi.clearMysqlBinlog,
        diagnostics: serverApi.clearDiagnostics,
      }
      const payload = await actions[action]()
      actionMessage.value = payload?.message || '操作完成'
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

  function clearMysqlBinlog() {
    return runServerAction('mysql-binlog', '确认清理 MySQL binlog？')
  }

  function clearDiagnostics() {
    return runServerAction('diagnostics', '确认删除 success 任务的诊断截图和 HTML？')
  }

  return {
    backupperDiskStatus,
    backupperDiskStatusText,
    loading,
    error,
    actionBusy,
    actionMessage,
    loadServerStatus,
    clearBuildCache,
    clearMysqlBinlog,
    clearDiagnostics,
  }
}
