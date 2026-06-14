import { onMounted, onUnmounted, ref } from 'vue'

export function useAppShell({
  flowPageOpen,
  closeTaskFlow,
  clearAccountPagePolling,
  loadSubmitterAuthors,
  loadSubmitterVideos,
  warmPlatformIcons,
  startAccountPolling,
  loadTasks,
  loadTaskTypes,
  loadFailureLogs,
  clearAccountPolling,
  clearFlowPolling,
  clearSubmitterPolling,
  submitterThumbUrls,
  revokeCachedUrls,
}) {
  const activePage = ref('accounts')
  let monitorTimer = null

  function openPage(page) {
    if (flowPageOpen.value) {
      closeTaskFlow()
    }
    activePage.value = page
    clearAccountPagePolling()
    if (page === 'submitter' || page === 'submitter-authors') {
      loadSubmitterAuthors()
      if (page === 'submitter') {
        loadSubmitterVideos()
      }
    }
    if (page === 'accounts') {
      warmPlatformIcons()
      startAccountPolling()
    }
    if (page === 'failure-logs') {
      loadFailureLogs()
    }
  }

  onMounted(() => {
    warmPlatformIcons()
    startAccountPolling()
    loadTaskTypes()
    loadTasks()
    monitorTimer = window.setInterval(loadTasks, 2000)
  })

  onUnmounted(() => {
    if (monitorTimer) {
      window.clearInterval(monitorTimer)
    }
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
