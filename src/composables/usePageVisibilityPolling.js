import { onMounted, onUnmounted, ref } from 'vue'

export function usePageVisibilityPolling(callback, shouldPoll, intervalMs = 10000) {
  const pageVisible = ref(typeof document === 'undefined' || document.visibilityState === 'visible')
  let pollTimer = null

  onMounted(() => {
    document.addEventListener('visibilitychange', handleVisibility)
  })

  onUnmounted(() => {
    stopPolling()
    document.removeEventListener('visibilitychange', handleVisibility)
  })

  function handleVisibility() {
    pageVisible.value = document.visibilityState === 'visible'
    syncPolling()
  }

  function syncPolling() {
    stopPolling()
    if (!pageVisible.value || !shouldPoll()) return
    pollTimer = window.setInterval(callback, intervalMs)
  }

  function stopPolling() {
    if (pollTimer) window.clearInterval(pollTimer)
    pollTimer = null
  }

  return {
    pageVisible,
    syncPolling,
    stopPolling,
  }
}
