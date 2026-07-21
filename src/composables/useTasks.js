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
  normalizeResourceUrl,
} from '../utils/media'

export function useTasks(tasksApi, cacheImageUrl, brokenImageUrls, distributorApi) {
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
  const topicFilter = ref('all')
  const taskStageFilter = ref('all')
  const taskIdFilter = ref('')
  const taskSort = ref('created_desc')
  const topicFilters = ref([])
  const taskPage = ref(1)
  const taskTotalCount = ref(0)
  const taskActionsExpanded = ref(false)
  const openFailureKey = ref('')
  const taskThumbUrls = ref({})
  const summaryProgressByTaskId = ref({})
  const detailProgressByTaskId = ref({})
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
      if (topicFilter.value !== 'all' && topicText(task) !== topicFilter.value) return false
      if (taskStageFilter.value !== 'all' && String(task.currentStage || '') !== taskStageFilter.value) return false
      if (taskIdFilter.value && !String(task.taskId || '').includes(taskIdFilter.value.trim())) return false
      return true
    })
  })

  const hasTaskFilter = computed(() => {
    return taskStatusFilter.value !== 'all'
      || topicFilter.value !== 'all'
      || taskStageFilter.value !== 'all'
      || Boolean(taskIdFilter.value.trim())
  })

  const taskPageCount = computed(() => {
    return Math.max(1, Math.ceil(taskTotalCount.value / MONITOR_PAGE_SIZE))
  })

  const pagedTasks = computed(() => {
    return filteredTasks.value
  })

  const progressByTaskId = computed(() => {
    if (!taskDetailsExpanded.value) return summaryProgressByTaskId.value
    const next = { ...summaryProgressByTaskId.value }
    for (const [taskId, progress] of Object.entries(detailProgressByTaskId.value)) {
      next[taskId] = progress
    }
    return next
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

  async function loadTasks() {
    try {
      const payload = await tasksApi.loadMonitorTasks(taskPage.value, MONITOR_PAGE_SIZE, {
        status: taskStatusFilter.value,
        topic: topicFilter.value,
        stage: taskStageFilter.value,
        taskId: taskIdFilter.value.trim(),
        sort: taskSort.value,
      })
      tasks.value = payload.tasks || []
      initializeTaskProgress(tasks.value)
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
      serviceHeartbeats.value = await tasksApi.loadServiceHeartbeats() || []
    } catch (err) {
      error.value = err instanceof Error ? err.message : String(err)
    }
  }

  function initializeTaskProgress(visibleTasks) {
    const visible = new Set(visibleTasks.map(task => task.taskId).filter(Boolean))
    const nextSummary = Object.fromEntries(
      Object.entries(summaryProgressByTaskId.value).filter(([taskId]) => visible.has(taskId))
    )
    const nextDetail = Object.fromEntries(
      Object.entries(detailProgressByTaskId.value).filter(([taskId]) => visible.has(taskId))
    )
    for (const task of visibleTasks) {
      const progress = taskProgressFromMonitorItem(task)
      if (progress) nextSummary[task.taskId] = progress
    }
    summaryProgressByTaskId.value = nextSummary
    detailProgressByTaskId.value = nextDetail
  }

  function taskProgressFromMonitorItem(task) {
    if (!task?.taskId) return null
    const nodes = Array.isArray(task.nodes) ? task.nodes : []
    const routeNodes = Array.isArray(task.routeNodes) ? task.routeNodes : []
    const routeEdges = Array.isArray(task.routeEdges) ? task.routeEdges : []
    if (!nodes.length && !routeNodes.length) return null
    return {
      taskId: task.taskId,
      distributorStages: Array.isArray(task.distributorStages) ? task.distributorStages : [],
      nodes,
      routeNodes,
      routeEdges,
    }
  }

  function nodeHasRunningWork(node) {
    if (node?.status === 'running') return true
    if (Number(node?.jobSummary?.runningCount || 0) > 0) return true
    return Array.isArray(node?.platformStatuses)
      && node.platformStatuses.some(platformStatus => platformStatus?.status === 'running')
  }

  function taskHasRunningWork(task) {
    if (task?.status === 'running') return true
    const progress = progressByTaskId.value?.[task?.taskId] || taskProgressFromMonitorItem(task)
    const routeNodes = Array.isArray(progress?.routeNodes) ? progress.routeNodes : []
    const nodes = Array.isArray(progress?.nodes) ? progress.nodes : []
    return [...routeNodes, ...nodes].some(nodeHasRunningWork)
  }

  function canStopTask(task) {
    return Boolean(task?.taskId) && taskHasRunningWork(task)
  }

  async function loadTaskProgressBatch() {
    const taskIds = pagedTasks.value.map(task => task.taskId).filter(Boolean).slice(0, MONITOR_PAGE_SIZE)
    if (!taskDetailsExpanded.value || taskIds.length === 0) return []
    if (batchProgressRequest) return batchProgressRequest
    const requestedTaskIdsKey = taskIds.join('\u0000')
    taskProgressLoading.value = true
    taskProgressError.value = ''
    batchProgressRequest = tasksApi.loadTaskProgressBatch(taskIds)
      .then(items => {
        const visible = new Set(pagedTasks.value.map(task => task.taskId))
        const next = { ...detailProgressByTaskId.value }
        for (const item of items || []) {
          if (item?.taskId && visible.has(item.taskId)) next[item.taskId] = item
        }
        detailProgressByTaskId.value = next
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
    progressRefreshTimer = window.setInterval(loadTaskProgressBatch, 20000)
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
      const payload = await tasksApi.loadTaskTypes()
      topicFilters.value = [...new Set((payload?.items || [])
        .map(type => String(type || '').trim())
        .filter(Boolean))]
        .sort((left, right) => left.localeCompare(right))
      return true
    } catch (err) {
      error.value = err instanceof Error ? err.message : String(err)
      return false
    }
  }

  async function markTaskReady(task) {
    if (!task?.taskId || task.status !== 'failed' || readyTaskId.value) return
    readyTaskId.value = task.taskId
    try {
      await distributorApi.retryTask(task.taskId)
      task.status = 'ready'
      task.errorMessage = ''
      await loadTasks()
    } catch (err) {
      error.value = err instanceof Error ? err.message : String(err)
    } finally {
      readyTaskId.value = ''
    }
  }

  function isTaskReadyBusy(task) {
    return readyTaskId.value === task?.taskId
  }

  async function stopTask(task) {
    if (!canStopTask(task) || stopTaskId.value) return
    const confirmed = window.confirm(`确认停止任务？\n\n${displayTitle(task)}\n\n这会把当前任务标记为失败，已启动的 worker 进程不会被强制杀掉，但后续阶段不会继续排队。`)
    if (!confirmed) return
    stopTaskId.value = task.taskId
    try {
      await distributorApi.stopTask(task.taskId)
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
    if (!task?.taskId || taskHasRunningWork(task) || restartTaskId.value) return
    const confirmed = window.confirm(`确认从头开始任务？\n\n${displayTitle(task)}\n\n这会删除该任务已生成的数据库结果和 MinIO 文件，并从 downloader 重新排队。`)
    if (!confirmed) return
    restartTaskId.value = task.taskId
    try {
      await distributorApi.restartTask(task.taskId)
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
    if (!task?.taskId || taskHasRunningWork(task) || deleteTaskId.value) return
    const confirmed = window.confirm(`确认删除任务？\n\n${displayTitle(task)}\n\n这会永久删除该任务所有数据库记录和 MinIO 文件，无法恢复。`)
    if (!confirmed) return
    deleteTaskId.value = task.taskId
    try {
      await distributorApi.deleteTask(task.taskId)
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
    return normalizeResourceUrl(task?.sourceThumbnailUrl || '')
  }

  function taskThumbnailUrl(task) {
    const primary = taskPrimaryThumbnailUrl(task)
    if (primary && !brokenImageUrls.value[primary]) return primary
    return ''
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
    const name = String(task?.bilibiliUploadAccountName || '').trim()
    const key = String(task?.bilibiliUploadTopic || '').trim()
    if (name && key && name !== key) return `${name} · ${key}`
    return name || key
  }

  function topicText(task) {
    return String(task?.topic || '').trim() || '-'
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

  function setTopicFilter(value) {
    topicFilter.value = value
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
    if (progress) {
      parts.push(`任务点 ${progress}`)
    }
    const jobSummary = node?.jobSummary
    if (jobSummary) {
      if (jobSummary.serviceName) parts.push(`服务 ${jobSummary.serviceName}`)
      if (jobSummary.sourceTable) parts.push(`来源表 ${jobSummary.sourceTable}`)
      parts.push(`状态分布 success=${Number(jobSummary.completedCount || 0)} failed=${Number(jobSummary.failedCount || 0)} running=${Number(jobSummary.runningCount || 0)} ready=${Number(jobSummary.readyCount || 0)} pending=${Number(jobSummary.pendingCount || 0)} total=${Number(jobSummary.totalCount || 0)}`)
      if (jobSummary.startedAt) parts.push(`开始 ${formatDateTime(jobSummary.startedAt)}`)
      if (jobSummary.completedAt) parts.push(`完成 ${formatDateTime(jobSummary.completedAt)}`)
      if (Number(jobSummary.elapsedSeconds) > 0) parts.push(`jobs 耗时 ${formatDuration(jobSummary.elapsedSeconds)}`)
    }
    if (Array.isArray(node.platformStatuses) && node.platformStatuses.length > 0) {
      for (const platformStatus of node.platformStatuses) {
        const platform = uploadPlatformText[platformStatus.platform] || platformStatus.platform
        parts.push(`${platform}: ${statusText[platformStatus.status] || platformStatus.status}`)
      }
    }
    if (Number(node.elapsedSeconds) > 0) {
      parts.push(`耗时 ${formatDuration(node.elapsedSeconds)}`)
    }
    if (node.errorMessage) {
      parts.push(`错误 ${node.errorMessage}`)
    }
    if (node.childErrorMessage) {
      parts.push(`子任务错误 ${node.childErrorMessage}`)
    }
    return parts.join('\n')
  }

  function nodeProgress(node) {
    if (!Number.isFinite(Number(node.totalCount)) || Number(node.totalCount) <= 0) {
      return ''
    }
    const completed = Number(node.completedCount || 0)
    const failed = Number(node.failedCount || 0)
    const running = Number(node.jobSummary?.runningCount || 0)
    const pending = Number(node.jobSummary?.pendingCount || 0)
    const ready = Number(node.jobSummary?.readyCount || 0)
    const waiting = pending + ready
    const done = completed + failed
    const base = `${failed > 0 ? done : completed}/${Number(node.totalCount)}`
    const parts = [failed > 0 ? `${base} 失败${failed}` : base]
    if (running > 0 || waiting > 0) {
      const live = []
      if (running > 0) live.push(`运行${running}`)
      if (waiting > 0) live.push(`等待${waiting}`)
      parts.push(live.join('/'))
    }
    return parts.join(' ')
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
    topicFilter,
    taskStageFilter,
    taskIdFilter,
    taskSort,
    taskPage,
    taskTotalCount,
    taskActionsExpanded,
    openFailureKey,
    taskThumbUrls,
    progressByTaskId,
    taskDetailsExpanded,
    taskProgressLoading,
    taskProgressError,
    topicFilters,
    taskStageFilters,
    filteredTasks,
    hasTaskFilter,
    pagedTasks,
    taskPageCount,
    onlineSummary,
    loadTasks,
    loadServiceHeartbeats,
    loadTaskProgressBatch,
    toggleTaskDetails,
    setTaskProgressPollingActive,
    loadTaskTypes,
    markTaskReady,
    isTaskReadyBusy,
    stopTask,
    canStopTask,
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
    topicText,
    minioStorageText,
    setTopicFilter,
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
