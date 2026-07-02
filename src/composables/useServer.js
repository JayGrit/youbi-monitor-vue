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
      const payload = action === 'build-cache'
        ? await serverApi.clearBuildCache()
        : await serverApi.clearDiagnostics()
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

  function clearDiagnostics() {
    return runServerAction('diagnostics', '确认清空 MinIO youbi-diagnostics 诊断日志？')
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
    clearDiagnostics,
  }
}
