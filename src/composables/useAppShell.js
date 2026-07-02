import { onMounted, onUnmounted, ref, watch } from 'vue'

export function useAppShell({
  flowPageOpen,
  closeTaskFlow,
  loadSubmitterAuthors,
  loadSubmitterVideos,
  warmPlatformIcons,
  startAccountPolling,
  loadTasks,
  loadServiceHeartbeats,
  loadTaskTypes,
  loadFailureLogs,
  loadStaticAssets,
  clearAccountPolling,
  clearFlowPolling,
  clearSubmitterPolling,
  resumeSubmitterPolling,
  setTaskProgressPollingActive,
  setFlowPollingActive,
  submitterThumbUrls,
  revokeCachedUrls,
}) {
  const activePage = ref(initialPage())
  let monitorTimer = null
  let heartbeatTimer = null
  const pageVisible = ref(typeof document === 'undefined' || document.visibilityState === 'visible')

  function clearMonitorPolling() {
    if (monitorTimer) window.clearInterval(monitorTimer)
    if (heartbeatTimer) window.clearInterval(heartbeatTimer)
    monitorTimer = null
    heartbeatTimer = null
  }

  function startMonitorPolling() {
    clearMonitorPolling()
    loadTasks()
    loadServiceHeartbeats()
    monitorTimer = window.setInterval(loadTasks, 2000)
    heartbeatTimer = window.setInterval(loadServiceHeartbeats, 30000)
  }

  function syncPolling() {
    const visible = pageVisible.value
    const page = activePage.value
    const inFlow = flowPageOpen.value

    if (visible && !inFlow && page === 'monitor') startMonitorPolling()
    else clearMonitorPolling()
    setTaskProgressPollingActive(visible && !inFlow && page === 'monitor')

    if (visible && !inFlow && page === 'accounts') startAccountPolling()
    else clearAccountPolling()

    if (visible && !inFlow && page === 'submitter') resumeSubmitterPolling()
    else clearSubmitterPolling()
    setFlowPollingActive(visible && inFlow)
  }

  function handleVisibilityChange() {
    pageVisible.value = document.visibilityState === 'visible'
  }

  function openPage(page) {
    activePage.value = page
    if (flowPageOpen.value) {
      closeTaskFlow()
    }
    if (page === 'submitter' || page === 'submitter-authors') {
      loadSubmitterAuthors()
      if (page === 'submitter') {
        loadSubmitterVideos()
      }
    }
    if (page === 'accounts') warmPlatformIcons()
    if (page === 'failure-logs') {
      loadFailureLogs()
    }
    if (page === 'static-assets') {
      loadStaticAssets()
    }
  }

  onMounted(() => {
    warmPlatformIcons()
    loadTaskTypes()
    if (activePage.value === 'static-assets') {
      loadStaticAssets()
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    syncPolling()
  })

  watch([activePage, flowPageOpen, pageVisible], syncPolling, { flush: 'sync' })

  onUnmounted(() => {
    document.removeEventListener('visibilitychange', handleVisibilityChange)
    clearMonitorPolling()
    clearAccountPolling()
    clearFlowPolling()
    clearSubmitterPolling()
    revokeCachedUrls(submitterThumbUrls.value)
  })

  return {
    activePage,
    openPage,
  }
}

function initialPage() {
  if (typeof window === 'undefined') return 'accounts'
  const page = new URLSearchParams(window.location.search).get('page')
  if (page === 'operator-diagnostics') return 'accounts'
  return page || 'accounts'
}
