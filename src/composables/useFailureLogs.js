import { computed, ref } from 'vue'
import { parseLocalDateTime } from '../utils/format'
import { normalizeUploadPlatform } from '../utils/uploadPlatform'

export function useFailureLogs(failureLogsApi, distributorApi) {
  const rows = ref([])
  const loading = ref(false)
  const error = ref('')
  const actionError = ref('')
  const actionBusyId = ref('')
  const actionBusy = ref(false)
  const loadedAt = ref('')
  const stageFilter = ref('all')
  const topicFilter = ref('all')
  const timeFilter = ref('all')
  const platformFilter = ref([])
  const selectedIds = ref([])

  const stageOptions = computed(() => uniqueOptions(rows.value.map(row => row.stage)))
  const topicOptions = computed(() => uniqueOptions(rows.value.map(row => row.topic)))
  const platformOptions = computed(() => uniqueOptions(rows.value.map(row => row.platform)))

  const filteredRows = computed(() => rows.value
    .filter(row => {
      if (stageFilter.value !== 'all' && row.stage !== stageFilter.value) return false
      if (topicFilter.value !== 'all' && row.topic !== topicFilter.value) return false
      if (timeFilter.value !== 'all' && failureTimeGroup(row.failedAt) !== timeFilter.value) return false
      if (platformFilter.value.length > 0 && !platformFilter.value.includes(row.platform)) return false
      return true
    })
    .sort((left, right) => errorLength(left) - errorLength(right)))
  const selectedSet = computed(() => new Set(selectedIds.value))
  const selectableRows = computed(() => filteredRows.value.filter(row => canRetryUpload(row) || canMarkActualPublished(row) || canAbandonUpload(row) || canDeferTask(row)))
  const allSelected = computed(() => {
    const rows = selectableRows.value
    return rows.length > 0 && rows.every(row => selectedSet.value.has(row.id))
  })
  const selectedRows = computed(() => {
    const selected = selectedSet.value
    return rows.value.filter(row => selected.has(row.id))
  })
  const actualPublishedSelectedRows = computed(() => selectedRows.value.filter(canMarkActualPublished))
  const retryUploadSelectedRows = computed(() => selectedRows.value.filter(canRetryUpload))
  const abandonUploadSelectedRows = computed(() => selectedRows.value.filter(canAbandonUpload))
  const deferSelectedRows = computed(() => selectedRows.value.filter(canDeferTask))

  async function loadFailureLogs() {
    loading.value = true
    error.value = ''
    try {
      const payload = await failureLogsApi.loadFailureLogs()
      rows.value = Array.isArray(payload?.rows) ? payload.rows : []
      loadedAt.value = payload?.loadedAt || ''
      normalizeFilters()
      normalizeSelection()
    } catch (err) {
      error.value = err instanceof Error ? err.message : String(err)
    } finally {
      loading.value = false
    }
  }

  async function markActualPublished(row) {
    if (!row?.id || row.stage !== 'uploader' || !row.platform) return false
    if (!window.confirm(`确认 ${row.platform} 已实际发布？此操作会同步修复上传子任务和父任务状态。`)) {
      return false
    }
    actionBusyId.value = row.id
    actionError.value = ''
    try {
      const target = parseUploadLogId(row.id)
      await distributorApi.markUploadSubmissionsActualPublished(target.platform, [target.id])
      await loadFailureLogs()
      return true
    } catch (err) {
      actionError.value = err instanceof Error ? err.message : String(err)
      return false
    } finally {
      actionBusyId.value = ''
    }
  }

  async function markSelectedActualPublished() {
    const targets = actualPublishedSelectedRows.value
    if (targets.length === 0 || actionBusy.value) return
    if (!window.confirm(`确认选中的 ${targets.length} 个上传任务已实际发布？此操作会同步修复上传子任务和父任务状态。`)) {
      return
    }
    actionBusy.value = true
    actionError.value = ''
    try {
      const groups = groupedUploadTargets(targets)
      for (const [platform, ids] of groups.entries()) {
        await distributorApi.markUploadSubmissionsActualPublished(platform, ids)
      }
      selectedIds.value = selectedIds.value.filter(id => !targets.some(row => row.id === id))
      await loadFailureLogs()
    } catch (err) {
      actionError.value = err instanceof Error ? err.message : String(err)
    } finally {
      actionBusy.value = false
      actionBusyId.value = ''
    }
  }

  async function retrySelectedUploads() {
    const targets = retryUploadSelectedRows.value
    if (targets.length === 0 || actionBusy.value) return
    if (!window.confirm(`确认重试选中的 ${targets.length} 个上传任务？`)) {
      return
    }
    actionBusy.value = true
    actionError.value = ''
    try {
      const groups = groupedUploadTargets(targets)
      for (const [platform, ids] of groups.entries()) {
        await distributorApi.retryUploadSubmissions(platform, ids)
      }
      selectedIds.value = selectedIds.value.filter(id => !targets.some(row => row.id === id))
      await loadFailureLogs()
    } catch (err) {
      actionError.value = err instanceof Error ? err.message : String(err)
    } finally {
      actionBusy.value = false
    }
  }

  async function abandonSelectedUploads() {
    const targets = abandonUploadSelectedRows.value
    if (targets.length === 0 || actionBusy.value) return
    if (!window.confirm(`确认放弃选中的 ${targets.length} 个平台发布？\n\n此操作只会把选中的上传平台标记为已放弃，不删除任务，也不影响同一任务的其他平台。`)) {
      return
    }
    actionBusy.value = true
    actionError.value = ''
    try {
      const groups = groupedUploadTargets(targets)
      for (const [platform, ids] of groups.entries()) {
        await distributorApi.abandonUploadSubmissions(platform, ids)
      }
      selectedIds.value = selectedIds.value.filter(id => !targets.some(row => row.id === id))
      await loadFailureLogs()
    } catch (err) {
      actionError.value = err instanceof Error ? err.message : String(err)
    } finally {
      actionBusy.value = false
    }
  }

  async function deferSelectedTasks() {
    const targets = deferSelectedRows.value
    if (targets.length === 0 || actionBusy.value) return
    const taskIds = [...new Set(targets.map(row => String(row.taskId || '').trim()).filter(Boolean))]
    if (taskIds.length === 0) return
    if (!window.confirm(`确认稍后执行选中的 ${taskIds.length} 个任务？\n\n这会删除任务数据库记录和 MinIO 文件，并把原 submission 恢复为可拉取。`)) {
      return
    }
    actionBusy.value = true
    actionError.value = ''
    try {
      await distributorApi.deferTasks(taskIds)
      selectedIds.value = selectedIds.value.filter(id => !targets.some(row => row.id === id))
      await loadFailureLogs()
    } catch (err) {
      actionError.value = err instanceof Error ? err.message : String(err)
    } finally {
      actionBusy.value = false
    }
  }

  function toggleRow(row) {
    if (!row?.id || (!canRetryUpload(row) && !canMarkActualPublished(row) && !canAbandonUpload(row) && !canDeferTask(row))) return
    const selected = selectedSet.value
    selectedIds.value = selected.has(row.id)
      ? selectedIds.value.filter(id => id !== row.id)
      : [...selectedIds.value, row.id]
  }

  function toggleAll() {
    if (allSelected.value) {
      selectedIds.value = selectedIds.value.filter(id => !selectableRows.value.some(row => row.id === id))
      return
    }
    selectedIds.value = [...new Set([...selectedIds.value, ...selectableRows.value.map(row => row.id)])]
  }

  function clearSelection() {
    selectedIds.value = []
  }

  function resetFilters() {
    stageFilter.value = 'all'
    topicFilter.value = 'all'
    timeFilter.value = 'all'
    platformFilter.value = []
    selectedIds.value = []
  }

  function normalizeFilters() {
    if (!stageOptions.value.includes(stageFilter.value)) stageFilter.value = 'all'
    if (!topicOptions.value.includes(topicFilter.value)) topicFilter.value = 'all'
    platformFilter.value = platformFilter.value.filter(platform => platformOptions.value.includes(platform))
  }

  function normalizeSelection() {
    const validIds = new Set(rows.value.filter(row => canRetryUpload(row) || canMarkActualPublished(row) || canAbandonUpload(row) || canDeferTask(row)).map(row => row.id))
    selectedIds.value = selectedIds.value.filter(id => validIds.has(id))
  }

  return {
    rows,
    loading,
    error,
    actionError,
    actionBusyId,
    actionBusy,
    loadedAt,
    stageFilter,
    topicFilter,
    timeFilter,
    platformFilter,
    stageOptions,
    topicOptions,
    platformOptions,
    filteredRows,
    selectedIds,
    selectedSet,
    selectableRows,
    allSelected,
    actualPublishedSelectedRows,
    retryUploadSelectedRows,
    abandonUploadSelectedRows,
    deferSelectedRows,
    loadFailureLogs,
    markActualPublished,
    markSelectedActualPublished,
    retrySelectedUploads,
    abandonSelectedUploads,
    deferSelectedTasks,
    toggleRow,
    toggleAll,
    clearSelection,
    resetFilters,
  }
}

function canMarkActualPublished(row) {
  return row?.stage === 'uploader' && Boolean(row.platform) && Boolean(parseUploadLogId(row.id))
}

function canRetryUpload(row) {
  return canMarkActualPublished(row)
}

function canAbandonUpload(row) {
  return canMarkActualPublished(row)
}

function canDeferTask(row) {
  return Boolean(row?.taskId)
}

function parseUploadLogId(logId) {
  const parts = String(logId || '').split(':')
  if (parts.length !== 3 || parts[0] !== 'uploader' || !parts[1]) return null
  const id = Number(parts[2])
  if (!Number.isSafeInteger(id) || id <= 0) return null
  const platform = normalizeUploadPlatform(parts[1])
  if (!platform) return null
  return { platform, id }
}

function groupedUploadTargets(rows) {
  const groups = new Map()
  for (const row of rows) {
    const uploadTarget = parseUploadLogId(row.id)
    if (!uploadTarget) continue
    groups.set(uploadTarget.platform, [...(groups.get(uploadTarget.platform) || []), uploadTarget.id])
  }
  return groups
}

function errorLength(row) {
  return String(row?.errorMessage || '').length
}

function uniqueOptions(values) {
  return [...new Set(values.map(value => String(value || '').trim()).filter(Boolean))]
    .sort((left, right) => left.localeCompare(right, 'zh-CN'))
}

function failureTimeGroup(value) {
  const date = parseLocalDateTime(value)
  if (!date) return 'before'
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const days = Math.round((today.getTime() - target.getTime()) / 86400000)
  if (days <= 0) return 'today'
  if (days === 1) return 'yesterday'
  return 'before'
}
