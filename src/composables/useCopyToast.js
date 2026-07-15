import { onUnmounted, ref } from 'vue'

export function useCopyToast(timeoutMs = 1400) {
  const copyToastVisible = ref(false)
  let copyToastTimer = null

  async function copyText(text) {
    const value = String(text || '').trim()
    if (!value) return
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value)
      } else {
        copyTextFallback(value)
      }
      showCopyToast()
    } catch {
      copyTextFallback(value)
      showCopyToast()
    }
  }

  function copyTextFallback(text) {
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.setAttribute('readonly', '')
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.select()
    document.execCommand('copy')
    document.body.removeChild(textarea)
  }

  function showCopyToast() {
    copyToastVisible.value = true
    clearCopyToastTimer()
    copyToastTimer = window.setTimeout(() => {
      copyToastVisible.value = false
      copyToastTimer = null
    }, timeoutMs)
  }

  function clearCopyToastTimer() {
    if (copyToastTimer) window.clearTimeout(copyToastTimer)
    copyToastTimer = null
  }

  onUnmounted(clearCopyToastTimer)

  return {
    copyToastVisible,
    copyText,
    clearCopyToastTimer,
  }
}
