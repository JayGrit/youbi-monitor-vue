<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { createAccountsApi } from './api/accounts'
import { createMonitorApi } from './api/monitor'
import { createSubmitterApi } from './api/submitter'
import {
  createAccountPlatforms,
  createPlatformIconUrls,
  stageNameText,
  statusText,
  taskStatusFilters,
} from './domain/constants'
import {
  formatDateTime,
  formatDuration,
  formatTime,
  isSameDate,
  pad2,
  parseLocalDateTime,
} from './utils/format'
import {
  isWatchUrl,
  youtubeThumbnailUrl,
} from './utils/media'
import PageTabs from './components/PageTabs.vue'
import { useSubmitter } from './composables/useSubmitter'
import { useTaskFlow } from './composables/useTaskFlow'
import AccountsPage from './pages/AccountsPage.vue'
import MonitorPage from './pages/MonitorPage.vue'
import SubmitterPage from './pages/SubmitterPage.vue'
import TaskFlowPage from './pages/TaskFlowPage.vue'

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
const taskTypeFilter = ref('all')
const taskActionsExpanded = ref(false)
const openFailureKey = ref('')
const taskThumbUrls = ref({})
const brokenImageUrls = ref({})
let timer = null
let accountTimer = null
let bilibiliQrTimer = null
let xiaohongshuQrTimer = null
let douyinQrTimer = null
const apiBase = `${import.meta.env.BASE_URL}api`
const submitterApiBase = `${import.meta.env.BASE_URL}submitter-api`
const monitorApi = createMonitorApi(apiBase)
const accountsApi = createAccountsApi(apiBase)
const submitterApi = createSubmitterApi(submitterApiBase, apiBase)
const PLATFORM_ICON_URLS = createPlatformIconUrls(import.meta.env.BASE_URL)
const ACCOUNT_PLATFORMS = createAccountPlatforms(PLATFORM_ICON_URLS)
const {
  selectedTaskFlow,
  selectedStageKey,
  flowPageOpen,
  flowLoading,
  flowError,
  speechEditDraft,
  speechEditSaving,
  speechEditError,
  selectedStage,
  flowTabs,
  openTaskFlow,
  loadTaskFlow,
  closeTaskFlow,
  clearFlowPolling,
  refreshTaskFlow,
  flowTaskTitle,
  flowSourceUrl,
  flowCoverUrl,
  flowDurationSeconds,
  tableColumns,
  tableCellText,
  tableCellSummary,
  speechRows,
  uploadSubmissionRows,
  uploadPlatformName,
  speechColumns,
  showSpeechColumn,
  speechMoreRows,
  canEditSpeechDstText,
  isEditingSpeechDstText,
  beginSpeechEdit,
  cancelSpeechEdit,
  saveSpeechDstText,
  speechAudioAsset,
  stageMedia,
  fieldRows,
} = useTaskFlow(monitorApi, brokenImageUrls)
const {
  submitterVideos,
  submitterLoading,
  submitterError,
  submitterMessage,
  submitterUrl,
  submitterAuthor,
  submitterBusy,
  submitterAuthorBusy,
  submitterUploader,
  submitterDurationFilter,
  submitterUploadFilter,
  submitterSort,
  submitterAuthors,
  submitterFields,
  submitterVisibleFields,
  submitterFieldsOpen,
  submitterFocusedBatch,
  submitterJsonTitle,
  submitterJsonPayload,
  submitterThumbUrls,
  submitterSubmittingId,
  submitterPage,
  submitterAuthorTypeOpen,
  submitterAuthorTypeRows,
  submitterAuthorTypeSaving,
  submitterAuthorTypeError,
  submitterFilteredVideos,
  submitterFilteredTotal,
  submitterPageCount,
  submitterVisibleFieldList,
  submitterStatusCounts,
  loadSubmitterVideos,
  applySubmitterFilters,
  loadSubmitterAuthors,
  toggleSubmitterFieldsPanel,
  resetSubmitterFilters,
  clearSubmitterBatchFocus,
  submitVideoToYoubi,
  openSubmitterAuthorTypes,
  autosaveSubmitterAuthorType,
  closeSubmitterAuthorTypes,
  setSubmitterPage,
  createSubmitterVideo,
  importSubmitterAuthor,
  clearSubmitterPolling,
  submitterFieldValue,
  submitterFieldLabel,
  selectAllSubmitterFields,
  selectCommonSubmitterFields,
  selectNoSubmitterFields,
  toggleSubmitterField,
  submitterVideoHref,
  submitterVideoTitle,
  submitterVideoThumb,
  submitterCachedThumb,
  submitterValueKind,
  submitterJsonPreview,
  submitterArrayPreview,
  showSubmitterJson,
  closeSubmitterJson,
  formatUnixSeconds,
} = useSubmitter(submitterApi, cacheImageUrl)

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

const filteredTasks = computed(() => {
  return tasks.value.filter(task => {
    if (taskStatusFilter.value !== 'all' && task.status !== taskStatusFilter.value) return false
    if (taskTypeFilter.value !== 'all' && taskTypeText(task) !== taskTypeFilter.value) return false
    return true
  })
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

const accountKeyGroups = computed(() => {
  const groups = new Map()
  for (const [type, rows] of [
    ['douyin', douyinRows.value],
    ['xiaohongshu', xiaohongshuRows.value],
    ['bilibili', bilibiliRows.value],
  ]) {
    for (const row of rows) {
      const key = String(row.accountKey || row.draftKey || '').trim()
      if (!key) continue
      if (!groups.has(key)) groups.set(key, { key, platforms: {} })
      groups.get(key).platforms[type] = row
    }
  }
  return [...groups.values()]
    .map(group => ({
      ...group,
      rows: ACCOUNT_PLATFORMS
        .filter(platform => group.platforms[platform.type])
        .map(platform => ({
          ...platform,
          row: group.platforms[platform.type],
          configured: Boolean(group.platforms[platform.type]?.accountKey),
          exists: true,
        })),
    }))
    .sort((left, right) => right.rows.length - left.rows.length || left.key.localeCompare(right.key))
})

async function loadTasks() {
  try {
    const payload = await monitorApi.loadMonitorTasks()
    tasks.value = payload.tasks || []
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
    warmPlatformIcons()
    loadAccountPage()
    accountTimer = window.setInterval(loadAccountPage, 30000)
  }
}

async function loadBilibiliAccounts() {
  bilibiliAccounts.value = await accountsApi.bilibili.list()
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
  xiaohongshuAccounts.value = await accountsApi.xiaohongshu.list()
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
  douyinAccounts.value = await accountsApi.douyin.list()
  douyinRows.value = accountRows(douyinAccounts.value)
}

async function startBilibiliQrLogin(row) {
  try {
    const key = row?.accountKey || '_auto'
    bilibiliBusyKey.value = rowKey(row)
    bilibiliQrCode.value = await accountsApi.bilibili.startQrLogin(key)
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
    const payload = await accountsApi.bilibili.pollQrLogin(key, bilibiliQrCode.value.authCode)
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
    bilibiliAccount.value = await accountsApi.bilibili.renew(row.accountKey)
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
    const account = await accountsApi.bilibili.refresh(row.accountKey)
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
    const payload = await accountsApi.bilibili.saveKey(row.accountKey, nextKey)
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
    const payload = await accountsApi.xiaohongshu.startQrLogin(key)
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
    const payload = await accountsApi.xiaohongshu.pollQrLogin(key, xiaohongshuQrCode.value.authCode)
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
    const account = await accountsApi.xiaohongshu.refresh(row.accountKey)
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
    const payload = await accountsApi.xiaohongshu.saveKey(row.accountKey, nextKey)
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
    const payload = await accountsApi.douyin.startQrLogin(key)
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
    const payload = await accountsApi.douyin.pollQrLogin(key, douyinQrCode.value.authCode)
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
    const account = await accountsApi.douyin.refresh(row.accountKey)
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
    const payload = await accountsApi.douyin.saveKey(row.accountKey, nextKey)
    mergeDouyinRow(payload, row.slot)
    await loadDouyinAccounts()
    douyinError.value = ''
  } catch (err) {
    douyinError.value = err instanceof Error ? err.message : String(err)
  }
}

function addDouyinCdpRow(accountKey = '') {
  const initialKey = accountKey || window.prompt('Key') || ''
  if (!initialKey.trim()) return
  const rows = [...douyinRows.value]
  const slot = rows.reduce((max, row) => Math.max(max, Number(row.slot || 0)), 0) + 1
  rows.push({
    slot,
    accountKey: '',
    cdpPort: null,
    draftKey: initialKey.trim(),
    draftPort: '',
  })
  douyinRows.value = rows
}

async function saveDouyinCdpSession(row) {
  const accountKey = (row?.draftKey || '').trim()
  const cdpPort = Number(row?.draftPort)
  if (!accountKey) {
    douyinError.value = 'Key 不能为空'
    return
  }
  if (!Number.isInteger(cdpPort) || cdpPort < 1 || cdpPort > 65535) {
    douyinError.value = '端口号必须是 1-65535'
    return
  }
  try {
    await accountsApi.douyin.saveCdpSession({
      originalAccountKey: row.accountKey || '',
      accountKey,
      cdpPort,
    })
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
    draftPort: account.cdpPort == null ? '' : String(account.cdpPort),
  }))
}

function nextSendText(account) {
  const next = parseLocalDateTime(account?.nextUploadAllowedAt)
  if (!next || next.getTime() <= Date.now()) {
    return '可发送'
  }
  const now = new Date()
  const tomorrow = new Date(now)
  tomorrow.setDate(now.getDate() + 1)
  if (isSameDate(next, now)) {
    return formatTime(next)
  }
  if (isSameDate(next, tomorrow)) {
    return `明天${formatTime(next)}`
  }
  return `${pad2(next.getMonth() + 1)}-${pad2(next.getDate())} ${formatTime(next)}`
}

function accountCountText(value) {
  const count = Number(value || 0)
  return Number.isFinite(count) ? String(Math.max(0, Math.trunc(count))) : '0'
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
  if (!row.accountKey) return ''
  if (platform === 'bilibili') {
    return row.uname || ''
  }
  return row.nickname || ''
}

function platformBusyKey(platform) {
  if (platform === 'bilibili') return bilibiliBusyKey.value
  if (platform === 'xiaohongshu') return xiaohongshuBusyKey.value
  if (platform === 'douyin') return douyinBusyKey.value
  return ''
}

function platformErrorText() {
  return [douyinError.value, xiaohongshuError.value, bilibiliError.value].filter(Boolean).join('；')
}

function startPlatformLogin(platform, row) {
  if (platform === 'bilibili') return startBilibiliQrLogin(row)
  if (platform === 'xiaohongshu') return startXiaohongshuQrLogin(row)
  if (platform === 'douyin') return startDouyinQrLogin(row)
  return null
}

function savePlatformKey(platform, row) {
  if (platform === 'bilibili') return saveBilibiliKey(row)
  if (platform === 'xiaohongshu') return saveXiaohongshuKey(row)
  if (platform === 'douyin') return saveDouyinKey(row)
  return null
}

async function warmPlatformIcons() {
  const urls = Object.values(PLATFORM_ICON_URLS)
  for (const url of urls) {
    const image = new Image()
    image.decoding = 'async'
    image.src = url
  }
  if (!('caches' in window)) return
  try {
    const cache = await caches.open('youbi-platform-icons-v1')
    await Promise.allSettled(urls.map(async url => {
      const cached = await cache.match(url)
      if (!cached) await cache.add(url)
    }))
  } catch {
    // Browser image cache still handles these icons when Cache API is unavailable.
  }
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

async function cacheImageUrl(url, cacheName, targetRef) {
  if (!url || targetRef.value[url]) return
  if (!('caches' in window)) return
  try {
    const cache = await caches.open(cacheName)
    const cached = await cache.match(url)
    if (cached) {
      const blob = await cached.blob()
      if (blob.size > 0) {
        targetRef.value = { ...targetRef.value, [url]: URL.createObjectURL(blob) }
        return
      }
    }
    const response = await fetch(url, { mode: 'cors', cache: 'force-cache' })
    if (!response.ok) return
    await cache.put(url, response.clone())
    const blob = await response.blob()
    if (blob.size > 0) {
      targetRef.value = { ...targetRef.value, [url]: URL.createObjectURL(blob) }
    }
  } catch (err) {
    // Fall back to the original URL when a thumbnail host does not allow CORS.
  }
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

function qrImageUrl(url) {
  if (!url) return ''
  return `https://api.qrserver.com/v1/create-qr-code/?size=184x184&data=${encodeURIComponent(url)}`
}

onMounted(() => {
  warmPlatformIcons()
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
  clearFlowPolling()
  clearSubmitterPolling()
  for (const url of Object.values(submitterThumbUrls.value)) {
    if (String(url).startsWith('blob:')) URL.revokeObjectURL(url)
  }
})
</script>

<template>
  <main :class="['page-shell', flowPageOpen ? 'flow-page-shell' : '']">
    <PageTabs :active-page="activePage" :flow-page-open="flowPageOpen" @open-page="openPage" />

    <template v-if="!flowPageOpen">
    <MonitorPage
      v-if="activePage === 'monitor'"
      :error="error"
      :loading="loading"
      :tasks="tasks"
      :service-heartbeats="serviceHeartbeats"
      :task-status-filters="taskStatusFilters"
      :task-status-filter="taskStatusFilter"
      :task-filter-counts="taskFilterCounts"
      :task-type-filter="taskTypeFilter"
      :task-type-filters="taskTypeFilters"
      :task-actions-expanded="taskActionsExpanded"
      :filtered-tasks="filteredTasks"
      :open-failure-key="openFailureKey"
      :service-online="serviceOnline"
      :online-device-title="onlineDeviceTitle"
      :online-device-text="onlineDeviceText"
      :toggle-task-actions="toggleTaskActions"
      :task-actions-open="taskActionsOpen"
      :task-thumbnail-url="taskThumbnailUrl"
      :task-source-url="taskSourceUrl"
      :display-title="displayTitle"
      :task-cached-thumbnail-url="taskCachedThumbnailUrl"
      :mark-image-broken="markImageBroken"
      :copy-task-id="copyTaskId"
      :source-duration-seconds="sourceDurationSeconds"
      :task-type-text="taskTypeText"
      :stage-name="stageName"
      :node-progress="nodeProgress"
      :node-title="nodeTitle"
      :open-task-flow="openTaskFlow"
      :is-task-ready-busy="isTaskReadyBusy"
      :mark-task-ready="markTaskReady"
      :is-task-stop-busy="isTaskStopBusy"
      :stop-task="stopTask"
      :is-task-restart-busy="isTaskRestartBusy"
      :restart-task="restartTask"
      :is-task-delete-busy="isTaskDeleteBusy"
      :delete-task="deleteTask"
      :failure-key="failureKey"
      :failure-details="failureDetails"
      @update:task-status-filter="taskStatusFilter = $event"
      @update:task-type-filter="setTaskTypeFilter"
      @clear-failure="openFailureKey = ''"
    />

    <SubmitterPage
      v-else-if="activePage === 'submitter'"
      v-model:submitter-url="submitterUrl"
      v-model:submitter-author="submitterAuthor"
      v-model:submitter-uploader="submitterUploader"
      v-model:submitter-duration-filter="submitterDurationFilter"
      v-model:submitter-sort="submitterSort"
      v-model:submitter-upload-filter="submitterUploadFilter"
      :submitter-error="submitterError"
      :submitter-loading="submitterLoading"
      :submitter-focused-batch="submitterFocusedBatch"
      :submitter-message="submitterMessage"
      :submitter-status-counts="submitterStatusCounts"
      :submitter-busy="submitterBusy"
      :submitter-author-busy="submitterAuthorBusy"
      :submitter-authors="submitterAuthors"
      :submitter-fields-open="submitterFieldsOpen"
      :submitter-visible-fields="submitterVisibleFields"
      :submitter-fields="submitterFields"
      :submitter-visible-field-list="submitterVisibleFieldList"
      :submitter-filtered-videos="submitterFilteredVideos"
      :submitter-filtered-total="submitterFilteredTotal"
      :submitter-page="submitterPage"
      :submitter-page-count="submitterPageCount"
      :submitter-submitting-id="submitterSubmittingId"
      :submitter-json-payload="submitterJsonPayload"
      :submitter-json-title="submitterJsonTitle"
      :submitter-author-type-open="submitterAuthorTypeOpen"
      :submitter-author-type-error="submitterAuthorTypeError"
      :submitter-author-type-rows="submitterAuthorTypeRows"
      :submitter-author-type-saving="submitterAuthorTypeSaving"
      :create-submitter-video="createSubmitterVideo"
      :import-submitter-author="importSubmitterAuthor"
      :apply-submitter-filters="applySubmitterFilters"
      :open-submitter-author-types="openSubmitterAuthorTypes"
      :reset-submitter-filters="resetSubmitterFilters"
      :clear-submitter-batch-focus="clearSubmitterBatchFocus"
      :toggle-submitter-fields-panel="toggleSubmitterFieldsPanel"
      :select-all-submitter-fields="selectAllSubmitterFields"
      :select-common-submitter-fields="selectCommonSubmitterFields"
      :select-no-submitter-fields="selectNoSubmitterFields"
      :toggle-submitter-field="toggleSubmitterField"
      :submitter-field-label="submitterFieldLabel"
      :submitter-video-thumb="submitterVideoThumb"
      :submitter-cached-thumb="submitterCachedThumb"
      :submitter-video-href="submitterVideoHref"
      :submitter-video-title="submitterVideoTitle"
      :submitter-field-value="submitterFieldValue"
      :submitter-value-kind="submitterValueKind"
      :format-unix-seconds="formatUnixSeconds"
      :submitter-array-preview="submitterArrayPreview"
      :submitter-json-preview="submitterJsonPreview"
      :show-submitter-json="showSubmitterJson"
      :submit-video-to-youbi="submitVideoToYoubi"
      :set-submitter-page="setSubmitterPage"
      :close-submitter-json="closeSubmitterJson"
      :close-submitter-author-types="closeSubmitterAuthorTypes"
      :autosave-submitter-author-type="autosaveSubmitterAuthorType"
    />

    <AccountsPage
      v-else-if="activePage === 'accounts'"
      :account-key-groups="accountKeyGroups"
      :bilibili-qr-code="bilibiliQrCode"
      :bilibili-qr-message="bilibiliQrMessage"
      :xiaohongshu-qr-code="xiaohongshuQrCode"
      :xiaohongshu-qr-message="xiaohongshuQrMessage"
      :add-douyin-cdp-row="addDouyinCdpRow"
      :start-xiaohongshu-qr-login="startXiaohongshuQrLogin"
      :start-bilibili-qr-login="startBilibiliQrLogin"
      :account-display="accountDisplay"
      :account-count-text="accountCountText"
      :next-send-text="nextSendText"
      :qr-image-url="qrImageUrl"
      :platform-error-text="platformErrorText"
    />
    </template>

    <TaskFlowPage
      v-else
      v-model:selected-stage-key="selectedStageKey"
      v-model:speech-edit-draft="speechEditDraft"
      :selected-task-flow="selectedTaskFlow"
      :flow-loading="flowLoading"
      :flow-error="flowError"
      :flow-tabs="flowTabs"
      :selected-stage="selectedStage"
      :speech-edit-saving="speechEditSaving"
      :speech-edit-error="speechEditError"
      :flow-task-title="flowTaskTitle"
      :flow-duration-seconds="flowDurationSeconds"
      :refresh-task-flow="refreshTaskFlow"
      :close-task-flow="closeTaskFlow"
      :flow-cover-url="flowCoverUrl"
      :flow-source-url="flowSourceUrl"
      :mark-image-broken="markImageBroken"
      :stage-name="stageName"
      :upload-submission-rows="uploadSubmissionRows"
      :upload-platform-name="uploadPlatformName"
      :speech-columns="speechColumns"
      :speech-rows="speechRows"
      :show-speech-column="showSpeechColumn"
      :speech-audio-asset="speechAudioAsset"
      :log-audio-event="logAudioEvent"
      :speech-more-rows="speechMoreRows"
      :is-editing-speech-dst-text="isEditingSpeechDstText"
      :save-speech-dst-text="saveSpeechDstText"
      :cancel-speech-edit="cancelSpeechEdit"
      :can-edit-speech-dst-text="canEditSpeechDstText"
      :begin-speech-edit="beginSpeechEdit"
      :table-cell-text="tableCellText"
      :table-cell-summary="tableCellSummary"
      :stage-media="stageMedia"
      :field-rows="fieldRows"
      :table-columns="tableColumns"
    />
  </main>
</template>
