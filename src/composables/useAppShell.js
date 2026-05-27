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
  clearAccountPolling,
  clearFlowPolling,
  clearSubmitterPolling,
  submitterThumbUrls,
  revokeCachedUrls,
}) {
  const activePage = ref('monitor')
  let monitorTimer = null

  function openPage(page) {
    if (flowPageOpen.value) {
      closeTaskFlow()
    }
    activePage.value = page
    clearAccountPagePolling()
    if (page === 'submitter') {
      loadSubmitterAuthors()
      loadSubmitterVideos()
    }
    if (page === 'accounts') {
      warmPlatformIcons()
      startAccountPolling()
    }
  }

  onMounted(() => {
    warmPlatformIcons()
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
