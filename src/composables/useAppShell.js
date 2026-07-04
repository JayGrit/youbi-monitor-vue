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
  loadServerStatus,
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
  let serverTimer = null
  let taskTypesPromise = null
  let taskTypesLoaded = false
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

  function clearServerPolling() {
    if (serverTimer) window.clearInterval(serverTimer)
    serverTimer = null
  }

  function startServerPolling() {
    clearServerPolling()
    loadServerStatus()
    serverTimer = window.setInterval(loadServerStatus, 30000)
  }

  function ensureTaskTypesLoaded() {
    if (taskTypesLoaded || taskTypesPromise) return
    taskTypesPromise = Promise.resolve(loadTaskTypes())
      .then(loaded => {
        taskTypesLoaded = loaded !== false
      })
      .finally(() => {
        taskTypesPromise = null
      })
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

    if (visible && !inFlow && page === 'server') startServerPolling()
    else clearServerPolling()

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
    if (page === 'monitor') ensureTaskTypesLoaded()
    if (page === 'accounts') warmPlatformIcons()
    if (page === 'failure-logs') {
      loadFailureLogs()
    }
    if (page === 'static-assets') {
      loadStaticAssets()
    }
    if (page === 'server') {
      loadServerStatus()
    }
  }

  onMounted(() => {
    warmPlatformIcons()
    if (activePage.value === 'monitor') ensureTaskTypesLoaded()
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
    clearServerPolling()
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
