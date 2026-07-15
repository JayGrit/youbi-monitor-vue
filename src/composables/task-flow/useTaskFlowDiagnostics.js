import { computed, ref } from 'vue'

export function useTaskFlowDiagnostics({ taskFlowApi, canPoll, currentStageKey }) {
  const uploaderDiagnosticsByOpId = ref({})
  const uploaderDiagnosticsLoading = ref(false)
  const uploaderDiagnosticsLoadingTask = ref('')
  const uploaderDiagnosticsError = ref('')
  let uploaderDiagnosticsTimer = null
  let diagnosticsPollingRequested = false

  const uploaderDiagnostics = computed(() => {
    return Object.values(uploaderDiagnosticsByOpId.value).flat()
  })

  function resetDiagnosticsPolling() {
    diagnosticsPollingRequested = false
    clearUploaderDiagnosticsPolling()
  }

  function clearUploaderDiagnosticsPolling() {
    if (uploaderDiagnosticsTimer) {
      window.clearInterval(uploaderDiagnosticsTimer)
      uploaderDiagnosticsTimer = null
    }
  }

  async function loadUploaderDiagnostics(target, force = false) {
    const opId = operatorOpId(target)
    if (!opId || (!force && uploaderDiagnosticsByOpId.value[opId]) || uploaderDiagnosticsLoadingTask.value === opId) return
    uploaderDiagnosticsLoading.value = true
    uploaderDiagnosticsLoadingTask.value = opId
    uploaderDiagnosticsError.value = ''
    try {
      const response = await taskFlowApi.loadOperatorDiagnostics(opId)
      uploaderDiagnosticsByOpId.value = {
        ...uploaderDiagnosticsByOpId.value,
        [opId]: Array.isArray(response?.items) ? response.items : [],
      }
    } catch (err) {
      uploaderDiagnosticsError.value = err instanceof Error ? err.message : String(err)
    } finally {
      if (uploaderDiagnosticsLoadingTask.value === opId) {
        uploaderDiagnosticsLoading.value = false
        uploaderDiagnosticsLoadingTask.value = ''
      }
    }
  }

  function loadSelectedUploaderDiagnostics(target) {
    const opId = operatorOpId(target)
    if (opId) {
      diagnosticsPollingRequested = true
      loadUploaderDiagnostics(target, true)
      startUploaderDiagnosticsPolling()
    } else {
      uploaderDiagnosticsError.value = '缺少 operatorOpId'
    }
  }

  function startUploaderDiagnosticsPolling() {
    clearUploaderDiagnosticsPolling()
    if (!canPoll() || !diagnosticsPollingRequested) return
    if (!['uploader', 'publisher'].includes(currentStageKey())) return
    uploaderDiagnosticsTimer = window.setInterval(() => {
      Object.keys(uploaderDiagnosticsByOpId.value).forEach(opId => loadUploaderDiagnostics({ operatorOpId: opId }, true))
    }, 5000)
  }

  return {
    uploaderDiagnostics,
    uploaderDiagnosticsLoading,
    uploaderDiagnosticsError,
    resetDiagnosticsPolling,
    clearUploaderDiagnosticsPolling,
    loadSelectedUploaderDiagnostics,
    startUploaderDiagnosticsPolling,
  }
}

function operatorOpId(row) {
  return String(row?.operatorOpId || row?.operator_op_id || row?.opId || row?.op_id || row?.operator_run_id || '').trim()
}
