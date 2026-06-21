import { computed, onUnmounted, ref, watch } from 'vue'
import {
  MONITOR_PAGE_SIZE,
  stageNameText,
  statusText,
  uploadPlatformText,
} from '../domain/constants'
import {
  formatDateTime,
  formatDuration,
} from '../utils/format'
import {
  isWatchUrl,
  youtubeThumbnailUrl,
} from '../utils/media'

export function useTasks(monitorApi, cacheImageUrl, brokenImageUrls) {
  const tasks = ref([])
  const serviceHeartbeats = ref([])
  const serverTime = ref('')
  const loading = ref(true)
  const error = ref('')
  const readyTaskId = ref('')
  const stopTaskId = ref('')
  const restartTaskId = ref('')
  const deleteTaskId = ref('')
  const taskStatusFilter = ref('all')
  const taskTypeFilter = ref('all')
  const taskStageFilter = ref('all')
  const taskIdFilter = ref('')
  const taskSort = ref('created_desc')
  const taskTypeFilters = ref([])
  const taskPage = ref(1)
  const taskTotalCount = ref(0)
  const taskActionsExpanded = ref(false)
  const openFailureKey = ref('')
  const taskThumbUrls = ref({})
  const uploadRetryPlatform = ref('')
  const uploadRetryRows = ref([])
  const uploadRetryLoading = ref(false)
  const uploadRetryBusy = ref(false)
  const uploadRetrySelectedIds = ref([])
  const downloaderFailuresOpen = ref(false)
  const downloaderFailureRows = ref([])
  const downloaderFailureLoading = ref(false)
  const downloaderFailureBusy = ref(false)
  const downloaderFailureSelectedIds = ref([])
  const downloaderFailureTypeFilter = ref('all')
  const progressByTaskId = ref({})
  const taskDetailsExpanded = ref(false)
  const taskProgressLoading = ref(false)
  const taskProgressError = ref('')
  let progressRefreshTimer = null
  let batchProgressRequest = null
  let progressPollingActive = false

  const taskStageFilters = computed(() => {
    const keys = new Set()
    for (const task of tasks.value) {
      if (task.status !== 'running') continue
      const key = String(task.currentStage || '').trim()
      if (key) keys.add(key)
    }
    return [...keys]
      .map(key => ({ key, label: stageName(key) }))
      .sort((left, right) => left.label.localeCompare(right.label))
  })

  const filteredTasks = computed(() => {
    return tasks.value.filter(task => {
      if (taskStatusFilter.value !== 'all' && task.status !== taskStatusFilter.value) return false
      if (taskTypeFilter.value !== 'all' && taskTypeText(task) !== taskTypeFilter.value) return false
      if (taskStageFilter.value !== 'all' && String(task.currentStage || '') !== taskStageFilter.value) return false
      if (taskIdFilter.value && !String(task.taskId || '').includes(taskIdFilter.value.trim())) return false
      return true
    })
  })

  const hasTaskFilter = computed(() => {
    return taskStatusFilter.value !== 'all'
      || taskTypeFilter.value !== 'all'
      || taskStageFilter.value !== 'all'
      || Boolean(taskIdFilter.value.trim())
  })

  const taskPageCount = computed(() => {
    return Math.max(1, Math.ceil(taskTotalCount.value / MONITOR_PAGE_SIZE))
  })

  const pagedTasks = computed(() => {
    return filteredTasks.value
  })

  const onlineSummary = computed(() => {
    let online = 0
    let total = 0
    for (const service of serviceHeartbeats.value) {
      for (const device of service.devices || []) {
        total += 1
        if (device.online) online += 1
      }
    }
    return { online, total }
  })

  const uploadRetryPlatformOptions = computed(() => {
    return Object.entries(uploadPlatformText).map(([value, label]) => ({ value, label }))
  })

  const uploadRetrySelectedSet = computed(() => new Set(uploadRetrySelectedIds.value))

  const uploadRetrySelectableRows = computed(() => {
    return uploadRetryRows.value.filter(row => !row.retryBlockedReason)
  })

  const uploadRetryAllSelected = computed(() => {
    const rows = uploadRetrySelectableRows.value
    return rows.length > 0 && rows.every(row => uploadRetrySelectedSet.value.has(row.id))
  })

  const downloaderFailureSelectedSet = computed(() => new Set(downloaderFailureSelectedIds.value))

  const downloaderFailureTypeOptions = computed(() => {
    return [...new Set(downloaderFailureRows.value
      .map(row => String(row?.type || '').trim())
      .filter(Boolean))]
      .sort((left, right) => left.localeCompare(right))
  })

  const downloaderFailureAllSelected = computed(() => {
    const rows = downloaderFailureRows.value
    return rows.length > 0 && rows.every(row => downloaderFailureSelectedSet.value.has(row.submissionId))
  })

  const downloaderFailureTypeSelected = computed(() => {
    const rows = downloaderFailureRowsByType(downloaderFailureTypeFilter.value)
    return rows.length > 0 && rows.every(row => downloaderFailureSelectedSet.value.has(row.submissionId))
  })

  async function loadTasks() {
    try {
      const payload = await monitorApi.loadMonitorTasks(taskPage.value, MONITOR_PAGE_SIZE, {
        status: taskStatusFilter.value,
        type: taskTypeFilter.value,
        stage: taskStageFilter.value,
        taskId: taskIdFilter.value.trim(),
        sort: taskSort.value,
      })
      tasks.value = payload.tasks || []
      pruneTaskProgress(tasks.value.map(task => task.taskId))
      taskTotalCount.value = Number(payload.totalCount || tasks.value.length)
      if (taskPage.value > taskPageCount.value) taskPage.value = taskPageCount.value
      serverTime.value = payload.serverTime || ''
      warmTaskThumbnails()
      error.value = ''
    } catch (err) {
      error.value = err instanceof Error ? err.message : String(err)
    } finally {
      loading.value = false
    }
  }

  async function loadServiceHeartbeats() {
    try {
      serviceHeartbeats.value = await monitorApi.loadServiceHeartbeats() || []
    } catch (err) {
      error.value = err instanceof Error ? err.message : String(err)
    }
  }

  function pruneTaskProgress(visibleTaskIds) {
    const visible = new Set(visibleTaskIds)
    progressByTaskId.value = Object.fromEntries(
      Object.entries(progressByTaskId.value).filter(([taskId]) => visible.has(taskId))
    )
  }

  async function loadTaskProgressBatch() {
    const taskIds = pagedTasks.value.map(task => task.taskId).filter(Boolean).slice(0, MONITOR_PAGE_SIZE)
    if (!taskDetailsExpanded.value || taskIds.length === 0) return []
    if (batchProgressRequest) return batchProgressRequest
    const requestedTaskIdsKey = taskIds.join('\u0000')
    taskProgressLoading.value = true
    taskProgressError.value = ''
    batchProgressRequest = monitorApi.loadTaskProgressBatch(taskIds)
      .then(items => {
        const visible = new Set(pagedTasks.value.map(task => task.taskId))
        const next = { ...progressByTaskId.value }
        for (const item of items || []) {
          if (item?.taskId && visible.has(item.taskId)) next[item.taskId] = item
        }
        progressByTaskId.value = next
        return items || []
      })
      .catch(err => {
        taskProgressError.value = err instanceof Error ? err.message : String(err)
        return []
      })
      .finally(() => {
        taskProgressLoading.value = false
        batchProgressRequest = null
        const currentTaskIdsKey = pagedTasks.value.map(task => task.taskId).filter(Boolean).slice(0, MONITOR_PAGE_SIZE).join('\u0000')
        if (taskDetailsExpanded.value && currentTaskIdsKey !== requestedTaskIdsKey) {
          queueMicrotask(loadTaskProgressBatch)
        }
      })
    return batchProgressRequest
  }

  function stopTaskProgressRefresh() {
    if (progressRefreshTimer) window.clearInterval(progressRefreshTimer)
    progressRefreshTimer = null
  }

  function startTaskProgressRefresh() {
    stopTaskProgressRefresh()
    if (!progressPollingActive || !taskDetailsExpanded.value) return
    progressRefreshTimer = window.setInterval(loadTaskProgressBatch, 10000)
  }

  function setTaskProgressPollingActive(active) {
    progressPollingActive = Boolean(active)
    if (!progressPollingActive) {
      stopTaskProgressRefresh()
      return
    }
    if (taskDetailsExpanded.value) {
      loadTaskProgressBatch()
      startTaskProgressRefresh()
    }
  }

  async function toggleTaskDetails() {
    taskDetailsExpanded.value = !taskDetailsExpanded.value
    if (!taskDetailsExpanded.value) {
      stopTaskProgressRefresh()
      taskProgressError.value = ''
      return
    }
    await loadTaskProgressBatch()
    if (taskDetailsExpanded.value) startTaskProgressRefresh()
  }

  watch(
    () => pagedTasks.value.map(task => task.taskId).join('\u0000'),
    () => {
      if (taskDetailsExpanded.value) loadTaskProgressBatch()
    }
  )

  onUnmounted(stopTaskProgressRefresh)

  async function loadTaskTypes() {
    try {
      const payload = await monitorApi.loadTaskTypes()
      taskTypeFilters.value = [...new Set((payload?.items || [])
        .map(type => String(type || '').trim())
        .filter(Boolean))]
        .sort((left, right) => left.localeCompare(right))
    } catch (err) {
      error.value = err instanceof Error ? err.message : String(err)
    }
  }

  async function markTaskReady(task) {
    if (!task?.taskId || task.status !== 'failed' || readyTaskId.value) return
    readyTaskId.value = task.taskId
    try {
      await monitorApi.markTaskReady(task.taskId)
      task.status = 'ready'
      task.errorMessage = ''
      await loadTasks()
    } catch (err) {
      error.value = err instanceof Error ? err.message : String(err)
    } finally {
      readyTaskId.value = ''
    }
  }

  async function setUploadRetryPlatform(platform) {
    uploadRetryPlatform.value = platform
    uploadRetrySelectedIds.value = []
    if (!platform) {
      uploadRetryRows.value = []
      return
    }
    await loadUploadRetryRows()
  }

  async function loadUploadRetryRows() {
    const platform = uploadRetryPlatform.value
    if (!platform || uploadRetryLoading.value) return
    uploadRetryLoading.value = true
    try {
      const payload = await monitorApi.loadFailedUploadSubmissions(platform)
      uploadRetryRows.value = payload.rows || []
      uploadRetrySelectedIds.value = uploadRetrySelectedIds.value.filter(id => {
        return uploadRetryRows.value.some(row => row.id === id && !row.retryBlockedReason)
      })
      error.value = ''
    } catch (err) {
      error.value = err instanceof Error ? err.message : String(err)
    } finally {
      uploadRetryLoading.value = false
    }
  }

  function toggleUploadRetryRow(row) {
    if (!row?.id || row.retryBlockedReason) return
    const selected = uploadRetrySelectedSet.value
    uploadRetrySelectedIds.value = selected.has(row.id)
      ? uploadRetrySelectedIds.value.filter(id => id !== row.id)
      : [...uploadRetrySelectedIds.value, row.id]
  }

  function toggleUploadRetryAll() {
    if (uploadRetryAllSelected.value) {
      uploadRetrySelectedIds.value = []
      return
    }
    uploadRetrySelectedIds.value = uploadRetrySelectableRows.value.map(row => row.id)
  }

  async function retrySelectedUploadSubmissions() {
    if (!uploadRetryPlatform.value || uploadRetrySelectedIds.value.length === 0 || uploadRetryBusy.value) return
    const ids = [...uploadRetrySelectedIds.value]
    uploadRetryBusy.value = true
    try {
      await monitorApi.retryUploadSubmissions(uploadRetryPlatform.value, ids)
      uploadRetrySelectedIds.value = []
      await Promise.all([loadTasks(), loadUploadRetryRows()])
    } catch (err) {
      error.value = err instanceof Error ? err.message : String(err)
    } finally {
      uploadRetryBusy.value = false
    }
  }

  async function toggleDownloaderFailures() {
    downloaderFailuresOpen.value = !downloaderFailuresOpen.value
    if (downloaderFailuresOpen.value) await loadDownloaderFailures()
  }

  async function loadDownloaderFailures() {
    if (downloaderFailureLoading.value) return
    downloaderFailureLoading.value = true
    try {
      const payload = await monitorApi.loadFailedTasks()
      downloaderFailureRows.value = payload.rows || []
      downloaderFailureSelectedIds.value = downloaderFailureSelectedIds.value.filter(id => {
        return downloaderFailureRows.value.some(row => row.submissionId === id)
      })
      if (
        downloaderFailureTypeFilter.value !== 'all'
        && !downloaderFailureTypeOptions.value.includes(downloaderFailureTypeFilter.value)
      ) {
        downloaderFailureTypeFilter.value = 'all'
      }
      error.value = ''
    } catch (err) {
      error.value = err instanceof Error ? err.message : String(err)
    } finally {
      downloaderFailureLoading.value = false
    }
  }

  function toggleDownloaderFailureRow(row) {
    const id = row?.submissionId
    if (!id) return
    const selected = downloaderFailureSelectedSet.value
    downloaderFailureSelectedIds.value = selected.has(id)
      ? downloaderFailureSelectedIds.value.filter(item => item !== id)
      : [...downloaderFailureSelectedIds.value, id]
  }

  function toggleDownloaderFailureAll() {
    downloaderFailureSelectedIds.value = downloaderFailureAllSelected.value
      ? []
      : downloaderFailureRows.value.map(row => row.submissionId)
  }

  function setDownloaderFailureTypeFilter(type) {
    downloaderFailureTypeFilter.value = String(type || 'all')
  }

  function downloaderFailureRowsByType(type) {
    if (!type || type === 'all') return downloaderFailureRows.value
    return downloaderFailureRows.value.filter(row => String(row?.type || '').trim() === type)
  }

  function toggleDownloaderFailureType() {
    const rows = downloaderFailureRowsByType(downloaderFailureTypeFilter.value)
    if (rows.length === 0) return
    const rowIds = rows.map(row => row.submissionId)
    const rowIdSet = new Set(rowIds)
    downloaderFailureSelectedIds.value = downloaderFailureTypeSelected.value
      ? downloaderFailureSelectedIds.value.filter(id => !rowIdSet.has(id))
      : [...new Set([...downloaderFailureSelectedIds.value, ...rowIds])]
  }

  async function rollbackSelectedDownloaderFailures() {
    if (downloaderFailureSelectedIds.value.length === 0 || downloaderFailureBusy.value) return
    const count = downloaderFailureSelectedIds.value.length
    const confirmed = window.confirm(
      `确认稍后执行选中的 ${count} 个任务？\n\n`
      + '这会删除已创建的任务数据库记录和 MinIO 文件，'
      + '并把原 submission 恢复为可拉取。'
    )
    if (!confirmed) return
    const submissionIds = [...downloaderFailureSelectedIds.value]
    downloaderFailureBusy.value = true
    try {
      await monitorApi.rollbackFailedTasks(submissionIds)
      downloaderFailureSelectedIds.value = []
      await Promise.all([loadTasks(), loadDownloaderFailures()])
    } catch (err) {
      error.value = err instanceof Error ? err.message : String(err)
      window.alert(`稍后执行失败：${error.value}`)
    } finally {
      downloaderFailureBusy.value = false
    }
  }

  function isTaskReadyBusy(task) {
    return readyTaskId.value === task?.taskId
  }

  async function stopTask(task) {
    if (!task?.taskId || task.status !== 'running' || stopTaskId.value) return
    const confirmed = window.confirm(`确认停止任务？\n\n${displayTitle(task)}\n\n这会把当前任务标记为失败，已启动的 worker 进程不会被强制杀掉，但后续阶段不会继续排队。`)
    if (!confirmed) return
    stopTaskId.value = task.taskId
    try {
      await monitorApi.stopTask(task.taskId)
      task.status = 'failed'
      task.errorMessage = '手动停止任务'
      await loadTasks()
    } catch (err) {
      error.value = err instanceof Error ? err.message : String(err)
    } finally {
      stopTaskId.value = ''
    }
  }

  function isTaskStopBusy(task) {
    return stopTaskId.value === task?.taskId
  }

  async function restartTask(task) {
    if (!task?.taskId || task.status === 'running' || restartTaskId.value) return
    const confirmed = window.confirm(`确认从头开始任务？\n\n${displayTitle(task)}\n\n这会删除该任务已生成的数据库结果和 MinIO 文件，并从 downloader 重新排队。`)
    if (!confirmed) return
    restartTaskId.value = task.taskId
    try {
      await monitorApi.restartTask(task.taskId)
      task.status = 'ready'
      task.currentStage = 'downloader'
      task.errorMessage = ''
      await loadTasks()
    } catch (err) {
      error.value = err instanceof Error ? err.message : String(err)
    } finally {
      restartTaskId.value = ''
    }
  }

  function isTaskRestartBusy(task) {
    return restartTaskId.value === task?.taskId
  }

  async function deleteTask(task) {
    if (!task?.taskId || task.status === 'running' || deleteTaskId.value) return
    const confirmed = window.confirm(`确认删除任务？\n\n${displayTitle(task)}\n\n这会永久删除该任务所有数据库记录和 MinIO 文件，无法恢复。`)
    if (!confirmed) return
    deleteTaskId.value = task.taskId
    try {
      await monitorApi.deleteTask(task.taskId)
      tasks.value = tasks.value.filter(item => item.taskId !== task.taskId)
      await loadTasks()
    } catch (err) {
      error.value = err instanceof Error ? err.message : String(err)
      window.alert(`删除失败：${error.value}`)
    } finally {
      deleteTaskId.value = ''
    }
  }

  function isTaskDeleteBusy(task) {
    return deleteTaskId.value === task?.taskId
  }

  function stageName(stageOrKey) {
    const key = typeof stageOrKey === 'string' ? stageOrKey : stageOrKey?.key
    return stageNameText[key] || key || ''
  }

  function failureDetails(node) {
    return [node?.errorMessage, node?.childErrorMessage].filter(Boolean).join('\n')
  }

  function canShowFailureDetails(node) {
    return node?.status === 'failed' && Boolean(failureDetails(node))
  }

  function failureKey(task, node) {
    return `${task?.taskId || ''}:${node?.key || ''}`
  }

  function toggleFailureDetails(task, node) {
    const key = failureKey(task, node)
    openFailureKey.value = openFailureKey.value === key ? '' : key
  }

  function displayTitle(task) {
    const title = String(task.title || '').trim()
    if (title && !isWatchUrl(title)) return title
    return task.taskId || '未命名任务'
  }

  function taskSourceUrl(task) {
    return String(task?.sourceWebpageUrl || task?.sourceUrl || '').trim()
  }

  function taskPrimaryThumbnailUrl(task) {
    return String(task?.sourceThumbnailUrl || '').trim()
  }

  function taskThumbnailUrl(task) {
    const primary = taskPrimaryThumbnailUrl(task)
    if (primary && !brokenImageUrls.value[primary]) return primary
    return youtubeThumbnailUrl(taskSourceUrl(task))
  }

  function taskCachedThumbnailUrl(task) {
    const url = taskThumbnailUrl(task)
    return taskThumbUrls.value[url] || url
  }

  function markImageBroken(url) {
    if (!url) return
    brokenImageUrls.value = { ...brokenImageUrls.value, [url]: true }
  }

  function warmTaskThumbnails() {
    for (const task of tasks.value.slice(0, 100)) {
      cacheImageUrl(taskThumbnailUrl(task), 'monitor-task-thumbnails-v1', taskThumbUrls)
    }
  }

  function sourceDurationSeconds(task) {
    const value = Number(task?.sourceDurationSeconds)
    return Number.isFinite(value) && value > 0 ? value : null
  }

  function uploadAccountText(task) {
    const name = String(task.bilibiliUploadAccountName || '').trim()
    const uid = String(task.bilibiliUploadUid || '').trim()
    if (name && uid) return `${name} · UID ${uid}`
    return name || (uid ? `UID ${uid}` : '')
  }

  function taskTypeText(task) {
    return String(task?.taskType || '').trim() || '-'
  }

  function minioStorageText(task) {
    const objectCount = Number(task?.minioStorageObjectCount)
    if (!Number.isFinite(objectCount) || objectCount <= 1) return ''
    const bytes = Number(task?.minioStorageBytes)
    if (!Number.isFinite(bytes) || bytes <= 0) return ''
    const megabytes = bytes / (1024 ** 2)
    const digits = megabytes >= 100 ? 0 : megabytes >= 10 ? 1 : 2
    const size = megabytes.toFixed(digits).replace(/\.0+$/, '')
    return `${size}MB(${Math.floor(objectCount)})`
  }

  function setTaskTypeFilter(value) {
    taskTypeFilter.value = value
    taskPage.value = 1
    loadTasks()
  }

  function setTaskStatusFilter(value) {
    taskStatusFilter.value = value
    if (value !== 'running') taskStageFilter.value = 'all'
    taskPage.value = 1
    loadTasks()
  }

  function setTaskStageFilter(value) {
    taskStageFilter.value = value
    if (value !== 'all') taskStatusFilter.value = 'running'
    taskPage.value = 1
    loadTasks()
  }

  function setTaskIdFilter(value) {
    taskIdFilter.value = value
  }

  function applyTaskIdFilter() {
    taskPage.value = 1
    loadTasks()
  }

  function setTaskSort(value) {
    const nextSort = value === 'minio_storage_desc' ? 'minio_storage_desc' : 'created_desc'
    if (nextSort === taskSort.value) return
    taskSort.value = nextSort
    taskPage.value = 1
    loadTasks()
  }

  function setTaskPage(value) {
    const page = Number(value)
    if (!Number.isFinite(page)) return
    const nextPage = Math.min(Math.max(1, Math.trunc(page)), taskPageCount.value)
    if (nextPage === taskPage.value) return
    taskPage.value = nextPage
    loadTasks()
  }

  async function copyText(value) {
    const text = String(value || '').trim()
    if (!text) return
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text)
        return
      }
    } catch {
      // Fall back to execCommand for non-secure contexts or older WebViews.
    }
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

  function copyTaskId(task) {
    copyText(task?.taskId)
  }

  function formatLastSeen(device) {
    return device?.online ? '在线' : '离线'
  }

  function onlineDeviceText(service) {
    const names = (service?.devices || [])
      .filter(device => device.online)
      .map(device => String(device.deviceName || '').trim())
      .filter(Boolean)
    return names.length > 0 ? names.join(' & ') : '离线'
  }

  function serviceOnline(service) {
    return (service?.devices || []).some(device => device.online)
  }

  function onlineDeviceTitle(service) {
    return (service?.devices || [])
      .map(device => `${device.deviceName}: ${formatLastSeen(device)}${device.lastSeenAt ? ` ${formatDateTime(device.lastSeenAt)}` : ''}`)
      .join('\n')
  }

  function toggleTaskActions() {
    taskActionsExpanded.value = !taskActionsExpanded.value
  }

  function taskActionsOpen() {
    return taskActionsExpanded.value
  }

  function nodeTitle(node) {
    const parts = [
      node?.label || stageName(node),
      statusText[node.status] || node.status,
    ]
    const progress = nodeProgress(node)
    if (progress && node?.key !== 'uploader') {
      parts.push(`任务点 ${progress}`)
    }
    if (Array.isArray(node.platformStatuses) && node.platformStatuses.length > 0) {
      for (const platformStatus of node.platformStatuses) {
        const platform = uploadPlatformText[platformStatus.platform] || platformStatus.platform
        parts.push(`${platform}: ${statusText[platformStatus.status] || platformStatus.status}`)
      }
    }
    parts.push(`耗时 ${formatDuration(node.elapsedSeconds)}`)
    if (node.errorMessage) {
      parts.push(node.errorMessage)
    }
    if (node.childErrorMessage) {
      parts.push(node.childErrorMessage)
    }
    return parts.join('\n')
  }

  function nodeProgress(node) {
    if (node?.key === 'downloader' && node.progressPercent !== null && node.progressPercent !== undefined && Number.isFinite(Number(node.progressPercent))) {
      const value = Number(node.progressPercent)
      const text = value.toFixed(1).replace(/\.0$/, '')
      return `${text}%`
    }
    if (!Number.isFinite(Number(node.totalCount)) || Number(node.totalCount) <= 0) {
      return ''
    }
    const completed = Number(node.completedCount || 0)
    const failed = Number(node.failedCount || 0)
    const done = completed + failed
    const base = `${failed > 0 ? done : completed}/${Number(node.totalCount)}`
    return failed > 0 ? `${base} 失败${failed}` : base
  }

  return {
    tasks,
    serviceHeartbeats,
    serverTime,
    loading,
    error,
    readyTaskId,
    stopTaskId,
    restartTaskId,
    deleteTaskId,
    taskStatusFilter,
    taskTypeFilter,
    taskStageFilter,
    taskIdFilter,
    taskSort,
    taskPage,
    taskTotalCount,
    taskActionsExpanded,
    openFailureKey,
    taskThumbUrls,
    uploadRetryPlatform,
    uploadRetryRows,
    uploadRetryLoading,
    uploadRetryBusy,
    uploadRetrySelectedIds,
    downloaderFailuresOpen,
    downloaderFailureRows,
    downloaderFailureLoading,
    downloaderFailureBusy,
    downloaderFailureSelectedIds,
    downloaderFailureTypeFilter,
    progressByTaskId,
    taskDetailsExpanded,
    taskProgressLoading,
    taskProgressError,
    taskTypeFilters,
    taskStageFilters,
    filteredTasks,
    hasTaskFilter,
    pagedTasks,
    taskPageCount,
    onlineSummary,
    uploadRetryPlatformOptions,
    uploadRetrySelectedSet,
    uploadRetrySelectableRows,
    uploadRetryAllSelected,
    downloaderFailureSelectedSet,
    downloaderFailureAllSelected,
    downloaderFailureTypeOptions,
    downloaderFailureTypeSelected,
    loadTasks,
    loadServiceHeartbeats,
    loadTaskProgressBatch,
    toggleTaskDetails,
    setTaskProgressPollingActive,
    loadTaskTypes,
    markTaskReady,
    isTaskReadyBusy,
    setUploadRetryPlatform,
    loadUploadRetryRows,
    toggleUploadRetryRow,
    toggleUploadRetryAll,
    retrySelectedUploadSubmissions,
    toggleDownloaderFailures,
    loadDownloaderFailures,
    toggleDownloaderFailureRow,
    toggleDownloaderFailureAll,
    setDownloaderFailureTypeFilter,
    toggleDownloaderFailureType,
    rollbackSelectedDownloaderFailures,
    stopTask,
    isTaskStopBusy,
    restartTask,
    isTaskRestartBusy,
    deleteTask,
    isTaskDeleteBusy,
    stageName,
    failureDetails,
    canShowFailureDetails,
    failureKey,
    toggleFailureDetails,
    displayTitle,
    taskSourceUrl,
    taskThumbnailUrl,
    taskCachedThumbnailUrl,
    markImageBroken,
    warmTaskThumbnails,
    sourceDurationSeconds,
    uploadAccountText,
    taskTypeText,
    minioStorageText,
    setTaskTypeFilter,
    setTaskStatusFilter,
    setTaskStageFilter,
    setTaskIdFilter,
    applyTaskIdFilter,
    setTaskSort,
    setTaskPage,
    copyText,
    copyTaskId,
    onlineDeviceText,
    serviceOnline,
    onlineDeviceTitle,
    toggleTaskActions,
    taskActionsOpen,
    nodeTitle,
    nodeProgress,
  }
}
