<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'

const tasks = ref([])
const serviceHeartbeats = ref([])
const serverTime = ref('')
const loading = ref(true)
const error = ref('')
const activePage = ref('monitor')
const bilibiliAccount = ref(null)
const bilibiliAccounts = ref([])
const bilibiliRows = ref(accountRows([]))
const bilibiliError = ref('')
const bilibiliQrCode = ref(null)
const bilibiliQrMessage = ref('')
const bilibiliRenewing = ref(false)
const bilibiliBusyKey = ref('')
const xiaohongshuAccount = ref(null)
const xiaohongshuAccounts = ref([])
const xiaohongshuRows = ref(accountRows([]))
const xiaohongshuError = ref('')
const xiaohongshuQrCode = ref(null)
const xiaohongshuQrMessage = ref('')
const xiaohongshuBusyKey = ref('')
const douyinAccount = ref(null)
const douyinAccounts = ref([])
const douyinRows = ref(accountRows([]))
const douyinError = ref('')
const douyinQrCode = ref(null)
const douyinQrMessage = ref('')
const douyinBusyKey = ref('')
const readyTaskId = ref('')
const stopTaskId = ref('')
const restartTaskId = ref('')
const deleteTaskId = ref('')
const taskStatusFilter = ref('all')
const openFailureKey = ref('')
const selectedTaskFlow = ref(null)
const selectedStageKey = ref('downloader')
const flowPageOpen = ref(false)
const flowLoading = ref(false)
const flowError = ref('')
const speechEditKey = ref('')
const speechEditDraft = ref('')
const speechEditSaving = ref(false)
const speechEditError = ref('')
let flowTimer = null
let timer = null
let bilibiliQrTimer = null
let xiaohongshuQrTimer = null
let douyinQrTimer = null
const apiBase = `${import.meta.env.BASE_URL}api`
const SPEECH_STAGE_KEY = 'speech'
const SPEECH_STAGE_KEYS = ['whisper', 'translator', 'speaker']

const statusText = {
  pending: '未开始',
  ready: '排队中',
  running: '处理中',
  success: '成功',
  failed: '失败',
  skipped: '跳过',
}

const taskStatusFilters = [
  { key: 'all', label: '全部' },
  { key: 'success', label: '已完成' },
  { key: 'unfinished', label: '未完成' },
  { key: 'running', label: '执行中' },
  { key: 'failed', label: '已失败' },
  { key: 'ready', label: '排队中' },
]

const stageNameText = {
  downloader: 'Downloader',
  demucs: 'Demucs',
  whisper: 'Whisper',
  translator: 'Translator',
  speaker: 'Speaker',
  speech: 'Whisper & Translator & Speaker',
  combiner: 'Combiner',
  uploader: 'Uploader',
}

async function readJsonResponse(response) {
  const text = await response.text()
  try {
    return text ? JSON.parse(text) : null
  } catch (err) {
    const preview = text.replace(/\s+/g, ' ').trim().slice(0, 180)
    throw new Error(preview || `HTTP ${response.status}`)
  }
}

async function throwApiError(response) {
  const payload = await readJsonResponse(response)
  const message = payload?.message || payload?.detail || payload?.error || payload?.title
  throw new Error(message ? `${message} (HTTP ${response.status})` : `HTTP ${response.status}`)
}

const summary = computed(() => {
  const counts = { running: 0, failed: 0, success: 0, total: tasks.value.length }
  for (const task of tasks.value) {
    if (task.status === 'running') counts.running += 1
    if (task.status === 'failed') counts.failed += 1
    if (task.status === 'success') counts.success += 1
  }
  return counts
})

const taskFilterCounts = computed(() => {
  const counts = {
    all: tasks.value.length,
    success: 0,
    unfinished: 0,
    running: 0,
    failed: 0,
    ready: 0,
  }
  for (const task of tasks.value) {
    if (task.status === 'success') counts.success += 1
    if (task.status !== 'success' && task.status !== 'failed') counts.unfinished += 1
    if (task.status === 'running') counts.running += 1
    if (task.status === 'failed') counts.failed += 1
    if (task.status === 'ready') counts.ready += 1
  }
  return counts
})

const filteredTasks = computed(() => {
  if (taskStatusFilter.value === 'all') {
    return tasks.value
  }
  if (taskStatusFilter.value === 'unfinished') {
    return tasks.value.filter(task => task.status !== 'success' && task.status !== 'failed')
  }
  return tasks.value.filter(task => task.status === taskStatusFilter.value)
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

const selectedStage = computed(() => {
  if (selectedStageKey.value === SPEECH_STAGE_KEY) {
    return speechStage.value
  }
  const stages = selectedTaskFlow.value?.stages || []
  return stages.find(stage => stage.key === selectedStageKey.value) || stages[0] || null
})

const flowTabs = computed(() => {
  const stages = selectedTaskFlow.value?.stages || []
  const tabs = []
  let speechInserted = false
  for (const stage of stages) {
    if (SPEECH_STAGE_KEYS.includes(stage.key)) {
      if (!speechInserted) {
        tabs.push(speechStage.value)
        speechInserted = true
      }
    } else {
      tabs.push(stage)
    }
  }
  return tabs
})

const speechStage = computed(() => {
  const stages = selectedTaskFlow.value?.stages || []
  const speechStages = stages.filter(stage => SPEECH_STAGE_KEYS.includes(stage.key))
  const failed = speechStages.find(stage => stage.status === 'failed')
  const running = speechStages.find(stage => stage.status === 'running')
  const ready = speechStages.find(stage => stage.status === 'ready')
  const pending = speechStages.find(stage => stage.status === 'pending')
  const status = failed?.status || running?.status || ready?.status || pending?.status || 'success'
  return {
    key: SPEECH_STAGE_KEY,
    label: stageNameText[SPEECH_STAGE_KEY],
    status,
    elapsedSeconds: speechStages.reduce((total, stage) => total + Number(stage.elapsedSeconds || 0), 0),
    operator: speechStages.map(stage => stage.operator).filter(Boolean).join(' / '),
    errorMessage: speechStages.map(stage => stage.errorMessage).filter(Boolean).join('\n'),
    inputs: speechStages.flatMap(stage => stage.inputs || []),
    outputs: speechStages.flatMap(stage => stage.outputs || []),
    tables: speechStages.flatMap(stage => stage.tables || []),
  }
})

async function loadTasks() {
  try {
    const response = await fetch(`${apiBase}/video-tasks/monitor?limit=100`)
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }
    const payload = await response.json()
    tasks.value = payload.tasks || []
    serviceHeartbeats.value = payload.serviceHeartbeats || []
    serverTime.value = payload.serverTime || ''
    error.value = ''
  } catch (err) {
    error.value = err instanceof Error ? err.message : String(err)
  } finally {
    loading.value = false
  }
}

async function loadBiliupStatus() {
  try {
    await loadBilibiliAccounts()
    bilibiliAccount.value = bilibiliRows.value.find(row => row.accountKey) || bilibiliRows.value[0]
    bilibiliError.value = ''
  } catch (err) {
    bilibiliError.value = err instanceof Error ? err.message : String(err)
  }
}

async function loadAccountPage() {
  await Promise.allSettled([loadBiliupStatus(), loadXiaohongshuStatus(), loadDouyinStatus()])
}

async function loadBilibiliAccounts() {
  const response = await fetch(`${apiBase}/bilibili/accounts`)
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`)
  }
  bilibiliAccounts.value = await response.json()
  bilibiliRows.value = accountRows(bilibiliAccounts.value)
}

async function loadXiaohongshuStatus() {
  try {
    await loadXiaohongshuAccounts()
    xiaohongshuAccount.value = xiaohongshuRows.value.find(row => row.accountKey) || xiaohongshuRows.value[0]
    xiaohongshuError.value = ''
  } catch (err) {
    xiaohongshuError.value = err instanceof Error ? err.message : String(err)
  }
}

async function loadXiaohongshuAccounts() {
  const response = await fetch(`${apiBase}/xiaohongshu/accounts`)
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`)
  }
  xiaohongshuAccounts.value = await response.json()
  xiaohongshuRows.value = accountRows(xiaohongshuAccounts.value)
}

async function loadDouyinStatus() {
  try {
    await loadDouyinAccounts()
    douyinAccount.value = douyinRows.value.find(row => row.accountKey) || douyinRows.value[0]
    douyinError.value = ''
  } catch (err) {
    douyinError.value = err instanceof Error ? err.message : String(err)
  }
}

async function loadDouyinAccounts() {
  const response = await fetch(`${apiBase}/douyin/accounts`)
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`)
  }
  douyinAccounts.value = await response.json()
  douyinRows.value = accountRows(douyinAccounts.value)
}

async function startBilibiliQrLogin(row) {
  try {
    const key = row?.accountKey || '_auto'
    bilibiliBusyKey.value = rowKey(row)
    const response = await fetch(`${apiBase}/bilibili/account/qrcode?accountKey=${encodeURIComponent(key)}`, { method: 'POST' })
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }
    bilibiliQrCode.value = await response.json()
    bilibiliQrMessage.value = '等待扫码确认'
    pollBilibiliQrCode()
  } catch (err) {
    bilibiliError.value = err instanceof Error ? err.message : String(err)
  } finally {
    bilibiliBusyKey.value = ''
  }
}

async function pollBilibiliQrCode() {
  if (!bilibiliQrCode.value?.authCode) return
  if (bilibiliQrTimer) window.clearInterval(bilibiliQrTimer)
  await refreshBilibiliQrCode()
  bilibiliQrTimer = window.setInterval(refreshBilibiliQrCode, 1500)
}

async function refreshBilibiliQrCode() {
  if (!bilibiliQrCode.value?.authCode) return
  try {
    const key = bilibiliQrCode.value.accountKey || '_auto'
    const response = await fetch(`${apiBase}/bilibili/account/${encodeURIComponent(key)}/qrcode/${encodeURIComponent(bilibiliQrCode.value.authCode)}/poll`, {
      method: 'POST',
    })
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }
    const payload = await response.json()
    bilibiliQrMessage.value = payload.message || '等待扫码确认'
    if (payload.loggedIn) {
      bilibiliAccount.value = payload.account
      await loadBilibiliAccounts()
      bilibiliQrCode.value = null
      if (bilibiliQrTimer) {
        window.clearInterval(bilibiliQrTimer)
        bilibiliQrTimer = null
      }
    }
  } catch (err) {
    bilibiliError.value = err instanceof Error ? err.message : String(err)
  }
}

async function renewBilibiliAccount(row) {
  if (!row?.accountKey) return
  bilibiliRenewing.value = true
  bilibiliBusyKey.value = rowKey(row)
  try {
    const response = await fetch(`${apiBase}/bilibili/account/renew?accountKey=${encodeURIComponent(row.accountKey)}`, { method: 'POST' })
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }
    bilibiliAccount.value = await response.json()
    await loadBilibiliAccounts()
    bilibiliError.value = ''
  } catch (err) {
    bilibiliError.value = err instanceof Error ? err.message : String(err)
  } finally {
    bilibiliRenewing.value = false
    bilibiliBusyKey.value = ''
  }
}

async function refreshBilibiliRow(row) {
  if (!row?.accountKey) return
  try {
    const response = await fetch(`${apiBase}/bilibili/account?accountKey=${encodeURIComponent(row.accountKey)}`)
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }
    const account = await response.json()
    mergeAccountRow(account)
    bilibiliAccount.value = account
    bilibiliError.value = ''
  } catch (err) {
    bilibiliError.value = err instanceof Error ? err.message : String(err)
  }
}

async function saveBilibiliKey(row) {
  if (!row?.accountKey) return
  const nextKey = (row.draftKey || '').trim()
  if (!nextKey || nextKey === row.accountKey) return
  try {
    const response = await fetch(`${apiBase}/bilibili/account/${encodeURIComponent(row.accountKey)}/key`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newAccountKey: nextKey }),
    })
    const payload = await response.json()
    if (!response.ok) {
      throw new Error(payload.message || `HTTP ${response.status}`)
    }
    mergeAccountRow(payload, row.slot)
    await loadBilibiliAccounts()
    bilibiliError.value = ''
  } catch (err) {
    bilibiliError.value = err instanceof Error ? err.message : String(err)
  }
}

async function startXiaohongshuQrLogin(row) {
  try {
    const key = row?.accountKey || '_auto'
    xiaohongshuBusyKey.value = rowKey(row)
    const response = await fetch(`${apiBase}/xiaohongshu/account/qrcode?accountKey=${encodeURIComponent(key)}`, { method: 'POST' })
    const payload = await response.json()
    if (!response.ok) {
      throw new Error(payload.message || `HTTP ${response.status}`)
    }
    xiaohongshuQrCode.value = payload
    xiaohongshuQrMessage.value = '等待扫码确认'
    pollXiaohongshuQrCode()
  } catch (err) {
    xiaohongshuError.value = err instanceof Error ? err.message : String(err)
  } finally {
    xiaohongshuBusyKey.value = ''
  }
}

async function pollXiaohongshuQrCode() {
  if (!xiaohongshuQrCode.value?.authCode) return
  if (xiaohongshuQrTimer) window.clearInterval(xiaohongshuQrTimer)
  await refreshXiaohongshuQrCode()
  xiaohongshuQrTimer = window.setInterval(refreshXiaohongshuQrCode, 1500)
}

async function refreshXiaohongshuQrCode() {
  if (!xiaohongshuQrCode.value?.authCode) return
  try {
    const key = xiaohongshuQrCode.value.accountKey || '_auto'
    const response = await fetch(`${apiBase}/xiaohongshu/account/${encodeURIComponent(key)}/qrcode/${encodeURIComponent(xiaohongshuQrCode.value.authCode)}/poll`, {
      method: 'POST',
    })
    const payload = await response.json()
    if (!response.ok) {
      throw new Error(payload.message || `HTTP ${response.status}`)
    }
    xiaohongshuQrMessage.value = payload.message || '等待扫码确认'
    if (payload.loggedIn) {
      xiaohongshuAccount.value = payload.account
      await loadXiaohongshuAccounts()
      xiaohongshuQrCode.value = null
      if (xiaohongshuQrTimer) {
        window.clearInterval(xiaohongshuQrTimer)
        xiaohongshuQrTimer = null
      }
    }
  } catch (err) {
    xiaohongshuError.value = err instanceof Error ? err.message : String(err)
  }
}

async function refreshXiaohongshuRow(row) {
  if (!row?.accountKey) return
  try {
    const response = await fetch(`${apiBase}/xiaohongshu/account?accountKey=${encodeURIComponent(row.accountKey)}`)
    const account = await response.json()
    if (!response.ok) {
      throw new Error(account.message || `HTTP ${response.status}`)
    }
    mergeXiaohongshuRow(account)
    xiaohongshuAccount.value = account
    xiaohongshuError.value = ''
  } catch (err) {
    xiaohongshuError.value = err instanceof Error ? err.message : String(err)
  }
}

async function saveXiaohongshuKey(row) {
  if (!row?.accountKey) return
  const nextKey = (row.draftKey || '').trim()
  if (!nextKey || nextKey === row.accountKey) return
  try {
    const response = await fetch(`${apiBase}/xiaohongshu/account/${encodeURIComponent(row.accountKey)}/key`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newAccountKey: nextKey }),
    })
    const payload = await response.json()
    if (!response.ok) {
      throw new Error(payload.message || `HTTP ${response.status}`)
    }
    mergeXiaohongshuRow(payload, row.slot)
    await loadXiaohongshuAccounts()
    xiaohongshuError.value = ''
  } catch (err) {
    xiaohongshuError.value = err instanceof Error ? err.message : String(err)
  }
}

async function startDouyinQrLogin(row) {
  try {
    const key = row?.accountKey || '_auto'
    douyinBusyKey.value = rowKey(row)
    const response = await fetch(`${apiBase}/douyin/account/qrcode?accountKey=${encodeURIComponent(key)}`, { method: 'POST' })
    const payload = await readJsonResponse(response)
    if (!response.ok) {
      throw new Error(payload.message || `HTTP ${response.status}`)
    }
    douyinQrCode.value = payload
    douyinQrMessage.value = '等待扫码确认'
    pollDouyinQrCode()
  } catch (err) {
    douyinError.value = err instanceof Error ? err.message : String(err)
  } finally {
    douyinBusyKey.value = ''
  }
}

async function pollDouyinQrCode() {
  if (!douyinQrCode.value?.authCode) return
  if (douyinQrTimer) window.clearInterval(douyinQrTimer)
  await refreshDouyinQrCode()
  douyinQrTimer = window.setInterval(refreshDouyinQrCode, 1500)
}

async function refreshDouyinQrCode() {
  if (!douyinQrCode.value?.authCode) return
  try {
    const key = douyinQrCode.value.accountKey || '_auto'
    const response = await fetch(`${apiBase}/douyin/account/${encodeURIComponent(key)}/qrcode/${encodeURIComponent(douyinQrCode.value.authCode)}/poll`, {
      method: 'POST',
    })
    const payload = await readJsonResponse(response)
    if (!response.ok) {
      throw new Error(payload.message || `HTTP ${response.status}`)
    }
    douyinQrMessage.value = payload.message || '等待扫码确认'
    if (payload.code === 'expired') {
      if (douyinQrTimer) {
        window.clearInterval(douyinQrTimer)
        douyinQrTimer = null
      }
    }
    if (payload.loggedIn) {
      douyinAccount.value = payload.account
      await loadDouyinAccounts()
      douyinQrCode.value = null
      if (douyinQrTimer) {
        window.clearInterval(douyinQrTimer)
        douyinQrTimer = null
      }
    }
  } catch (err) {
    douyinError.value = err instanceof Error ? err.message : String(err)
  }
}

async function refreshDouyinRow(row) {
  if (!row?.accountKey) return
  try {
    const response = await fetch(`${apiBase}/douyin/account?accountKey=${encodeURIComponent(row.accountKey)}`)
    const account = await readJsonResponse(response)
    if (!response.ok) {
      throw new Error(account.message || `HTTP ${response.status}`)
    }
    mergeDouyinRow(account)
    douyinAccount.value = account
    douyinError.value = ''
  } catch (err) {
    douyinError.value = err instanceof Error ? err.message : String(err)
  }
}

async function saveDouyinKey(row) {
  if (!row?.accountKey) return
  const nextKey = (row.draftKey || '').trim()
  if (!nextKey || nextKey === row.accountKey) return
  try {
    const response = await fetch(`${apiBase}/douyin/account/${encodeURIComponent(row.accountKey)}/key`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newAccountKey: nextKey }),
    })
    const payload = await readJsonResponse(response)
    if (!response.ok) {
      throw new Error(payload.message || `HTTP ${response.status}`)
    }
    mergeDouyinRow(payload, row.slot)
    await loadDouyinAccounts()
    douyinError.value = ''
  } catch (err) {
    douyinError.value = err instanceof Error ? err.message : String(err)
  }
}

async function markTaskReady(task) {
  if (!task?.taskId || task.status !== 'failed' || readyTaskId.value) return
  readyTaskId.value = task.taskId
  try {
    const response = await fetch(`${apiBase}/video-tasks/${encodeURIComponent(task.taskId)}/ready`, {
      method: 'POST',
    })
    if (!response.ok) {
      await throwApiError(response)
    }
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
  if (!task?.taskId || task.status !== 'running' || stopTaskId.value) return
  const confirmed = window.confirm(`确认停止任务？\n\n${displayTitle(task)}\n\n这会把当前任务标记为失败，已启动的 worker 进程不会被强制杀掉，但后续阶段不会继续排队。`)
  if (!confirmed) return
  stopTaskId.value = task.taskId
  try {
    const response = await fetch(`${apiBase}/video-tasks/${encodeURIComponent(task.taskId)}/stop`, {
      method: 'POST',
    })
    if (!response.ok) {
      await throwApiError(response)
    }
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
    const response = await fetch(`${apiBase}/video-tasks/${encodeURIComponent(task.taskId)}/restart`, {
      method: 'POST',
    })
    if (!response.ok) {
      await throwApiError(response)
    }
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
    const response = await fetch(`${apiBase}/video-tasks/${encodeURIComponent(task.taskId)}`, {
      method: 'DELETE',
    })
    if (!response.ok) {
      await throwApiError(response)
    }
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

async function openTaskFlow(task, stageKey = 'downloader') {
  if (!task?.taskId) return
  flowPageOpen.value = true
  selectedStageKey.value = SPEECH_STAGE_KEYS.includes(stageKey) ? SPEECH_STAGE_KEY : stageKey
  selectedTaskFlow.value = null
  cancelSpeechEdit()
  await loadTaskFlow(task.taskId)
  if (flowTimer) window.clearInterval(flowTimer)
  flowTimer = window.setInterval(() => {
    if (!selectedTaskFlow.value?.task?.id) return
    const status = selectedTaskFlow.value.task.status
    if (status === 'running' || status === 'ready') {
      loadTaskFlow(selectedTaskFlow.value.task.id, true)
    }
  }, 5000)
}

async function loadTaskFlow(taskId, quiet = false) {
  if (!taskId) return
  if (!quiet) {
    flowLoading.value = true
  }
  try {
    const response = await fetch(`${apiBase}/video-tasks/${encodeURIComponent(taskId)}/flow`)
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }
    selectedTaskFlow.value = await response.json()
    flowError.value = ''
  } catch (err) {
    flowError.value = err instanceof Error ? err.message : String(err)
  } finally {
    flowLoading.value = false
  }
}

function closeTaskFlow() {
  flowPageOpen.value = false
  selectedTaskFlow.value = null
  flowError.value = ''
  cancelSpeechEdit()
  if (flowTimer) {
    window.clearInterval(flowTimer)
    flowTimer = null
  }
}

function refreshTaskFlow() {
  const taskId = selectedTaskFlow.value?.task?.id
  if (taskId) {
    loadTaskFlow(taskId)
  }
}

function stageName(stageOrKey) {
  const key = typeof stageOrKey === 'string' ? stageOrKey : stageOrKey?.key
  return stageNameText[key] || key || ''
}

function logAudioEvent(eventName, asset, event) {
  const audio = event?.target
  const error = audio?.error
  const payload = {
    name: asset?.name || '',
    url: asset?.url || '',
    networkState: audio?.networkState,
    readyState: audio?.readyState,
    currentTime: audio?.currentTime,
    duration: audio?.duration,
    errorCode: error?.code,
    errorMessage: error ? audioErrorMessage(error.code) : '',
  }
  const logger = eventName === 'error' ? console.error : console.info
  logger('[monitor-audio]', eventName, payload)
}

function audioErrorMessage(code) {
  switch (code) {
    case 1:
      return 'MEDIA_ERR_ABORTED'
    case 2:
      return 'MEDIA_ERR_NETWORK'
    case 3:
      return 'MEDIA_ERR_DECODE'
    case 4:
      return 'MEDIA_ERR_SRC_NOT_SUPPORTED'
    default:
      return code ? `MEDIA_ERR_${code}` : ''
  }
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

function accountRows(accounts) {
  const rows = accounts.slice(0, 3).map((account, index) => ({
    ...account,
    slot: index + 1,
    draftKey: account.accountKey || '',
  }))
  while (rows.length < 3) {
    rows.push({
      slot: rows.length + 1,
      accountKey: '',
      draftKey: '',
      uname: '',
      mid: '',
      valid: false,
      message: '空',
    })
  }
  return rows
}

function mergeAccountRow(account, preferredSlot) {
  const rows = [...bilibiliRows.value]
  let index = rows.findIndex(row => row.accountKey === account.accountKey)
  if (index < 0 && preferredSlot) {
    index = rows.findIndex(row => row.slot === preferredSlot)
  }
  if (index < 0) {
    index = rows.findIndex(row => !row.accountKey)
  }
  if (index < 0) {
    index = 0
  }
  rows[index] = {
    ...account,
    slot: rows[index]?.slot || index + 1,
    draftKey: account.accountKey || '',
  }
  bilibiliRows.value = accountRows(rows.filter(row => row.accountKey))
}

function mergeXiaohongshuRow(account, preferredSlot) {
  const rows = [...xiaohongshuRows.value]
  let index = rows.findIndex(row => row.accountKey === account.accountKey)
  if (index < 0 && preferredSlot) {
    index = rows.findIndex(row => row.slot === preferredSlot)
  }
  if (index < 0) {
    index = rows.findIndex(row => !row.accountKey)
  }
  if (index < 0) {
    index = 0
  }
  rows[index] = {
    ...account,
    slot: rows[index]?.slot || index + 1,
    draftKey: account.accountKey || '',
  }
  xiaohongshuRows.value = accountRows(rows.filter(row => row.accountKey))
}

function mergeDouyinRow(account, preferredSlot) {
  const rows = [...douyinRows.value]
  let index = rows.findIndex(row => row.accountKey === account.accountKey)
  if (index < 0 && preferredSlot) {
    index = rows.findIndex(row => row.slot === preferredSlot)
  }
  if (index < 0) {
    index = rows.findIndex(row => !row.accountKey)
  }
  if (index < 0) {
    index = 0
  }
  rows[index] = {
    ...account,
    slot: rows[index]?.slot || index + 1,
    draftKey: account.accountKey || '',
  }
  douyinRows.value = accountRows(rows.filter(row => row.accountKey))
}

function rowKey(row) {
  return row?.accountKey || `slot_${row?.slot || 0}`
}

function rowStatus(row) {
  if (!row.accountKey) return '空'
  if (row.valid === true) return '已登录'
  if (row.valid === false) return '未登录'
  return row.message || '已保存'
}

function accountDisplay(row, platform) {
  if (!row.accountKey) return '-'
  if (platform === 'bilibili') {
    return `${row.uname || '-'}${row.mid ? ` · UID ${row.mid}` : ''}`
  }
  return `${row.nickname || '-'}${row.userId ? ` · ${row.userId}` : ''}`
}

function formatDuration(seconds) {
  const total = Math.max(0, Math.round(Number(seconds || 0)))
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const secs = total % 60
  if (hours > 0) {
    return `${hours}:${pad(minutes)}:${pad(secs)}`
  }
  return `${minutes}:${pad(secs)}`
}

function pad(value) {
  return String(value).padStart(2, '0')
}

function displayTitle(task) {
  const title = String(task.title || '').trim()
  if (title && !isWatchUrl(title)) return title
  return task.taskId || '未命名任务'
}

function taskSourceUrl(task) {
  return String(task?.sourceWebpageUrl || task?.sourceUrl || '').trim()
}

function sourceDurationSeconds(task) {
  const value = Number(task?.sourceDurationSeconds)
  return Number.isFinite(value) && value > 0 ? value : null
}

function isWatchUrl(value) {
  try {
    const parsed = new URL(value)
    return ['youtube.com', 'www.youtube.com', 'm.youtube.com'].includes(parsed.hostname) && parsed.pathname === '/watch'
  } catch {
    return /^https?:\/\/(www\.)?youtube\.com\/watch\b/.test(value)
  }
}

function uploadAccountText(task) {
  const name = String(task.bilibiliUploadAccountName || '').trim()
  const uid = String(task.bilibiliUploadUid || '').trim()
  if (name && uid) return `${name} · UID ${uid}`
  return name || (uid ? `UID ${uid}` : '')
}

function formatDateTime(value) {
  if (!value) return '-'
  return String(value).replace('T', ' ').slice(0, 19)
}

function formatLastSeen(device) {
  return device?.online ? '在线' : '离线'
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
  parts.push(`耗时 ${formatDuration(node.elapsedSeconds)}`)
  if (node.errorMessage) {
    parts.push(node.errorMessage)
  }
  return parts.join('\n')
}

function nodeProgress(node) {
  if (!Number.isFinite(Number(node.totalCount)) || Number(node.totalCount) <= 0) {
    return ''
  }
  return `${Number(node.completedCount || 0)}/${Number(node.totalCount)}`
}

function flowTaskTitle(flow) {
  const task = flow?.task || {}
  return task.title || flow?.videoInfo?.title || task.id || '任务详情'
}

function flowCoverUrl(flow) {
  return flow?.videoInfo?.source_thumbnail_url || flow?.task?.source_thumbnail_url || ''
}

function flowSourceUrl(flow) {
  return flow?.videoInfo?.source_webpage_url || flow?.videoInfo?.source_url || flow?.task?.source_url || ''
}

function flowDurationSeconds(flow) {
  const value = Number(flow?.videoInfo?.source_duration_seconds || flow?.task?.source_duration_seconds)
  return Number.isFinite(value) && value > 0 ? value : null
}

function fieldValueText(value) {
  if (value === null || value === undefined || value === '') return '-'
  if (typeof value === 'object') return formatJson(value)
  return String(value)
}

function shortValue(value, max = 180) {
  const text = fieldValueText(value)
  return text.length > max ? `${text.slice(0, max)}...` : text
}

function formatJson(value) {
  if (value === null || value === undefined || value === '') return ''
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return ''
    try {
      return JSON.stringify(JSON.parse(trimmed), null, 2)
    } catch {
      return trimmed
    }
  }
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

function isLongValue(value) {
  const text = fieldValueText(value)
  return text.length > 120 || text.includes('\n') || looksJson(text)
}

function looksJson(value) {
  const text = String(value || '').trim()
  return (text.startsWith('{') && text.endsWith('}')) || (text.startsWith('[') && text.endsWith(']'))
}

function tableColumns(table) {
  const columns = []
  const seen = new Set()
  for (const row of table?.rows || []) {
    for (const key of Object.keys(row || {})) {
      if (!seen.has(key) && !hiddenColumn(key)) {
        seen.add(key)
        columns.push(key)
      }
    }
  }
  return columns.sort((left, right) => columnRank(left) - columnRank(right))
}

function hiddenColumn(column) {
  return ['created_at', 'updated_at', 'words_json'].includes(column)
}

function columnRank(column) {
  if (column === 'item_index' || column === 'index') return -20
  if (column === 'id') return -10
  return 0
}

function tableCellText(column, value) {
  if (['start_time', 'end_time', 'actual_start_time', 'actual_end_time'].includes(column)) {
    return formatTimeline(value)
  }
  return shortValue(value, 90)
}

function tableCellSummary(column, value) {
  if (['start_time', 'end_time', 'actual_start_time', 'actual_end_time'].includes(column)) {
    return formatTimeline(value)
  }
  return shortValue(value, 70)
}

function speechRows() {
  const stages = selectedTaskFlow.value?.stages || []
  const whisper = stages.find(stage => stage.key === 'whisper')
  const speaker = stages.find(stage => stage.key === 'speaker') || stages.find(stage => stage.key === 'translator')
  const asrSegments = tableRows(whisper, 'yd_asr_segment')
  const fixedAsr = asrSegments.filter(row => row.segment_type === 'fixed')
  const rawAsr = asrSegments.filter(row => row.segment_type === 'raw')
  const asrByIndex = rowsByIndex(fixedAsr.length ? fixedAsr : rawAsr)
  const speakerByIndex = rowsByIndex(tableRows(speaker, 'yd_speaker_segment'))
  const indexes = [...new Set([...Object.keys(asrByIndex), ...Object.keys(speakerByIndex)])]
    .map(index => Number(index))
    .filter(index => Number.isFinite(index))
    .sort((left, right) => left - right)
  return indexes.map(index => {
    const asr = asrByIndex[index] || {}
    const segment = speakerByIndex[index] || {}
    return {
      segment_id: segment.id || '',
      item_index: index,
      start_time: segment.start_time ?? asr.start_time,
      end_time: segment.end_time ?? asr.end_time,
      asr_text: asr.text || '',
      src_text: segment.src_text || '',
      dst_text: segment.dst_text || '',
      speaker: segment.speaker || asr.speaker || '',
      status: segment.status || '',
      attempt_count: segment.attempt_count ?? '',
      speed_ratio: formatRatio(segment.speed_ratio),
      reference_wav_url: segment.reference_wav_url || '',
      tts_wav_url: segment.tts_wav_url || '',
      error_message: segment.error_message || '',
    }
  })
}

function tableRows(stage, tableName) {
  return stage?.tables?.find(table => table.name === tableName)?.rows || []
}

function rowsByIndex(rows) {
  const byIndex = {}
  for (const row of rows || []) {
    const index = Number(row.item_index ?? row.index)
    if (Number.isFinite(index)) {
      byIndex[index] = row
    }
  }
  return byIndex
}

function speechColumns() {
  return [
    'item_index',
    'asr_text',
    'src_text',
    'dst_text',
    'reference_wav_url',
    'tts_wav_url',
    'more_info',
  ]
}

function showSpeechColumn(row, column) {
  if (column === 'asr_text') {
    return !sameText(row.asr_text, row.src_text)
  }
  return true
}

function sameText(left, right) {
  return normalizeText(left) !== '' && normalizeText(left) === normalizeText(right)
}

function normalizeText(value) {
  return String(value || '').trim().replace(/\s+/g, ' ')
}

function speechMoreRows(row) {
  return [
    ['segment_id', row.segment_id || '-'],
    ['start_time', formatTimeline(row.start_time)],
    ['end_time', formatTimeline(row.end_time)],
    ['speaker', row.speaker || '-'],
    ['status', row.status || '-'],
    ['attempt_count', row.attempt_count === '' ? '-' : row.attempt_count],
    ['speed_ratio', row.speed_ratio || '-'],
    ['error_message', row.error_message || '-'],
  ]
}

function speechRowKey(row) {
  return row?.segment_id ? String(row.segment_id) : `index:${row?.item_index ?? ''}`
}

function canEditSpeechDstText(row) {
  return Boolean(selectedTaskFlow.value?.task?.id && row?.segment_id)
}

function isEditingSpeechDstText(row) {
  return speechEditKey.value === speechRowKey(row)
}

function beginSpeechEdit(row) {
  if (!canEditSpeechDstText(row) || speechEditSaving.value) return
  speechEditKey.value = speechRowKey(row)
  speechEditDraft.value = row.dst_text || ''
  speechEditError.value = ''
}

function cancelSpeechEdit() {
  speechEditKey.value = ''
  speechEditDraft.value = ''
  speechEditError.value = ''
}

async function saveSpeechDstText(row) {
  const taskId = selectedTaskFlow.value?.task?.id
  if (!taskId || !row?.segment_id || speechEditSaving.value) return
  speechEditSaving.value = true
  speechEditError.value = ''
  try {
    const response = await fetch(`${apiBase}/video-tasks/${encodeURIComponent(taskId)}/speaker-segments/${encodeURIComponent(row.segment_id)}/dst-text`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dstText: speechEditDraft.value }),
    })
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }
    await response.json()
    cancelSpeechEdit()
    await loadTaskFlow(taskId, true)
  } catch (err) {
    speechEditError.value = err instanceof Error ? err.message : String(err)
  } finally {
    speechEditSaving.value = false
  }
}

function formatRatio(value) {
  if (value === null || value === undefined || value === '') return ''
  const number = Number(value)
  return Number.isFinite(number) ? number.toFixed(2) : String(value)
}

function speechAudioAsset(row, column) {
  const url = String(row?.[column] || '').trim()
  if (!url) return null
  return {
    name: column,
    kind: 'audio',
    url,
  }
}

function formatTimeline(value) {
  if (value === null || value === undefined || value === '') return '-'
  const totalMs = Math.max(0, Number(value || 0))
  if (!Number.isFinite(totalMs)) return String(value)
  const minutes = Math.floor(totalMs / 60000)
  const seconds = (totalMs % 60000) / 1000
  return `${minutes}:${seconds.toFixed(3).padStart(6, '0')}`
}

function stageMedia(stage) {
  const items = []
  const seen = new Set()
  function add(asset, fallbackName, value) {
    if (!asset?.url || seen.has(asset.url)) return
    seen.add(asset.url)
    items.push({
      name: asset.name || fallbackName,
      kind: asset.kind || kindForName(asset.url || value),
      url: asset.url,
      objectName: asset.objectName || '',
    })
  }
  for (const field of [...(stage?.inputs || []), ...(stage?.outputs || [])]) {
    add(field.asset, field.name, field.value)
  }
  for (const table of stage?.tables || []) {
    for (const row of table.rows || []) {
      for (const [key, value] of Object.entries(row || {})) {
        const asset = assetFromValue(key, value, stage.key)
        add(asset, key, value)
      }
    }
  }
  return items.filter(item => ['video', 'audio', 'image'].includes(item.kind)).slice(0, 30)
}

function assetFromValue(name, value, stageKey) {
  const text = String(value || '').trim()
  if (!text || text.startsWith('db://')) return null
  if (text.startsWith('http://') || text.startsWith('https://')) {
    return { name, stage: stageKey, kind: kindForField(name, text), url: text }
  }
  return null
}

function kindForField(fieldName, name) {
  const lowerField = String(fieldName || '').toLowerCase()
  if (lowerField.includes('audio') || lowerField.includes('wav')) return 'audio'
  if (lowerField.includes('video')) return 'video'
  if (lowerField.includes('thumbnail') || lowerField.includes('cover')) return 'image'
  return kindForName(name)
}

function kindForName(name) {
  const lower = String(name || '').toLowerCase().split('?')[0]
  if (/\.(mp4|mov|m4v|webm)$/.test(lower)) return 'video'
  if (/\.(wav|mp3|m4a|aac|flac|ogg|webm)$/.test(lower)) return 'audio'
  if (/\.(png|jpg|jpeg|webp|gif)$/.test(lower)) return 'image'
  if (/\.json$/.test(lower)) return 'json'
  return 'file'
}

function fieldRows(stage) {
  return [
    ...(stage?.inputs || []).map(field => ({ ...field, direction: 'Input' })),
    ...(stage?.outputs || []).map(field => ({ ...field, direction: 'Output' })),
  ]
}

function qrImageUrl(url) {
  if (!url) return ''
  return `https://api.qrserver.com/v1/create-qr-code/?size=184x184&data=${encodeURIComponent(url)}`
}

onMounted(() => {
  loadTasks()
  loadAccountPage()
  timer = window.setInterval(loadTasks, 2000)
})

onUnmounted(() => {
  if (timer) {
    window.clearInterval(timer)
  }
  if (bilibiliQrTimer) {
    window.clearInterval(bilibiliQrTimer)
  }
  if (xiaohongshuQrTimer) {
    window.clearInterval(xiaohongshuQrTimer)
  }
  if (douyinQrTimer) {
    window.clearInterval(douyinQrTimer)
  }
  if (flowTimer) {
    window.clearInterval(flowTimer)
  }
})
</script>

<template>
  <main :class="['page-shell', flowPageOpen ? 'flow-page-shell' : '']">
    <template v-if="!flowPageOpen">
    <header class="top-bar">
      <div>
        <h1>视频生成监控</h1>
        <p>任务链路实时状态</p>
      </div>
      <nav class="page-tabs" aria-label="页面切换">
        <button type="button" :class="{ active: activePage === 'monitor' }" @click="activePage = 'monitor'">监控</button>
        <button type="button" :class="{ active: activePage === 'accounts' }" @click="activePage = 'accounts'; loadAccountPage()">账号管理</button>
      </nav>
      <div class="summary-strip" aria-label="任务汇总">
        <span><strong>{{ summary.total }}</strong> 总数</span>
        <span><strong>{{ summary.running }}</strong> 处理中</span>
        <span><strong>{{ summary.failed }}</strong> 失败</span>
        <span><strong>{{ summary.success }}</strong> 成功</span>
      </div>
    </header>

    <template v-if="activePage === 'monitor'">
    <section class="status-line">
      <span :class="['dot', error ? 'dot-failed' : 'dot-success']"></span>
      <span v-if="error">接口异常：{{ error }}</span>
      <span v-else-if="loading">正在加载</span>
      <span v-else>最后刷新：{{ serverTime || '本地时间' }}</span>
    </section>

    <section class="heartbeat-panel" aria-label="服务设备在线状态">
      <div class="heartbeat-head">
        <div>
          <h2>服务设备</h2>
          <p>{{ onlineSummary.online }} / {{ onlineSummary.total }} 在线 · 60 秒内有数据库查询记录</p>
        </div>
      </div>

      <div class="heartbeat-table">
        <div class="heartbeat-row heartbeat-header">
          <span>服务</span>
          <span v-for="device in serviceHeartbeats[0]?.devices || []" :key="device.deviceName">
            {{ device.deviceName }}
          </span>
        </div>
        <div v-for="service in serviceHeartbeats" :key="service.serviceName" class="heartbeat-row">
          <strong>{{ service.serviceName }}</strong>
          <span
            v-for="device in service.devices"
            :key="device.deviceName"
            :class="['device-pill', device.online ? 'device-online' : 'device-offline']"
            :title="formatDateTime(device.lastSeenAt)"
          >
            <span :class="['dot', device.online ? 'dot-success' : 'dot-muted']"></span>
            <span class="device-name">{{ device.deviceName }}</span>
            {{ formatLastSeen(device) }}
          </span>
        </div>
      </div>
    </section>

    <section class="task-list" aria-label="任务列表">
      <div class="task-filter-bar" aria-label="任务状态筛选">
        <button
          v-for="filter in taskStatusFilters"
          :key="filter.key"
          type="button"
          :class="['task-filter-button', { active: taskStatusFilter === filter.key }]"
          @click="taskStatusFilter = filter.key"
        >
          <span>{{ filter.label }}</span>
          <strong>{{ taskFilterCounts[filter.key] || 0 }}</strong>
        </button>
      </div>

      <div v-if="!loading && tasks.length === 0" class="empty-state">
        暂无任务
      </div>
      <div v-else-if="!loading && filteredTasks.length === 0" class="empty-state">
        当前筛选下暂无任务
      </div>

      <article v-for="task in filteredTasks" :key="task.taskId" class="task-row">
        <div class="task-meta">
          <div class="task-title-row">
            <h2>
              <a
                v-if="taskSourceUrl(task)"
                :href="taskSourceUrl(task)"
                target="_blank"
                rel="noreferrer"
                :title="taskSourceUrl(task)"
              >
                {{ displayTitle(task) }}
              </a>
              <template v-else>{{ displayTitle(task) }}</template>
            </h2>
            <span :class="['task-badge', `status-${task.status}`]">
              {{ statusText[task.status] || task.status }}
            </span>
            <button
              v-if="task.status === 'failed'"
              type="button"
              class="retry-button"
              :disabled="isTaskReadyBusy(task)"
              title="把任务切回排队中"
              @click="markTaskReady(task)"
            >
              {{ isTaskReadyBusy(task) ? '处理中' : '重试' }}
            </button>
            <button
              v-if="task.status === 'running'"
              type="button"
              class="stop-button"
              :disabled="isTaskStopBusy(task)"
              title="停止任务并阻止后续阶段继续排队"
              @click="stopTask(task)"
            >
              {{ isTaskStopBusy(task) ? '处理中' : '停止' }}
            </button>
            <button
              v-if="task.status !== 'running'"
              type="button"
              class="restart-button"
              :disabled="isTaskRestartBusy(task)"
              title="删除已生成结果并从 downloader 重新开始"
              @click="restartTask(task)"
            >
              {{ isTaskRestartBusy(task) ? '处理中' : '从头开始' }}
            </button>
            <button
              v-if="task.status !== 'running'"
              type="button"
              class="delete-button"
              :disabled="isTaskDeleteBusy(task)"
              title="永久删除任务数据库记录和 MinIO 文件"
              @click="deleteTask(task)"
            >
              {{ isTaskDeleteBusy(task) ? '处理中' : '删除' }}
            </button>
          </div>
          <div class="task-details">
            <span>{{ task.taskId }}</span>
            <span v-if="sourceDurationSeconds(task) !== null">视频时长 {{ formatDuration(sourceDurationSeconds(task)) }}</span>
            <span v-if="uploadAccountText(task)" class="upload-account">投稿账号 {{ uploadAccountText(task) }}</span>
            <span>总耗时 {{ formatDuration(task.elapsedSeconds) }}</span>
          </div>
          <p v-if="task.errorMessage" class="task-error">{{ task.errorMessage }}</p>
        </div>

        <div class="stage-chain" aria-label="阶段链路">
          <template v-for="(node, index) in task.nodes" :key="node.key">
            <button
              type="button"
              :class="['stage-node', 'stage-node-button', `status-${node.status}`]"
              :title="`${nodeTitle(node)}\n点击查看任务流详情`"
              @click="openTaskFlow(task, node.key)"
            >
              <span class="stage-label">{{ stageName(node) }}</span>
              <span v-if="nodeProgress(node)" class="stage-progress">{{ nodeProgress(node) }}</span>
              <span class="stage-time">{{ formatDuration(node.elapsedSeconds) }}</span>
            </button>
            <div
              v-if="index < task.nodes.length - 1"
              :class="['stage-link', `status-${node.status}`]"
              aria-hidden="true"
            ></div>
          </template>
        </div>
        <div
          v-for="node in task.nodes"
          v-show="openFailureKey === failureKey(task, node)"
          :key="`${node.key}-failure`"
          class="failure-panel"
        >
          <div class="failure-panel-head">
            <strong>{{ stageName(node) }}失败原因</strong>
            <button type="button" @click="openFailureKey = ''">收起</button>
          </div>
          <pre>{{ failureDetails(node) }}</pre>
        </div>
      </article>
    </section>
    </template>

    <template v-else-if="activePage === 'accounts'">
      <section class="account-page" aria-label="账号管理">
        <section class="biliup-panel" aria-label="B站账号管理">
          <div class="biliup-head">
            <div>
              <h2>B站账号</h2>
              <p v-if="bilibiliAccount">已保存 {{ bilibiliAccounts.length }} 个账号</p>
              <p v-else>{{ bilibiliError ? `B站账号异常：${bilibiliError}` : '正在检测 B站账号' }}</p>
            </div>
            <div class="biliup-actions">
              <button type="button" @click="loadBiliupStatus">刷新状态</button>
            </div>
          </div>

          <div class="account-table" aria-label="B站账号表">
            <div class="account-row account-header">
              <span>槽位</span>
              <span>Key</span>
              <span>账号</span>
              <span>状态</span>
              <span>操作</span>
            </div>
            <div v-for="row in bilibiliRows" :key="row.slot" class="account-row">
              <strong>{{ row.slot }}</strong>
              <input v-model="row.draftKey" type="text" :placeholder="row.accountKey ? '账号 key' : '登录后自动生成'" />
              <span>{{ accountDisplay(row, 'bilibili') }}</span>
              <span>{{ rowStatus(row) }}</span>
              <span class="account-actions">
                <button type="button" @click="startBilibiliQrLogin(row)">
                  {{ row.accountKey ? '重新扫码' : '扫码登录' }}
                </button>
                <button type="button" :disabled="!row.accountKey" @click="refreshBilibiliRow(row)">刷新</button>
                <button type="button" :disabled="!row.accountKey || bilibiliRenewing" @click="renewBilibiliAccount(row)">
                  {{ bilibiliBusyKey === rowKey(row) ? '续期中' : '续期' }}
                </button>
                <button type="button" :disabled="!row.accountKey || row.draftKey === row.accountKey" @click="saveBilibiliKey(row)">保存Key</button>
              </span>
            </div>
          </div>

          <div v-if="bilibiliQrCode" class="bilibili-login">
            <img :src="qrImageUrl(bilibiliQrCode.url)" alt="B站登录二维码" />
            <div>
              <strong>{{ bilibiliQrMessage }}</strong>
              <a :href="bilibiliQrCode.url" target="_blank" rel="noreferrer">打开登录链接</a>
            </div>
          </div>

          <p v-if="bilibiliError" class="inline-error">{{ bilibiliError }}</p>
        </section>

        <section class="biliup-panel" aria-label="小红书账号管理">
          <div class="biliup-head">
            <div>
              <h2>小红书账号</h2>
              <p v-if="xiaohongshuAccount">已保存 {{ xiaohongshuAccounts.length }} 个账号</p>
              <p v-else>{{ xiaohongshuError ? `小红书账号异常：${xiaohongshuError}` : '正在检测小红书账号' }}</p>
            </div>
            <div class="biliup-actions">
              <button type="button" @click="loadXiaohongshuStatus">刷新状态</button>
            </div>
          </div>

          <div class="account-table" aria-label="小红书账号表">
            <div class="account-row account-header">
              <span>槽位</span>
              <span>Key</span>
              <span>账号</span>
              <span>状态</span>
              <span>操作</span>
            </div>
            <div v-for="row in xiaohongshuRows" :key="row.slot" class="account-row">
              <strong>{{ row.slot }}</strong>
              <input v-model="row.draftKey" type="text" :placeholder="row.accountKey ? '账号 key' : '登录后自动生成'" />
              <span>{{ accountDisplay(row, 'xiaohongshu') }}</span>
              <span>{{ rowStatus(row) }}</span>
              <span class="account-actions">
                <button type="button" @click="startXiaohongshuQrLogin(row)">
                  {{ row.accountKey ? '重新扫码' : '扫码登录' }}
                </button>
                <button type="button" :disabled="!row.accountKey" @click="refreshXiaohongshuRow(row)">刷新</button>
                <button type="button" :disabled="!row.accountKey || row.draftKey === row.accountKey" @click="saveXiaohongshuKey(row)">保存Key</button>
              </span>
            </div>
          </div>

          <div v-if="xiaohongshuQrCode" class="bilibili-login">
            <img :src="xiaohongshuQrCode.imageDataUrl" alt="小红书登录二维码" />
            <div>
              <strong>{{ xiaohongshuQrMessage }}</strong>
              <span>请用小红书 App 扫码并确认登录</span>
            </div>
          </div>

          <p v-if="xiaohongshuError" class="inline-error">{{ xiaohongshuError }}</p>
        </section>

        <section class="biliup-panel" aria-label="抖音账号管理">
          <div class="biliup-head">
            <div>
              <h2>抖音账号</h2>
              <p v-if="douyinAccount">已保存 {{ douyinAccounts.length }} 个账号</p>
              <p v-else>{{ douyinError ? `抖音账号异常：${douyinError}` : '正在检测抖音账号' }}</p>
            </div>
            <div class="biliup-actions">
              <button type="button" @click="loadDouyinStatus">刷新状态</button>
            </div>
          </div>

          <div class="account-table" aria-label="抖音账号表">
            <div class="account-row account-header">
              <span>槽位</span>
              <span>Key</span>
              <span>账号</span>
              <span>状态</span>
              <span>操作</span>
            </div>
            <div v-for="row in douyinRows" :key="row.slot" class="account-row">
              <strong>{{ row.slot }}</strong>
              <input v-model="row.draftKey" type="text" :placeholder="row.accountKey ? '账号 key' : '登录后自动生成'" />
              <span>{{ accountDisplay(row, 'douyin') }}</span>
              <span>{{ rowStatus(row) }}</span>
              <span class="account-actions">
                <button type="button" @click="startDouyinQrLogin(row)">
                  {{ row.accountKey ? '重新扫码' : '扫码登录' }}
                </button>
                <button type="button" :disabled="!row.accountKey" @click="refreshDouyinRow(row)">刷新</button>
                <button type="button" :disabled="!row.accountKey || row.draftKey === row.accountKey" @click="saveDouyinKey(row)">保存Key</button>
              </span>
            </div>
          </div>

          <div v-if="douyinQrCode" class="bilibili-login">
            <img :src="douyinQrCode.imageDataUrl" alt="抖音登录二维码" />
            <div>
              <strong>{{ douyinQrMessage }}</strong>
              <span>请用抖音 App 扫码并确认登录</span>
            </div>
          </div>

          <p v-if="douyinError" class="inline-error">{{ douyinError }}</p>
        </section>
      </section>
    </template>
    </template>

    <template v-else>
      <section class="flow-page" aria-label="任务流详情">
        <header class="flow-header">
          <div>
            <h2>{{ flowTaskTitle(selectedTaskFlow) }}</h2>
            <p>
              {{ selectedTaskFlow?.task?.id || '加载中' }}
              <template v-if="selectedTaskFlow?.task?.status">
                · {{ statusText[selectedTaskFlow.task.status] || selectedTaskFlow.task.status }}
              </template>
              <template v-if="selectedTaskFlow?.task?.current_stage">
                · current {{ selectedTaskFlow.task.current_stage }}
              </template>
              <template v-if="flowDurationSeconds(selectedTaskFlow) !== null">
                · 视频时长 {{ formatDuration(flowDurationSeconds(selectedTaskFlow)) }}
              </template>
            </p>
          </div>
          <div class="flow-actions">
            <button type="button" :disabled="flowLoading" @click="refreshTaskFlow">
              {{ flowLoading ? 'Refreshing' : 'Refresh' }}
            </button>
            <button type="button" @click="closeTaskFlow">Back</button>
          </div>
        </header>

        <div v-if="flowError" class="flow-error">Task flow API error: {{ flowError }}</div>
        <div v-else-if="flowLoading && !selectedTaskFlow" class="flow-loading">Loading task flow</div>
        <template v-else-if="selectedTaskFlow">
          <div class="flow-summary">
            <a
              v-if="flowSourceUrl(selectedTaskFlow)"
              class="source-cover-link"
              :href="flowSourceUrl(selectedTaskFlow)"
              target="_blank"
              rel="noreferrer"
              title="打开原视频"
            >
              <img v-if="flowCoverUrl(selectedTaskFlow)" :src="flowCoverUrl(selectedTaskFlow)" alt="" />
              <span v-else>原视频</span>
            </a>
          </div>

          <nav class="flow-tabs" aria-label="阶段详情标签">
            <button
              v-for="stage in flowTabs"
              :key="stage.key"
              type="button"
              :class="['flow-tab', stage.key === SPEECH_STAGE_KEY ? 'flow-tab-wide' : '', selectedStageKey === stage.key ? 'flow-tab-active' : '']"
              @click="selectedStageKey = stage.key"
            >
              <span :class="['dot', stage.status === 'failed' ? 'dot-failed' : stage.status === 'success' ? 'dot-success' : stage.status === 'running' ? 'dot-running' : 'dot-muted']"></span>
              <span>{{ stageName(stage) }}</span>
            </button>
          </nav>

          <section v-if="selectedStage" class="flow-stage">
            <div class="flow-stage-head">
              <div>
                <h3>{{ stageName(selectedStage) }}</h3>
                <p>
                  {{ statusText[selectedStage.status] || selectedStage.status }}
                  · 耗时 {{ formatDuration(selectedStage.elapsedSeconds) }}
                  <template v-if="selectedStage.operator"> · {{ selectedStage.operator }}</template>
                </p>
              </div>
              <span :class="['task-badge', `status-${selectedStage.status}`]">
                {{ statusText[selectedStage.status] || selectedStage.status }}
              </span>
            </div>

            <pre v-if="selectedStage.errorMessage" class="flow-stage-error">{{ selectedStage.errorMessage }}</pre>

            <div v-if="selectedStageKey === SPEECH_STAGE_KEY" class="flow-section">
              <h4>Whisper / Translator / Speaker Joined Rows</h4>
              <div class="raw-table-scroll">
                <table class="speech-table">
                  <thead>
                    <tr>
                      <th v-for="column in speechColumns()" :key="column">{{ column }}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="row in speechRows()" :key="row.item_index">
                      <td v-for="column in speechColumns()" :key="column">
                        <template v-if="!showSpeechColumn(row, column)"></template>
                        <template v-else-if="column === 'reference_wav_url' || column === 'tts_wav_url'">
                          <audio
                            v-if="speechAudioAsset(row, column)"
                            :src="speechAudioAsset(row, column).url"
                            controls
                            preload="none"
                            @loadstart="event => logAudioEvent('loadstart', speechAudioAsset(row, column), event)"
                            @play="event => logAudioEvent('play', speechAudioAsset(row, column), event)"
                            @playing="event => logAudioEvent('playing', speechAudioAsset(row, column), event)"
                            @waiting="event => logAudioEvent('waiting', speechAudioAsset(row, column), event)"
                            @error="event => logAudioEvent('error', speechAudioAsset(row, column), event)"
                          ></audio>
                          <span v-else>-</span>
                        </template>
                        <details v-else-if="column === 'more_info'" class="speech-more">
                          <summary>More</summary>
                          <dl>
                            <template v-for="[name, value] in speechMoreRows(row)" :key="name">
                              <dt>{{ name }}</dt>
                              <dd>{{ value }}</dd>
                            </template>
                          </dl>
                        </details>
                        <div v-else-if="column === 'dst_text'" class="speech-text-cell speech-edit-cell">
                          <template v-if="isEditingSpeechDstText(row)">
                            <textarea
                              v-model="speechEditDraft"
                              class="speech-edit-textarea"
                              rows="5"
                            ></textarea>
                            <div class="speech-edit-actions">
                              <button type="button" :disabled="speechEditSaving" @click="saveSpeechDstText(row)">
                                {{ speechEditSaving ? 'Saving' : 'Save' }}
                              </button>
                              <button type="button" :disabled="speechEditSaving" @click="cancelSpeechEdit">Cancel</button>
                            </div>
                            <p v-if="speechEditError" class="speech-edit-error">{{ speechEditError }}</p>
                          </template>
                          <template v-else>
                            <p>{{ row.dst_text || '-' }}</p>
                            <button
                              v-if="canEditSpeechDstText(row)"
                              type="button"
                              class="speech-edit-button"
                              @click="beginSpeechEdit(row)"
                            >
                              Edit
                            </button>
                          </template>
                        </div>
                        <p v-else-if="column === 'asr_text' || column === 'src_text'" class="speech-text-cell">
                          {{ row[column] || '-' }}
                        </p>
                        <span v-else-if="!isLongValue(row[column])">{{ tableCellText(column, row[column]) }}</span>
                        <details v-else>
                          <summary>{{ tableCellSummary(column, row[column]) }}</summary>
                          <pre>{{ formatJson(row[column]) }}</pre>
                        </details>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div v-if="selectedStageKey !== SPEECH_STAGE_KEY && stageMedia(selectedStage).length" class="flow-section">
              <h4>Media Preview</h4>
              <div class="media-grid">
                <article v-for="asset in stageMedia(selectedStage)" :key="asset.url" class="media-item">
                  <div class="media-title">
                    <strong>{{ asset.name }}</strong>
                    <a :href="asset.url" target="_blank" rel="noreferrer">打开</a>
                  </div>
                  <video v-if="asset.kind === 'video'" :src="asset.url" controls preload="metadata"></video>
                  <audio
                    v-else-if="asset.kind === 'audio'"
                    :src="asset.url"
                    controls
                    preload="none"
                    @loadstart="event => logAudioEvent('loadstart', asset, event)"
                    @play="event => logAudioEvent('play', asset, event)"
                    @playing="event => logAudioEvent('playing', asset, event)"
                    @waiting="event => logAudioEvent('waiting', asset, event)"
                    @error="event => logAudioEvent('error', asset, event)"
                  ></audio>
                  <img v-else-if="asset.kind === 'image'" :src="asset.url" alt="" />
                  <p v-if="asset.objectName">{{ asset.objectName }}</p>
                </article>
              </div>
            </div>

            <div v-if="selectedStageKey !== SPEECH_STAGE_KEY" class="flow-section">
              <h4>Inputs / Outputs</h4>
              <div v-if="fieldRows(selectedStage).length" class="field-table">
                <div class="field-row field-header">
                  <span>Type</span>
                  <span>Field</span>
                  <span>Value</span>
                </div>
                <div v-for="field in fieldRows(selectedStage)" :key="`${field.direction}-${field.name}`" class="field-row">
                  <strong>{{ field.direction }}</strong>
                  <span>{{ field.name }}</span>
                  <span>
                    <a v-if="field.asset?.url" :href="field.asset.url" target="_blank" rel="noreferrer">
                      {{ shortValue(field.value) }}
                    </a>
                    <template v-else>{{ shortValue(field.value) }}</template>
                  </span>
                  <pre v-if="isLongValue(field.value)" class="field-long">{{ formatJson(field.value) }}</pre>
                </div>
              </div>
              <p v-else class="flow-muted">No input or output fields.</p>
            </div>

            <div v-if="selectedStageKey !== SPEECH_STAGE_KEY" class="flow-section">
              <h4>Database Rows</h4>
              <div v-if="selectedStage.tables?.length" class="table-stack">
                <article v-for="table in selectedStage.tables" :key="table.name" class="raw-table">
                  <div class="raw-table-head">
                    <strong>{{ table.name }}</strong>
                    <span>{{ table.rows.length }} rows<template v-if="table.truncated">, truncated</template></span>
                  </div>
                  <div class="raw-table-scroll">
                    <table>
                      <thead>
                        <tr>
                          <th v-for="column in tableColumns(table)" :key="column">{{ column }}</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr v-for="(row, rowIndex) in table.rows" :key="row.id || row.task_id || rowIndex">
                          <td v-for="column in tableColumns(table)" :key="column">
                            <span v-if="!isLongValue(row[column])">{{ tableCellText(column, row[column]) }}</span>
                            <details v-else>
                              <summary>{{ tableCellSummary(column, row[column]) }}</summary>
                              <pre>{{ formatJson(row[column]) }}</pre>
                            </details>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </article>
              </div>
              <p v-else class="flow-muted">No database rows.</p>
            </div>
          </section>
        </template>
      </section>
    </template>
  </main>
</template>
