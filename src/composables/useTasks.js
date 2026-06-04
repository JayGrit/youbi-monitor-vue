import { computed, ref } from 'vue'
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
  const taskPage = ref(1)
  const taskActionsExpanded = ref(false)
  const openFailureKey = ref('')
  const taskThumbUrls = ref({})
  const uploadRetryPlatform = ref('')
  const uploadRetryRows = ref([])
  const uploadRetryLoading = ref(false)
  const uploadRetryBusy = ref(false)
  const uploadRetrySelectedIds = ref([])

  const taskFilterCounts = computed(() => {
    const counts = {
      all: tasks.value.length,
      success: 0,
      failed: 0,
      running: 0,
    }
    for (const task of tasks.value) {
      if (task.status === 'success') counts.success += 1
      if (task.status === 'failed') counts.failed += 1
      if (task.status === 'running') counts.running += 1
    }
    return counts
  })

  const taskTypeFilters = computed(() => {
    return [...new Set(tasks.value.map(task => taskTypeText(task)).filter(type => type !== '-'))]
      .sort((left, right) => left.localeCompare(right))
  })

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
      return true
    })
  })

  const taskPageCount = computed(() => Math.max(1, Math.ceil(filteredTasks.value.length / MONITOR_PAGE_SIZE)))

  const pagedTasks = computed(() => {
    const page = Math.min(Math.max(1, taskPage.value), taskPageCount.value)
    const offset = (page - 1) * MONITOR_PAGE_SIZE
    return filteredTasks.value.slice(offset, offset + MONITOR_PAGE_SIZE)
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

  async function loadTasks() {
    try {
      const payload = await monitorApi.loadMonitorTasks()
      tasks.value = payload.tasks || []
      if (taskPage.value > taskPageCount.value) taskPage.value = taskPageCount.value
      serviceHeartbeats.value = payload.serviceHeartbeats || []
      serverTime.value = payload.serverTime || ''
      warmTaskThumbnails()
      error.value = ''
    } catch (err) {
      error.value = err instanceof Error ? err.message : String(err)
    } finally {
      loading.value = false
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

  function setTaskTypeFilter(value) {
    taskTypeFilter.value = value
    taskPage.value = 1
  }

  function setTaskStatusFilter(value) {
    taskStatusFilter.value = value
    if (value !== 'running') taskStageFilter.value = 'all'
    taskPage.value = 1
  }

  function setTaskStageFilter(value) {
    taskStageFilter.value = value
    if (value !== 'all') taskStatusFilter.value = 'running'
    taskPage.value = 1
  }

  function setTaskPage(value) {
    const page = Number(value)
    if (!Number.isFinite(page)) return
    taskPage.value = Math.min(Math.max(1, Math.trunc(page)), taskPageCount.value)
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
      stageName(node),
      statusText[node.status] || node.status,
    ]
    const progress = nodeProgress(node)
    if (progress) {
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
    taskPage,
    taskActionsExpanded,
    openFailureKey,
    taskThumbUrls,
    uploadRetryPlatform,
    uploadRetryRows,
    uploadRetryLoading,
    uploadRetryBusy,
    uploadRetrySelectedIds,
    taskFilterCounts,
    taskTypeFilters,
    taskStageFilters,
    filteredTasks,
    pagedTasks,
    taskPageCount,
    onlineSummary,
    uploadRetryPlatformOptions,
    uploadRetrySelectedSet,
    uploadRetrySelectableRows,
    uploadRetryAllSelected,
    loadTasks,
    markTaskReady,
    isTaskReadyBusy,
    setUploadRetryPlatform,
    loadUploadRetryRows,
    toggleUploadRetryRow,
    toggleUploadRetryAll,
    retrySelectedUploadSubmissions,
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
    setTaskTypeFilter,
    setTaskStatusFilter,
    setTaskStageFilter,
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
