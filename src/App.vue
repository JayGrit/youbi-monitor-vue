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
const openTaskActionsId = ref('')
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
const submitterVideos = ref([])
const submitterLoading = ref(false)
const submitterError = ref('')
const submitterMessage = ref('')
const submitterUrl = ref('')
const submitterAuthor = ref('')
const submitterBusy = ref(false)
const submitterAuthorBusy = ref(false)
const submitterUploader = ref('')
const submitterDurationMin = ref('')
const submitterDurationMax = ref('')
const submitterUploadFilter = ref('all')
const submitterSort = ref('updated_desc')
const submitterAuthors = ref([])
const submitterFields = ref([])
const submitterVisibleFields = ref(new Set())
const submitterFieldsInitialized = ref(false)
const submitterFieldsOpen = ref(false)
const submitterListDetail = ref(false)
const submitterActiveBatch = ref('')
const submitterFocusedBatch = ref('')
const submitterActiveStatus = ref(null)
const submitterJsonTitle = ref('')
const submitterJsonPayload = ref(null)
const submitterThumbUrls = ref({})
const submitterSubmittingId = ref('')
const submitterPage = ref(1)
const submitterAuthorTypeOpen = ref(false)
const submitterAuthorTypeRows = ref([])
const submitterAuthorTypeSaving = ref('')
const submitterAuthorTypeError = ref('')
const SUBMITTER_PAGE_SIZE = 20
let flowTimer = null
let timer = null
let accountTimer = null
let bilibiliQrTimer = null
let xiaohongshuQrTimer = null
let douyinQrTimer = null
let submitterTimer = null
const apiBase = `${import.meta.env.BASE_URL}api`
const submitterApiBase = `${import.meta.env.BASE_URL}submitter-api`
const SPEECH_STAGE_KEY = 'speech'
const SPEECH_STAGE_KEYS = ['whisper', 'translator', 'speaker']
const SUBMITTER_FIXED_FIELDS = new Set(['thumbnail', 'title', 'duration', 'view_count'])
const SUBMITTER_PREFERRED_FIELDS = [
  '__detail', 'import_status', 'import_error', 'import_author', 'import_index',
  'uploader', 'channel', 'channel_id', 'duration', 'view_count', 'like_count',
  'comment_count', 'webpage_url', 'id', 'upload_date', 'release_timestamp',
  'timestamp', 'language', 'fps', 'categories', 'tags', 'description',
  'automatic_captions', 'subtitles', 'formats', 'requested_formats',
]
const SUBMITTER_COMMON_FIELDS = new Set([
  'import_status', 'import_error', 'import_author', 'import_index',
  'uploader', 'duration', 'view_count', 'like_count', 'comment_count',
  'language', 'fps', 'categories', 'tags', 'description',
])
const SUBMITTER_NUMERIC_FIELDS = new Set([
  'duration', 'view_count', 'like_count', 'comment_count', 'fps',
  'filesize', 'filesize_approx', 'timestamp', 'release_timestamp',
])
const SUBMITTER_SORT_OPTIONS = [
  { value: 'updated_desc', label: '最近更新' },
  { value: 'view_desc', label: '播放量从高到低' },
  { value: 'view_asc', label: '播放量从低到高' },
  { value: 'like_desc', label: '点赞量从高到低' },
  { value: 'like_asc', label: '点赞量从低到高' },
]
const SUBMITTER_UPLOAD_FILTERS = [
  { value: 'all', label: '全部' },
  { value: 'unuploaded', label: '未上传' },
]

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
  { key: 'success', label: '成功' },
  { key: 'failed', label: '失败' },
  { key: 'running', label: '执行中' },
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

const uploadPlatformText = {
  bilibili: 'B站',
  xiaohongshu: '小红书',
  douyin: '抖音',
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

const filteredTasks = computed(() => {
  if (taskStatusFilter.value === 'all') {
    return tasks.value
  }
  return tasks.value.filter(task => task.status === taskStatusFilter.value)
})

const submitterFilteredVideos = computed(() => {
  const rows = submitterUploadFilter.value === 'unuploaded'
    ? submitterVideos.value.filter(item => !item.ydbi_submitted)
    : submitterVideos.value
  const start = (submitterPage.value - 1) * SUBMITTER_PAGE_SIZE
  return rows.slice(start, start + SUBMITTER_PAGE_SIZE)
})

const submitterFilteredTotal = computed(() => {
  return submitterUploadFilter.value === 'unuploaded'
    ? submitterVideos.value.filter(item => !item.ydbi_submitted).length
    : submitterVideos.value.length
})

const submitterPageCount = computed(() => {
  return Math.max(1, Math.ceil(submitterFilteredTotal.value / SUBMITTER_PAGE_SIZE))
})

const submitterVisibleFieldList = computed(() => {
  return submitterFields.value.filter(field => submitterVisibleFields.value.has(field))
})

const submitterActiveRows = computed(() => {
  return submitterVideos.value.filter(item => ['pending', 'running'].includes(item.import_status)).length
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

function openPage(page) {
  if (flowPageOpen.value) {
    closeTaskFlow()
  }
  activePage.value = page
  if (accountTimer) {
    window.clearInterval(accountTimer)
    accountTimer = null
  }
  if (page === 'submitter') {
    loadSubmitterAuthors()
    loadSubmitterVideos()
  }
  if (page === 'accounts') {
    loadAccountPage()
    accountTimer = window.setInterval(loadAccountPage, 30000)
  }
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
  return accounts.map((account, index) => ({
    ...account,
    slot: index + 1,
    draftKey: account.accountKey || '',
  }))
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

function taskThumbnailUrl(task) {
  return String(task?.sourceThumbnailUrl || '').trim()
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

function taskTypeText(task) {
  return String(task?.taskType || '').trim() || '-'
}

function formatDateTime(value) {
  if (!value) return '-'
  return String(value).replace('T', ' ').slice(0, 19)
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

function toggleTaskActions(task) {
  const taskId = task?.taskId || ''
  openTaskActionsId.value = openTaskActionsId.value === taskId ? '' : taskId
}

function taskActionsOpen(task) {
  return openTaskActionsId.value === task?.taskId
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

function uploadSubmissionRows(stage) {
  return tableRows(stage, 'yd_upload_submission')
}

function uploadPlatformName(platform) {
  return uploadPlatformText[platform] || platform || ''
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

function submitterSource(item) {
  return item?.raw_info_json || item?.info_json || item || {}
}

function submitterFieldValue(item, key) {
  if (Object.prototype.hasOwnProperty.call(item || {}, key)) return item[key]
  return submitterSource(item)[key]
}

function submitterFieldLabel(key) {
  return key === '__detail' ? '详情' : key
}

function buildSubmitterFields() {
  const keys = new Set(['__detail'])
  for (const item of submitterVideos.value) {
    for (const key of Object.keys(item || {})) {
      if (!SUBMITTER_FIXED_FIELDS.has(key)) keys.add(key)
    }
    for (const key of Object.keys(submitterSource(item))) {
      if (!SUBMITTER_FIXED_FIELDS.has(key)) keys.add(key)
    }
  }
  submitterFields.value = [...keys].sort((left, right) => {
    const leftIndex = SUBMITTER_PREFERRED_FIELDS.indexOf(left)
    const rightIndex = SUBMITTER_PREFERRED_FIELDS.indexOf(right)
    if (leftIndex !== -1 || rightIndex !== -1) {
      return (leftIndex === -1 ? 999 : leftIndex) - (rightIndex === -1 ? 999 : rightIndex)
    }
    return left.localeCompare(right)
  })
  if (!submitterFieldsInitialized.value) {
    submitterVisibleFields.value = new Set(submitterFields.value.filter(key => SUBMITTER_COMMON_FIELDS.has(key)))
    submitterFieldsInitialized.value = true
  } else {
    submitterVisibleFields.value = new Set([...submitterVisibleFields.value].filter(key => keys.has(key)))
  }
}

function selectAllSubmitterFields() {
  submitterVisibleFields.value = new Set(submitterFields.value)
}

function selectCommonSubmitterFields() {
  submitterVisibleFields.value = new Set(submitterFields.value.filter(key => SUBMITTER_COMMON_FIELDS.has(key)))
}

function selectNoSubmitterFields() {
  submitterVisibleFields.value = new Set()
}

function toggleSubmitterField(key, checked) {
  const next = new Set(submitterVisibleFields.value)
  if (checked) next.add(key)
  else next.delete(key)
  submitterVisibleFields.value = next
}

async function loadSubmitterVideos(quiet = false) {
  if (!quiet) submitterLoading.value = true
  try {
    const params = new URLSearchParams()
    params.set('limit', '100000')
    if (submitterListDetail.value || submitterFocusedBatch.value) params.set('detail', '1')
    if (submitterFocusedBatch.value) {
      params.set('batch', submitterFocusedBatch.value)
    }
    if (submitterUploader.value) params.set('uploader', submitterUploader.value)
    if (submitterDurationMin.value !== '') params.set('duration_min', submitterDurationMin.value)
    if (submitterDurationMax.value !== '') params.set('duration_max', submitterDurationMax.value)
    if (submitterSort.value) params.set('sort', submitterSort.value)
    const query = params.toString()
    const response = await fetch(`${submitterApiBase}/videos${query ? `?${query}` : ''}`)
    const payload = await readJsonResponse(response)
    if (!response.ok) {
      throw new Error(payload?.error || `HTTP ${response.status}`)
    }
    submitterVideos.value = payload?.items || []
    buildSubmitterFields()
    warmSubmitterThumbnails()
    submitterError.value = ''
    updateSubmitterPolling()
    if (!submitterMessage.value) submitterMessage.value = '素材库已加载。'
  } catch (err) {
    submitterError.value = err instanceof Error ? err.message : String(err)
  } finally {
    submitterLoading.value = false
  }
}

async function applySubmitterFilters() {
  submitterPage.value = 1
  await loadSubmitterVideos()
}

async function loadSubmitterAuthors() {
  try {
    const response = await fetch(`${submitterApiBase}/authors`)
    const payload = await readJsonResponse(response)
    if (!response.ok) {
      throw new Error(payload?.error || `HTTP ${response.status}`)
    }
    submitterAuthors.value = payload?.items || []
  } catch (err) {
    submitterError.value = err instanceof Error ? err.message : String(err)
  }
}

async function toggleSubmitterFieldsPanel() {
  submitterFieldsOpen.value = !submitterFieldsOpen.value
  if (submitterFieldsOpen.value && !submitterListDetail.value) {
    submitterListDetail.value = true
    await loadSubmitterVideos()
  }
}

async function resetSubmitterFilters() {
  submitterUploader.value = ''
  submitterDurationMin.value = ''
  submitterDurationMax.value = ''
  submitterUploadFilter.value = 'all'
  submitterSort.value = 'updated_desc'
  submitterFocusedBatch.value = ''
  submitterPage.value = 1
  await loadSubmitterVideos()
}

async function clearSubmitterBatchFocus() {
  submitterFocusedBatch.value = ''
  submitterPage.value = 1
  await loadSubmitterVideos()
}

async function submitVideoToYoubi(item) {
  const rowId = submitterFieldValue(item, 'id')
  if (!rowId || item.ydbi_submitted || submitterSubmittingId.value) return
  submitterSubmittingId.value = String(rowId)
  submitterError.value = ''
  try {
    const author = submitterAuthorName(item)
    const type = await loadSubmitterAuthorType(author)
    if (!type) {
      submitterError.value = author
        ? `作者 ${author} 未配置投稿 type，请先维护 yd_submitter_author_type。`
        : '当前素材没有作者信息，无法读取投稿 type。'
      return
    }
    const response = await fetch(`${submitterApiBase}/videos/${encodeURIComponent(rowId)}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type }),
    })
    const payload = await readJsonResponse(response)
    if (!response.ok) {
      throw new Error(payload?.error || `HTTP ${response.status}`)
    }
    Object.assign(item, {
      ydbi_submitted: 1,
      ydbi_submission_id: payload.submission_id,
      ydbi_submitted_at: new Date().toISOString(),
    })
    if (submitterPage.value > submitterPageCount.value) {
      submitterPage.value = submitterPageCount.value
    }
    submitterMessage.value = `已提交到 YouBi 下载队列，type=${type}。`
  } catch (err) {
    submitterError.value = err instanceof Error ? err.message : String(err)
    await loadSubmitterVideos(true)
  } finally {
    submitterSubmittingId.value = ''
  }
}

function submitterAuthorName(item) {
  return String(
    submitterFieldValue(item, 'uploader')
    || submitterFieldValue(item, 'import_author')
    || submitterFieldValue(item, 'channel')
    || ''
  ).trim()
}

async function loadSubmitterAuthorType(author) {
  if (!author) return ''
  const params = new URLSearchParams({ author })
  const response = await fetch(`${apiBase}/submitter-author-types?${params}`)
  const payload = await readJsonResponse(response)
  if (!response.ok) {
    throw new Error(payload?.message || payload?.error || `HTTP ${response.status}`)
  }
  return String(payload?.type || '').trim()
}

async function openSubmitterAuthorTypes() {
  submitterAuthorTypeOpen.value = true
  submitterAuthorTypeError.value = ''
  await loadSubmitterAuthorTypes()
}

async function loadSubmitterAuthorTypes() {
  try {
    const [typesResponse] = await Promise.all([
      fetch(`${apiBase}/submitter-author-types/all`),
      submitterAuthors.value.length ? Promise.resolve() : loadSubmitterAuthors(),
    ])
    const payload = await readJsonResponse(typesResponse)
    if (!typesResponse.ok) {
      throw new Error(payload?.message || payload?.error || `HTTP ${typesResponse.status}`)
    }
    const byAuthor = new Map((payload || []).map(item => [String(item.author || ''), String(item.type || '')]))
    const authors = new Set([...submitterAuthors.value, ...byAuthor.keys()].filter(Boolean))
    submitterAuthorTypeRows.value = [...authors].sort((left, right) => left.localeCompare(right)).map(author => ({
      author,
      type: byAuthor.get(author) || '',
      draftType: byAuthor.get(author) || '',
    }))
  } catch (err) {
    submitterAuthorTypeError.value = err instanceof Error ? err.message : String(err)
  }
}

async function saveSubmitterAuthorType(row) {
  const type = String(row?.draftType || '').trim()
  if (!row?.author || !type) return
  submitterAuthorTypeSaving.value = row.author
  submitterAuthorTypeError.value = ''
  try {
    const response = await fetch(`${apiBase}/submitter-author-types`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ author: row.author, type }),
    })
    const payload = await readJsonResponse(response)
    if (!response.ok) {
      throw new Error(payload?.message || payload?.error || `HTTP ${response.status}`)
    }
    row.type = String(payload?.type || type)
    row.draftType = row.type
  } catch (err) {
    submitterAuthorTypeError.value = err instanceof Error ? err.message : String(err)
  } finally {
    submitterAuthorTypeSaving.value = ''
  }
}

function closeSubmitterAuthorTypes() {
  submitterAuthorTypeOpen.value = false
  submitterAuthorTypeError.value = ''
}

function setSubmitterPage(page) {
  submitterPage.value = Math.min(Math.max(1, page), submitterPageCount.value)
}

async function createSubmitterVideo() {
  const url = submitterUrl.value.trim()
  if (!url || submitterBusy.value) return
  submitterBusy.value = true
  submitterMessage.value = '正在抓取 yt-dlp JSON 并写入数据库...'
  submitterError.value = ''
  try {
    const response = await fetch(`${submitterApiBase}/videos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    })
    const payload = await readJsonResponse(response)
    if (!response.ok) {
      throw new Error(payload?.error || `HTTP ${response.status}`)
    }
    submitterUrl.value = ''
    submitterMessage.value = '已保存视频信息。'
    await loadSubmitterVideos(true)
    await loadSubmitterAuthors()
  } catch (err) {
    submitterError.value = err instanceof Error ? err.message : String(err)
  } finally {
    submitterBusy.value = false
  }
}

async function importSubmitterAuthor() {
  const author = submitterAuthor.value.trim()
  if (!author || submitterAuthorBusy.value) return
  submitterAuthorBusy.value = true
  submitterBusy.value = true
  submitterMessage.value = '正在创建作者后台导入任务...'
  submitterError.value = ''
  try {
    const response = await fetch(`${submitterApiBase}/authors/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ author }),
    })
    const payload = await readJsonResponse(response)
    if (!response.ok) {
      throw new Error(payload?.error || `HTTP ${response.status}`)
    }
    submitterAuthor.value = ''
    submitterActiveBatch.value = payload.batch || ''
    submitterFocusedBatch.value = payload.batch || ''
    submitterActiveStatus.value = payload
    submitterListDetail.value = true
    submitterMessage.value = payload.source_url ? `已开始扫描：${payload.source_url}` : '已开始后台扫描。'
    await loadSubmitterVideos(true)
    await loadSubmitterAuthors()
    await refreshSubmitterImportStatus()
    updateSubmitterPolling()
  } catch (err) {
    submitterError.value = err instanceof Error ? err.message : String(err)
  } finally {
    submitterAuthorBusy.value = false
    submitterBusy.value = false
  }
}

async function refreshSubmitterImportStatus() {
  if (!submitterActiveBatch.value) return
  const response = await fetch(`${submitterApiBase}/authors/import/${encodeURIComponent(submitterActiveBatch.value)}`)
  const payload = await readJsonResponse(response)
  if (!response.ok) {
    submitterActiveBatch.value = ''
    submitterActiveStatus.value = null
    submitterMessage.value = payload?.error || '导入任务状态不可用。'
    return
  }
  submitterActiveStatus.value = payload
  submitterMessage.value = submitterImportStatusText(payload)
  if (['done', 'failed'].includes(payload.status)) {
    submitterActiveBatch.value = ''
  }
}

function updateSubmitterPolling() {
  const shouldPoll = submitterActiveRows.value > 0 || Boolean(submitterActiveBatch.value)
  if (shouldPoll && !submitterTimer) {
    submitterTimer = window.setInterval(async () => {
      try {
        await refreshSubmitterImportStatus()
        await loadSubmitterVideos(true)
      } catch (err) {
        submitterError.value = err instanceof Error ? err.message : String(err)
      }
    }, 3000)
  } else if (!shouldPoll && submitterTimer) {
    window.clearInterval(submitterTimer)
    submitterTimer = null
  }
}

function submitterImportStatusText(status) {
  const discovered = formatNumber(status?.discovered || status?.registered || 0)
  const skipped = formatNumber(status?.skipped || 0)
  const saved = formatNumber(status?.saved || 0)
  const failed = formatNumber(status?.failed || 0)
  const current = status?.current_title ? ` 当前：${status.current_title}` : ''
  if (status?.status === 'scanning') {
    return `正在扫描频道，新增 ${discovered} 个视频，跳过已存在 ${skipped} 个。`
  }
  if (status?.status === 'processing') {
    return `正在处理新增视频，已保存 ${saved} 个，跳过 ${skipped} 个，失败 ${failed} 个。${current}`
  }
  if (status?.status === 'done') {
    return `导入完成：新增 ${discovered} 个视频，跳过 ${skipped} 个，已保存 ${saved} 个，失败 ${failed} 个。`
  }
  if (status?.status === 'failed') {
    return `导入失败：${status.error || '未知错误'}。新增 ${discovered} 个视频，跳过 ${skipped} 个，已保存 ${saved} 个，失败 ${failed} 个。`
  }
  return '导入任务正在后台运行。'
}

function submitterVideoHref(item) {
  const data = submitterSource(item)
  return submitterFieldValue(item, 'webpage_url') || data.original_url || item?.input_url || ''
}

function submitterVideoTitle(item) {
  return submitterFieldValue(item, 'title') || '-'
}

function submitterVideoThumb(item) {
  return submitterFieldValue(item, 'thumbnail') || ''
}

function submitterCachedThumb(item) {
  const url = submitterVideoThumb(item)
  return submitterThumbUrls.value[url] || url
}

async function cacheSubmitterThumbnail(url) {
  if (!url || submitterThumbUrls.value[url]) return
  if (!('caches' in window)) return
  try {
    const cache = await caches.open('submitter-thumbnails-v1')
    const cached = await cache.match(url)
    if (cached) {
      const blob = await cached.blob()
      if (blob.size > 0) {
        submitterThumbUrls.value = { ...submitterThumbUrls.value, [url]: URL.createObjectURL(blob) }
        return
      }
    }
    const response = await fetch(url, { mode: 'cors', cache: 'force-cache' })
    if (!response.ok) return
    await cache.put(url, response.clone())
    const blob = await response.blob()
    if (blob.size > 0) {
      submitterThumbUrls.value = { ...submitterThumbUrls.value, [url]: URL.createObjectURL(blob) }
    }
  } catch (err) {
    // Fall back to the remote URL when a thumbnail host does not allow CORS.
  }
}

function warmSubmitterThumbnails() {
  for (const item of submitterVideos.value.slice(0, 100)) {
    cacheSubmitterThumbnail(submitterVideoThumb(item))
  }
}

function submitterValueKind(key, value) {
  if (key === '__detail') return 'detail'
  if (value === null || value === undefined || value === '') return 'empty'
  if (key === 'duration') return 'duration'
  if (key === 'timestamp' || key === 'release_timestamp') return 'unix'
  if (key === 'webpage_url' || key.endsWith('_url') || key === 'url' || key === 'original_url') return 'link'
  if (Array.isArray(value)) return 'array'
  if (typeof value === 'object') return 'object'
  if (SUBMITTER_NUMERIC_FIELDS.has(key)) return 'number'
  return 'text'
}

function summarizeSubmitterObject(value) {
  const output = {}
  for (const key of Object.keys(value || {}).slice(0, 12)) {
    const entry = value[key]
    if (Array.isArray(entry)) output[key] = `[${entry.length} items]`
    else if (entry && typeof entry === 'object') output[key] = '{...}'
    else output[key] = entry
  }
  const rest = Object.keys(value || {}).length - Object.keys(output).length
  if (rest > 0) output.__more = `${rest} more keys`
  return output
}

function submitterJsonPreview(value) {
  return JSON.stringify(summarizeSubmitterObject(value), null, 2)
}

function submitterArrayPreview(value) {
  if (!Array.isArray(value)) return []
  return value.slice(0, 20)
}

async function showSubmitterJson(item) {
  try {
    let detail = item
    if (item?.id) {
      const response = await fetch(`${submitterApiBase}/videos/${encodeURIComponent(item.id)}`)
      const payload = await readJsonResponse(response)
      if (!response.ok) {
        throw new Error(payload?.error || `HTTP ${response.status}`)
      }
      detail = payload?.item || item
    }
    const data = submitterSource(detail)
    submitterJsonTitle.value = data.title || data.id || '完整 yt-dlp JSON'
    submitterJsonPayload.value = data
  } catch (err) {
    submitterError.value = err instanceof Error ? err.message : String(err)
  }
}

function closeSubmitterJson() {
  submitterJsonTitle.value = ''
  submitterJsonPayload.value = null
}

function formatUnixSeconds(value) {
  const number = Number(value)
  if (!Number.isFinite(number) || number <= 0) return '-'
  return new Date(number * 1000).toLocaleString()
}

function formatNumber(value) {
  const number = Number(value)
  return Number.isFinite(number) ? number.toLocaleString() : '-'
}

onMounted(() => {
  loadTasks()
  timer = window.setInterval(loadTasks, 2000)
})

onUnmounted(() => {
  if (timer) {
    window.clearInterval(timer)
  }
  if (accountTimer) {
    window.clearInterval(accountTimer)
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
  if (submitterTimer) {
    window.clearInterval(submitterTimer)
  }
  for (const url of Object.values(submitterThumbUrls.value)) {
    if (String(url).startsWith('blob:')) URL.revokeObjectURL(url)
  }
})
</script>

<template>
  <main :class="['page-shell', flowPageOpen ? 'flow-page-shell' : '']">
    <header class="top-bar">
      <nav class="page-tabs" aria-label="页面切换">
        <button type="button" :class="{ active: activePage === 'submitter' && !flowPageOpen }" @click="openPage('submitter')">素材</button>
        <button type="button" :class="{ active: activePage === 'monitor' || flowPageOpen }" @click="openPage('monitor')">监控</button>
        <button type="button" :class="{ active: activePage === 'accounts' && !flowPageOpen }" @click="openPage('accounts')">账号</button>
      </nav>
    </header>

    <template v-if="!flowPageOpen">
    <template v-if="activePage === 'monitor'">
    <section class="status-line">
      <span :class="['dot', error ? 'dot-failed' : 'dot-success']"></span>
      <span v-if="error">接口异常：{{ error }}</span>
      <span v-else-if="loading">正在加载</span>
    </section>

    <section class="heartbeat-panel" aria-label="服务设备在线状态">
      <div class="heartbeat-head">
        <div>
          <h2>服务设备</h2>
        </div>
      </div>

      <div class="service-device-row">
        <div
          v-for="service in serviceHeartbeats"
          :key="service.serviceName"
          :class="['service-device-cell', serviceOnline(service) ? 'online' : 'offline']"
          :title="onlineDeviceTitle(service)"
        >
          <strong>{{ service.serviceName }}</strong>
          <span :class="['service-device-name', { offline: onlineDeviceText(service) === '离线' }]">
            {{ onlineDeviceText(service) }}
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

      <article v-for="task in filteredTasks" :key="task.taskId" :class="['task-row', `status-${task.status}`]">
        <a
          v-if="taskThumbnailUrl(task)"
          class="task-cover"
          :href="taskSourceUrl(task) || taskThumbnailUrl(task)"
          target="_blank"
          rel="noreferrer"
          :title="displayTitle(task)"
        >
          <img :src="taskThumbnailUrl(task)" :alt="displayTitle(task)" loading="lazy" />
        </a>
        <div v-else class="task-cover task-cover-empty" aria-hidden="true">无封面</div>

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
            <button
              type="button"
              :class="['task-filter-button', 'task-actions-toggle', { active: taskActionsOpen(task) }]"
              @click="toggleTaskActions(task)"
            >
              操作
            </button>
          </div>
          <div class="task-details">
            <span>{{ task.taskId }}</span>
            <span v-if="sourceDurationSeconds(task) !== null">{{ formatDuration(sourceDurationSeconds(task)) }}</span>
            <span class="task-type">type {{ taskTypeText(task) }}</span>
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
        <div class="task-action-rail" :class="{ open: taskActionsOpen(task) }">
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

    <template v-else-if="activePage === 'submitter'">
      <section class="submitter-page" aria-label="素材采集">
        <section class="submitter-status">
          <span :class="['dot', submitterError ? 'dot-failed' : submitterLoading ? 'dot-running' : 'dot-success']"></span>
          <span v-if="submitterError">Submitter API 异常：{{ submitterError }}</span>
          <span v-else-if="submitterLoading">正在加载素材库</span>
          <span v-else>{{ submitterFocusedBatch ? `当前批次：${submitterFocusedBatch.slice(0, 8)}。` : '' }}{{ submitterMessage || '素材库已就绪。' }}</span>
        </section>

        <section class="submitter-actions-panel">
          <form class="submitter-submit-row" @submit.prevent="createSubmitterVideo">
            <label>
              <span>视频链接</span>
              <input v-model="submitterUrl" type="url" placeholder="https://www.youtube.com/watch?v=..." required />
            </label>
            <button type="submit" :disabled="submitterBusy">{{ submitterBusy ? '抓取中' : '抓取并保存' }}</button>
          </form>
          <form class="submitter-submit-row" @submit.prevent="importSubmitterAuthor">
            <label>
              <span>频道链接</span>
              <input v-model="submitterAuthor" type="text" placeholder="@handle 或 https://www.youtube.com/@channel" required />
            </label>
            <button type="submit" :disabled="submitterAuthorBusy">{{ submitterAuthorBusy ? '导入中' : '导入作者全部视频' }}</button>
          </form>
        </section>

        <section class="submitter-controls">
          <div class="submitter-filter-grid">
            <label>
              <span>作者</span>
              <select v-model="submitterUploader" @change="applySubmitterFilters">
                <option value="">全部作者</option>
                <option v-for="author in submitterAuthors" :key="author" :value="author">{{ author }}</option>
              </select>
            </label>
            <fieldset class="submitter-duration-field">
              <legend>视频时长</legend>
              <div>
                <input v-model="submitterDurationMin" type="number" min="0" placeholder="最短秒数" @change="applySubmitterFilters" />
                <span>至</span>
                <input v-model="submitterDurationMax" type="number" min="0" placeholder="最长秒数" @change="applySubmitterFilters" />
              </div>
            </fieldset>
            <label>
              <span>排序</span>
              <select v-model="submitterSort" @change="applySubmitterFilters">
                <option v-for="option in SUBMITTER_SORT_OPTIONS" :key="option.value" :value="option.value">
                  {{ option.label }}
                </option>
              </select>
            </label>
            <label>
              <span>上传</span>
              <select v-model="submitterUploadFilter" @change="applySubmitterFilters">
                <option v-for="option in SUBMITTER_UPLOAD_FILTERS" :key="option.value" :value="option.value">
                  {{ option.label }}
                </option>
              </select>
            </label>
            <div class="submitter-filter-actions">
              <button type="button" @click="openSubmitterAuthorTypes">作者 Type</button>
              <button type="button" @click="resetSubmitterFilters">重置</button>
              <button v-if="submitterFocusedBatch" type="button" @click="clearSubmitterBatchFocus">查看全部</button>
            </div>
          </div>

          <section class="submitter-fields-section">
            <button type="button" class="submitter-fields-toggle" @click="toggleSubmitterFieldsPanel">
              <span>字段选择</span>
              <strong>{{ submitterVisibleFields.size }}/{{ submitterFields.length }}</strong>
            </button>
            <div v-if="submitterFieldsOpen" class="submitter-fields-body">
              <div class="submitter-columns-head">
                <strong>附加字段</strong>
                <div>
                  <button type="button" @click="selectAllSubmitterFields">全选</button>
                  <button type="button" @click="selectCommonSubmitterFields">常用字段</button>
                  <button type="button" @click="selectNoSubmitterFields">只看固定列</button>
                </div>
              </div>
              <div class="submitter-field-panel">
                <label v-for="field in submitterFields" :key="field" class="submitter-column-toggle">
                  <input
                    type="checkbox"
                    :checked="submitterVisibleFields.has(field)"
                    @change="event => toggleSubmitterField(field, event.target.checked)"
                  />
                  <span>{{ submitterFieldLabel(field) }}</span>
                </label>
              </div>
            </div>
          </section>
        </section>

        <section class="submitter-table-panel">
          <div class="submitter-table-wrap">
            <table class="submitter-table">
              <thead>
                <tr>
                  <th class="submitter-fixed-col">视频</th>
                  <th v-for="field in submitterVisibleFieldList" :key="field">{{ submitterFieldLabel(field) }}</th>
                  <th class="submitter-action-col">操作</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="!submitterLoading && submitterFilteredVideos.length === 0">
                  <td :colspan="submitterVisibleFieldList.length + 2" class="submitter-empty">
                    {{ submitterFocusedBatch ? '当前批次暂无记录，频道扫描完成后会自动刷新。' : '暂无匹配记录' }}
                  </td>
                </tr>
                <tr v-for="item in submitterFilteredVideos" :key="item.id || item.video_id || item.webpage_url">
                  <td class="submitter-fixed-col">
                    <div class="submitter-video-card">
                      <img v-if="submitterVideoThumb(item)" :src="submitterCachedThumb(item)" alt="" loading="lazy" decoding="async" />
                      <div v-else class="submitter-thumb-empty"></div>
                      <div>
                        <a
                          v-if="submitterVideoHref(item)"
                          :href="submitterVideoHref(item)"
                          target="_blank"
                          rel="noreferrer"
                          class="submitter-video-title"
                        >
                          {{ submitterVideoTitle(item) }}
                        </a>
                        <strong v-else class="submitter-video-title">{{ submitterVideoTitle(item) }}</strong>
                        <div class="submitter-video-meta">
                          <span>{{ formatDuration(submitterFieldValue(item, 'duration')) }}</span>
                          <span>{{ formatNumber(submitterFieldValue(item, 'view_count')) }} 播放</span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td
                    v-for="field in submitterVisibleFieldList"
                    :key="field"
                    :class="{ 'submitter-num': SUBMITTER_NUMERIC_FIELDS.has(field) }"
                  >
                    <template v-if="submitterValueKind(field, submitterFieldValue(item, field)) === 'detail'">
                      <button type="button" class="submitter-json-button" @click="showSubmitterJson(item)">查看</button>
                    </template>
                    <template v-else-if="submitterValueKind(field, submitterFieldValue(item, field)) === 'empty'">-</template>
                    <template v-else-if="submitterValueKind(field, submitterFieldValue(item, field)) === 'duration'">
                      {{ formatDuration(submitterFieldValue(item, field)) }}
                      <span class="submitter-muted">({{ formatNumber(submitterFieldValue(item, field)) }}s)</span>
                    </template>
                    <template v-else-if="submitterValueKind(field, submitterFieldValue(item, field)) === 'unix'">
                      {{ formatUnixSeconds(submitterFieldValue(item, field)) }}
                    </template>
                    <template v-else-if="submitterValueKind(field, submitterFieldValue(item, field)) === 'number'">
                      {{ formatNumber(submitterFieldValue(item, field)) }}
                    </template>
                    <template v-else-if="submitterValueKind(field, submitterFieldValue(item, field)) === 'link'">
                      <a class="submitter-cell" :href="String(submitterFieldValue(item, field))" target="_blank" rel="noreferrer">
                        {{ submitterFieldValue(item, field) }}
                      </a>
                    </template>
                    <template v-else-if="submitterValueKind(field, submitterFieldValue(item, field)) === 'array'">
                      <div class="submitter-chips">
                        <span v-for="entry in submitterArrayPreview(submitterFieldValue(item, field))" :key="String(entry)" class="submitter-chip">
                          {{ typeof entry === 'object' ? JSON.stringify(entry).slice(0, 80) : entry }}
                        </span>
                      </div>
                    </template>
                    <pre v-else-if="submitterValueKind(field, submitterFieldValue(item, field)) === 'object'" class="submitter-cell">{{ submitterJsonPreview(submitterFieldValue(item, field)) }}</pre>
                    <div v-else class="submitter-cell">{{ submitterFieldValue(item, field) }}</div>
                  </td>
                  <td class="submitter-action-col">
                    <button
                      type="button"
                      :class="['submitter-upload-button', { submitted: item.ydbi_submitted }]"
                      :disabled="Boolean(item.ydbi_submitted) || submitterSubmittingId === String(submitterFieldValue(item, 'id'))"
                      @click="submitVideoToYoubi(item)"
                    >
                      <span v-if="item.ydbi_submitted">已上传</span>
                      <span v-else-if="submitterSubmittingId === String(submitterFieldValue(item, 'id'))">上传中</span>
                      <span v-else>上传</span>
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="submitter-pagination" v-if="submitterFilteredTotal > 0">
            <span>第 {{ submitterPage }} / {{ submitterPageCount }} 页 · 共 {{ submitterFilteredTotal }} 条</span>
            <div>
              <button type="button" :disabled="submitterPage <= 1" @click="setSubmitterPage(submitterPage - 1)">上一页</button>
              <button type="button" :disabled="submitterPage >= submitterPageCount" @click="setSubmitterPage(submitterPage + 1)">下一页</button>
            </div>
          </div>
        </section>

        <div v-if="submitterJsonPayload" class="submitter-modal-backdrop" @click.self="closeSubmitterJson">
          <section class="submitter-modal" role="dialog" aria-modal="true">
            <header>
              <strong>{{ submitterJsonTitle }}</strong>
              <button type="button" @click="closeSubmitterJson">关闭</button>
            </header>
            <pre>{{ JSON.stringify(submitterJsonPayload, null, 2) }}</pre>
          </section>
        </div>

        <div v-if="submitterAuthorTypeOpen" class="submitter-modal-backdrop" @click.self="closeSubmitterAuthorTypes">
          <section class="submitter-modal submitter-author-type-modal" role="dialog" aria-modal="true">
            <header>
              <strong>作者 Type</strong>
              <button type="button" @click="closeSubmitterAuthorTypes">关闭</button>
            </header>
            <div class="submitter-author-type-body">
              <p v-if="submitterAuthorTypeError" class="inline-error">{{ submitterAuthorTypeError }}</p>
              <table class="submitter-author-type-table">
                <thead>
                  <tr>
                    <th>作者</th>
                    <th>Type</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-if="submitterAuthorTypeRows.length === 0">
                    <td colspan="3" class="submitter-empty">暂无作者</td>
                  </tr>
                  <tr v-for="row in submitterAuthorTypeRows" :key="row.author">
                    <td>{{ row.author }}</td>
                    <td>
                      <input v-model="row.draftType" type="text" placeholder="投稿 type" />
                    </td>
                    <td>
                      <button
                        type="button"
                        :disabled="!row.draftType.trim() || row.draftType === row.type || submitterAuthorTypeSaving === row.author"
                        @click="saveSubmitterAuthorType(row)"
                      >
                        {{ submitterAuthorTypeSaving === row.author ? '保存中' : '保存' }}
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        </div>
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
              <button type="button" @click="startBilibiliQrLogin(null)">扫码登录新账号</button>
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
              <button type="button" @click="startXiaohongshuQrLogin(null)">扫码登录新账号</button>
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
              <button type="button" @click="startDouyinQrLogin(null)">扫码登录新账号</button>
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
                · {{ formatDuration(flowDurationSeconds(selectedTaskFlow)) }}
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
                <p>
                  耗时 {{ formatDuration(selectedStage.elapsedSeconds) }}
                </p>
              </div>
            </div>

            <pre v-if="selectedStage.errorMessage" class="flow-stage-error">{{ selectedStage.errorMessage }}</pre>

            <div v-if="selectedStage.key === 'uploader' && uploadSubmissionRows(selectedStage).length" class="flow-section">
              <h4>平台发送任务</h4>
              <div class="upload-submission-grid">
                <article
                  v-for="submission in uploadSubmissionRows(selectedStage)"
                  :key="submission.id || `${submission.platform}-${submission.account_key}`"
                  :class="['upload-submission-card', `status-${submission.status}`]"
                >
                  <div class="upload-submission-head">
                    <strong>{{ uploadPlatformName(submission.platform) }}</strong>
                    <span :class="['task-badge', `status-${submission.status}`]">
                      {{ statusText[submission.status] || submission.status }}
                    </span>
                  </div>
                  <div class="upload-submission-meta">
                    <span>{{ submission.account_key || 'default' }}</span>
                    <span v-if="submission.next_upload_allowed_at">
                      下次 {{ formatDateTime(submission.next_upload_allowed_at) }}
                    </span>
                  </div>
                  <p v-if="submission.title">{{ submission.title }}</p>
                  <pre v-if="submission.error_message" class="flow-stage-error">{{ submission.error_message }}</pre>
                </article>
              </div>
            </div>

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
