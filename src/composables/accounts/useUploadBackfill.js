import { computed, ref } from 'vue'

export function useUploadBackfill(accountsApi, loadAccountPage) {
  const uploadBackfillOpen = ref(false)
  const uploadBackfillContext = ref(null)
  const uploadBackfillRows = ref([])
  const uploadBackfillLoading = ref(false)
  const uploadBackfillBusy = ref(false)
  const uploadBackfillSelectedIds = ref([])
  const uploadBackfillError = ref('')

  const uploadBackfillSelectedSet = computed(() => new Set(uploadBackfillSelectedIds.value))

  const uploadBackfillSelectableRows = computed(() => uploadBackfillRows.value.filter(row => row.selectable))

  const uploadBackfillAllSelected = computed(() => {
    const rows = uploadBackfillSelectableRows.value
    return rows.length > 0 && rows.every(row => uploadBackfillSelectedSet.value.has(row.taskId))
  })

  async function openUploadBackfill(platform, platformLabel, topic) {
    const normalizedTopic = String(topic || '').trim()
    if (!platform || !normalizedTopic) return
    uploadBackfillContext.value = {
      platform,
      platformLabel: platformLabel || platform,
      topic: normalizedTopic,
    }
    uploadBackfillOpen.value = true
    uploadBackfillSelectedIds.value = []
    await loadUploadBackfillCandidates()
  }

  function closeUploadBackfill() {
    uploadBackfillOpen.value = false
    uploadBackfillContext.value = null
    uploadBackfillRows.value = []
    uploadBackfillSelectedIds.value = []
    uploadBackfillError.value = ''
  }

  async function loadUploadBackfillCandidates() {
    const context = uploadBackfillContext.value
    if (!context || uploadBackfillLoading.value) return
    uploadBackfillLoading.value = true
    try {
      const payload = await accountsApi.uploadBackfillCandidates(context.platform, context.topic)
      uploadBackfillRows.value = payload.rows || []
      uploadBackfillSelectedIds.value = uploadBackfillSelectedIds.value.filter(id => {
        return uploadBackfillRows.value.some(row => row.taskId === id && row.selectable)
      })
      uploadBackfillError.value = ''
    } catch (err) {
      uploadBackfillError.value = err instanceof Error ? err.message : String(err)
    } finally {
      uploadBackfillLoading.value = false
    }
  }

  function toggleUploadBackfillRow(row) {
    if (!row?.taskId || !row.selectable) return
    const selected = uploadBackfillSelectedSet.value
    uploadBackfillSelectedIds.value = selected.has(row.taskId)
      ? uploadBackfillSelectedIds.value.filter(id => id !== row.taskId)
      : [...uploadBackfillSelectedIds.value, row.taskId]
  }

  function toggleUploadBackfillAll() {
    if (uploadBackfillAllSelected.value) {
      uploadBackfillSelectedIds.value = []
      return
    }
    uploadBackfillSelectedIds.value = uploadBackfillSelectableRows.value.map(row => row.taskId)
  }

  async function registerSelectedUploadBackfill() {
    const context = uploadBackfillContext.value
    if (!context || uploadBackfillSelectedIds.value.length === 0 || uploadBackfillBusy.value) return
    const confirmed = window.confirm(`确认注册 ${uploadBackfillSelectedIds.value.length} 个历史视频到 ${context.platformLabel}/${context.topic}？`)
    if (!confirmed) return
    uploadBackfillBusy.value = true
    try {
      await accountsApi.registerUploadBackfill(
        context.platform,
        context.topic,
        [...uploadBackfillSelectedIds.value],
      )
      uploadBackfillSelectedIds.value = []
      await Promise.allSettled([loadUploadBackfillCandidates(), loadAccountPage()])
      uploadBackfillError.value = ''
    } catch (err) {
      uploadBackfillError.value = err instanceof Error ? err.message : String(err)
    } finally {
      uploadBackfillBusy.value = false
    }
  }

  return {
    uploadBackfillOpen,
    uploadBackfillContext,
    uploadBackfillRows,
    uploadBackfillLoading,
    uploadBackfillBusy,
    uploadBackfillSelectedIds,
    uploadBackfillSelectedSet,
    uploadBackfillAllSelected,
    uploadBackfillError,
    openUploadBackfill,
    closeUploadBackfill,
    loadUploadBackfillCandidates,
    toggleUploadBackfillRow,
    toggleUploadBackfillAll,
    registerSelectedUploadBackfill,
  }
}
