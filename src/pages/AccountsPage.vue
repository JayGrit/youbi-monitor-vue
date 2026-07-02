<script setup>
import { computed, ref } from 'vue'
import PlatformIcon from '../components/PlatformIcon.vue'
import { normalizeAccountAvatarUrl } from '../utils/accountAvatar'
import { formatDateTime, formatTime, isSameDate, pad2, parseLocalDateTime } from '../utils/format'

const props = defineProps({
  accountKeyGroups: { type: Array, default: () => [] },
  backupperDiskStatus: { type: Object, default: null },
  backupperDiskStatusText: { type: String, default: '' },
  accountPlatforms: { type: Array, default: () => [] },
  bilibiliQrCode: { type: Object, default: null },
  bilibiliQrMessage: { type: String, default: '' },
  xiaohongshuQrCode: { type: Object, default: null },
  xiaohongshuQrMessage: { type: String, default: '' },
  uploadBackfillOpen: { type: Boolean, default: false },
  uploadBackfillContext: { type: Object, default: null },
  uploadBackfillRows: { type: Array, default: () => [] },
  uploadBackfillLoading: { type: Boolean, default: false },
  uploadBackfillBusy: { type: Boolean, default: false },
  uploadBackfillSelectedIds: { type: Array, default: () => [] },
  uploadBackfillSelectedSet: { type: Object, required: true },
  uploadBackfillAllSelected: { type: Boolean, default: false },
  uploadBackfillError: { type: String, default: '' },
  uploaderPhoneMatrix: { type: Object, default: () => ({ phones: [], platforms: [] }) },
  uploaderPhoneLoading: { type: Boolean, default: false },
  uploaderPhoneSavingKey: { type: String, default: '' },
  uploaderPhoneAgentBusyKey: { type: String, default: '' },
  uploaderPhoneError: { type: String, default: '' },
  standaloneAccounts: { type: Array, default: () => [] },
  standaloneAccountLoading: { type: Boolean, default: false },
  standaloneAccountBusyKey: { type: String, default: '' },
  togglePlatformEnabled: { type: Function, required: true },
  savePlatformCooldown: { type: Function, required: true },
  savePlatformQuietTime: { type: Function, required: true },
  savePlatformDownloaderMaxStagedCount: { type: Function, required: true },
  savePlatformNextUploadAllowedAt: { type: Function, required: true },
  savePlatformKey: { type: Function, required: true },
  savePlatformAccountProfile: { type: Function, required: true },
  uploadPlatformAccountAvatar: { type: Function, required: true },
  openUploadBackfill: { type: Function, required: true },
  openTaskFlow: { type: Function, required: true },
  closeUploadBackfill: { type: Function, required: true },
  loadUploadBackfillCandidates: { type: Function, required: true },
  toggleUploadBackfillRow: { type: Function, required: true },
  toggleUploadBackfillAll: { type: Function, required: true },
  registerSelectedUploadBackfill: { type: Function, required: true },
  saveUploaderPhoneAccount: { type: Function, required: true },
  runUploaderPhoneAccountScript: { type: Function, required: true },
  runStandaloneAccount: { type: Function, required: true },
  accountDisplay: { type: Function, required: true },
  accountAvatarUrl: { type: Function, required: true },
  accountAvatarInitial: { type: Function, required: true },
  accountCountText: { type: Function, required: true },
  nextSendText: { type: Function, required: true },
  platformBusyKey: { type: Function, required: true },
  platformBusyAction: { type: Function, required: true },
  qrImageUrl: { type: Function, required: true },
  platformErrorText: { type: Function, required: true },
})

const STALE_READY_MINUTES = 10

const accountEditMode = ref(false)
const accountAvatarCache = ref({})
const uploaderPhoneEditMode = ref(false)
const diskStatusOpen = ref(false)

const standaloneLabels = {
  notebooklm: 'NotebookLM',
  chatgpt: 'ChatGPT',
}

const DISK_CHART_COLORS = ['#2563eb', '#16a34a', '#f59e0b', '#8b5cf6', '#94a3b8', '#ffffff']

const diskUsageItems = computed(() => {
  const gib = 1024 ** 3
  const status = props.backupperDiskStatus || {}
  const usedBytes = Math.max(0, Number(status.usedGb || 0) * gib)
  const availableBytes = Math.max(0, Number(status.availableGb || 0) * gib)
  const totalBytes = Math.max(
    Number(status.totalGb || 0) * gib,
    usedBytes + availableBytes,
  )
  const minioBytes = Math.max(0, Number(status.minioBytes || 0))
  const dockerImageBytes = Math.max(0, Number(status.dockerImageBytes || 0))
  const danglingBytes = Math.min(dockerImageBytes, Math.max(0, Number(status.dockerDanglingImageBytes || 0)))
  const buildCacheBytes = Math.max(0, Number(status.dockerBuildCacheBytes || 0))
  const knownBytes = minioBytes + dockerImageBytes + buildCacheBytes
  return [
    { label: 'MinIO', value: minioBytes, color: DISK_CHART_COLORS[0] },
    { label: 'Docker 镜像', value: Math.max(0, dockerImageBytes - danglingBytes), color: DISK_CHART_COLORS[1] },
    { label: 'Docker dangling 镜像', value: danglingBytes, color: DISK_CHART_COLORS[2] },
    { label: 'Docker 构建缓存', value: buildCacheBytes, color: DISK_CHART_COLORS[3] },
    { label: '其他系统占用', value: Math.max(0, totalBytes - availableBytes - knownBytes), color: DISK_CHART_COLORS[4] },
    { label: '可用空间', value: availableBytes, color: DISK_CHART_COLORS[5] },
  ]
})

const diskUsageTotal = computed(() => diskUsageItems.value.reduce((sum, item) => sum + item.value, 0))

const diskChartStyle = computed(() => {
  const total = diskUsageTotal.value
  if (!total) return { background: DISK_CHART_COLORS[4] }
  let offset = 0
  const stops = diskUsageItems.value.map(item => {
    const start = offset
    offset += item.value / total * 100
    return `${item.color} ${start}% ${offset}%`
  })
  return { background: `conic-gradient(${stops.join(', ')})` }
})

function formatStorageBytes(value) {
  const bytes = Math.max(0, Number(value || 0))
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(2)} GB`
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(1)} MB`
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${Math.round(bytes)} B`
}

function diskUsagePercent(value) {
  if (!diskUsageTotal.value) return '0.0%'
  return `${(Number(value || 0) / diskUsageTotal.value * 100).toFixed(1)}%`
}

const phonePlatformAccounts = computed(() => {
  const groups = new Map()
  for (const row of props.uploaderPhoneMatrix?.platforms || []) {
    groups.set(row.platform, row.accounts || [])
  }
  return groups
})

const phoneRows = computed(() => (props.uploaderPhoneMatrix?.phones || []).filter(phone => {
  return String(phone?.remark || '').trim() !== '默认占位'
}))

const accountRowsByPlatformKey = computed(() => {
  const rows = new Map()
  for (const group of props.accountKeyGroups || []) {
    for (const item of group.rows || []) {
      if (item?.type && item?.row?.accountKey) {
        rows.set(`${item.type}:${item.row.accountKey}`, item.row)
      }
    }
  }
  return rows
})

function accountName(type, row) {
  return row?.draftDisplayName || props.accountDisplay(row, type)
}

function accountAvatar(type, row) {
  const url = normalizeAccountAvatarUrl(row?.draftAvatarUrl || props.accountAvatarUrl(row))
  cacheAccountAvatar(url)
  return accountAvatarCache.value[url] || url
}

function accountDraft(row, type) {
  return {
    enabled: row.enabled !== false,
    key: row.accountKey || '',
    cooldownMinMinutes: cooldownDraftMinutes(row.uploadCooldownMinSeconds, 60),
    cooldownMaxMinutes: cooldownDraftMinutes(row.uploadCooldownMaxSeconds, 120),
    uploadQuietStartTime: timeInputValue(row.uploadQuietStartTime, '01:00'),
    uploadQuietEndTime: timeInputValue(row.uploadQuietEndTime, '07:00'),
    downloaderMaxStagedCount: String(Number.isFinite(Number(row.downloaderMaxStagedCount)) ? Number(row.downloaderMaxStagedCount) : 5),
    nextUploadAllowedAt: dateTimeLocalValue(row.nextUploadAllowedAt),
  }
}

function cooldownDraftMinutes(seconds, fallback) {
  const value = Number(seconds)
  return Number.isFinite(value) ? String(Math.round(value / 60)) : String(fallback)
}

function timeInputValue(value, fallback) {
  const text = String(value || '').trim()
  const match = text.match(/^(\d{2}:\d{2})(?::\d{2})?$/)
  return match ? match[1] : fallback
}

function resetAccountDraft(item) {
  const draft = accountDraft(item.row, item.type)
  item.row.draftEnabled = draft.enabled
  item.row.draftKey = draft.key
  item.row.draftCooldownMinMinutes = draft.cooldownMinMinutes
  item.row.draftCooldownMaxMinutes = draft.cooldownMaxMinutes
  item.row.draftUploadQuietStartTime = draft.uploadQuietStartTime
  item.row.draftUploadQuietEndTime = draft.uploadQuietEndTime
  item.row.draftDownloaderMaxStagedCount = draft.downloaderMaxStagedCount
  item.row.draftNextUploadAllowedAt = draft.nextUploadAllowedAt
}

function accountChanges(item) {
  const row = item.row
  const draft = accountDraft(row, item.type)
  return {
    cooldown:
      String(row.draftCooldownMinMinutes ?? '').trim() !== draft.cooldownMinMinutes
      || String(row.draftCooldownMaxMinutes ?? '').trim() !== draft.cooldownMaxMinutes,
    downloaderMaxStagedCount: String(row.draftDownloaderMaxStagedCount ?? '').trim() !== draft.downloaderMaxStagedCount,
    quietTime:
      String(row.draftUploadQuietStartTime ?? '').trim() !== draft.uploadQuietStartTime
      || String(row.draftUploadQuietEndTime ?? '').trim() !== draft.uploadQuietEndTime,
    enabled: (row.draftEnabled !== false) !== draft.enabled,
    key: Boolean(String(row.draftKey || '').trim()) && String(row.draftKey || '').trim() !== draft.key,
    nextUploadAllowedAt: String(row.draftNextUploadAllowedAt ?? '').trim() !== draft.nextUploadAllowedAt,
  }
}

function enterAccountEditMode() {
  forEachConfiguredAccount(resetAccountDraft)
  accountEditMode.value = true
}

function cancelAccountEditMode() {
  forEachConfiguredAccount(resetAccountDraft)
  props.closeUploadBackfill()
  accountEditMode.value = false
}

function configuredAccounts() {
  return props.accountKeyGroups.flatMap(group => group.rows.filter(item => item.configured))
}

async function saveAccountKeyEdit(item) {
  if (!item?.configured || !accountChanges(item).key) return
  await props.savePlatformKey(item.type, item.row)
}

async function saveAccountCooldownEdit(item) {
  if (!item?.configured || !accountChanges(item).cooldown) return
  await props.savePlatformCooldown(item.type, item.row)
}

async function saveAccountQuietTimeEdit(item) {
  if (!item?.configured || !accountChanges(item).quietTime) return
  await props.savePlatformQuietTime(item.type, item.row)
}

async function saveAccountDownloaderMaxStagedCountEdit(item) {
  if (!item?.configured || !accountChanges(item).downloaderMaxStagedCount) return
  await props.savePlatformDownloaderMaxStagedCount(item.type, item.row)
}

async function saveAccountNextSendEdit(item) {
  if (!item?.configured || !accountChanges(item).nextUploadAllowedAt) return
  await props.savePlatformNextUploadAllowedAt(item.type, item.row)
}

async function saveAccountEnabledEdit(item) {
  if (!item?.configured || !accountChanges(item).enabled) return
  await props.togglePlatformEnabled(item.type, item.row)
}

function accountRowBusyKey(item) {
  return String(item?.row?.accountKey || item?.row?.draftKey || '').trim()
}

function accountRowSaving(item) {
  return Boolean(item?.configured && props.platformBusyKey(item.type) === accountRowBusyKey(item))
}

function forEachConfiguredAccount(callback) {
  configuredAccounts().forEach(callback)
}

function visibleRows(group) {
  return group.rows.filter(item => accountEditMode.value || item.row.enabled !== false)
}

const visibleAccountGroups = computed(() => {
  return (props.accountKeyGroups || [])
    .map(group => ({
      ...group,
      visibleRows: visibleRows(group),
    }))
    .filter(group => group.visibleRows.length > 0)
})

const visiblePhonePlatforms = computed(() => {
  return props.accountPlatforms.filter(platform => phoneAccountOptions(platform.type).length > 0)
})

async function cacheAccountAvatar(url) {
  url = normalizeAccountAvatarUrl(url)
  if (!url || accountAvatarCache.value[url] || !('caches' in window)) return
  try {
    const cache = await caches.open('youbi-account-avatars-v1')
    const cached = await cache.match(url)
    if (cached) {
      const blob = await cached.blob()
      if (blob.size > 0) {
        accountAvatarCache.value = { ...accountAvatarCache.value, [url]: URL.createObjectURL(blob) }
        return
      }
    }
    const response = await fetch(url, { mode: 'cors', cache: 'force-cache' })
    if (!response.ok) return
    await cache.put(url, response.clone())
    const blob = await response.blob()
    if (blob.size > 0) {
      accountAvatarCache.value = { ...accountAvatarCache.value, [url]: URL.createObjectURL(blob) }
    }
  } catch {
    // Fall back to the original MinIO URL if the cache API cannot read it.
  }
}

function accountAvailable(row) {
  for (const key of ['available', 'accountAvailable', 'usable', 'isAvailable']) {
    if (typeof row?.[key] === 'boolean') return row[key]
  }
  for (const key of ['availableStatus', 'availabilityStatus', 'usableStatus']) {
    const value = String(row?.[key] || '').trim().toLowerCase()
    if (['unavailable', 'invalid', 'failed', '不可用'].includes(value)) return false
    if (['available', 'valid', 'ok', '可用'].includes(value)) return true
  }
  return null
}

function accountRowUnavailable(item) {
  return item?.configured && item.row?.enabled !== false && accountAvailable(item.row) === false
}

function dateTimeLocalValue(value) {
  const date = parseLocalDateTime(value)
  if (!date) return ''
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}T${pad2(date.getHours())}:${pad2(date.getMinutes())}`
}

function lastUploadText(value) {
  const date = parseLocalDateTime(value)
  if (!date) return '-'
  const now = new Date()
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  if (isSameDate(date, now)) {
    return formatTime(date)
  }
  if (isSameDate(date, yesterday)) {
    return `昨天${formatTime(date)}`
  }
  return `${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`
}

function nextSendDisplay(row) {
  if (accountStatsLoading(row)) return '加载中'
  const text = props.nextSendText(row)
  if (text !== '可发送') return text
  const next = parseLocalDateTime(row?.nextUploadAllowedAt)
  if (!next) return text
  const waitingMs = Date.now() - next.getTime()
  if (waitingMs < STALE_READY_MINUTES * 60 * 1000) return text
  const minutes = Math.floor(waitingMs / 60000)
  return `超时${minutes}Min`
}

function runningTaskId(row) {
  return String(row?.uploadRunningTaskId || '').trim()
}

function nextSendRunning(row) {
  return !accountStatsLoading(row) && nextSendDisplay(row) === '发送中' && Boolean(runningTaskId(row))
}

function openRunningTask(row) {
  const taskId = runningTaskId(row)
  if (!taskId) return
  props.openTaskFlow({ taskId }, 'uploader')
}

function nextSendStale(row) {
  return !accountStatsLoading(row) && nextSendDisplay(row).startsWith('超时')
}

function nextSendReady(row) {
  return !accountStatsLoading(row) && nextSendDisplay(row) === '可发送'
}

function failedUploadCount(row) {
  if (accountStatsLoading(row)) return 0
  return Number(row?.failedUploadCount || 0)
}

function stagedFailedCount(row) {
  if (accountStatsLoading(row)) return 0
  return Number(row?.stagedFailedCount || 0)
}

function accountStatsLoading(row) {
  return row?.statsLoading === true
}

function accountMetricText(row, field) {
  return accountStatsLoading(row) ? '加载中' : props.accountCountText(row?.[field])
}

function phoneAccountField(platform) {
  return platform
}

function phoneAccountValue(phone, platform) {
  const value = phoneBinding(phone, platform)?.accountId ?? phone?.accounts?.[phoneAccountField(platform)]
  return value == null ? '' : String(value)
}

function phoneNoteValue(phone, platform) {
  return String(phoneBinding(phone, platform)?.note || '')
}

function phoneBinding(phone, platform) {
  return phone?.bindings?.[phoneAccountField(platform)] || null
}

function phoneCellDisabled(phone, platform) {
  return phoneBinding(phone, platform)?.disabled === true
}

function selectedPhoneAccount(phone, platform) {
  const accountId = phoneAccountValue(phone, platform)
  if (!accountId) return null
  return phoneAccountOptions(platform).find(account => String(account.id) === accountId) || null
}

function phoneAccountName(account) {
  const remark = String(account?.remark || '').trim()
  if (remark) return remark
  const displayName = String(account?.displayName || '').trim()
  const accountKey = String(account?.accountKey || '').trim()
  return displayName && displayName !== accountKey ? displayName : ''
}

function phoneSelectedAccountRow(phone, platform) {
  const account = selectedPhoneAccount(phone, platform)
  if (!account?.accountKey) return null
  return accountRowsByPlatformKey.value.get(`${platform}:${account.accountKey}`) || null
}

function phoneAccountProfileName(phone, platform) {
  const account = selectedPhoneAccount(phone, platform)
  return phoneAccountName(account)
}

function phoneAccountProfileAvatar(phone, platform) {
  const row = phoneSelectedAccountRow(phone, platform)
  const account = selectedPhoneAccount(phone, platform)
  return row ? accountAvatar(platform, row) : phoneAccountAvatar(account)
}

function syncPhoneAccountOption(platform, accountKey, profile) {
  if (!accountKey || !profile) return
  const account = phoneAccountOptions(platform).find(item => item.accountKey === accountKey)
  if (!account) return
  if (Object.prototype.hasOwnProperty.call(profile, 'displayName')) {
    account.remark = profile.displayName || ''
  }
  if (profile.avatarUrl) {
    account.avatarUrl = profile.avatarUrl
  }
}

function phoneAccountOptions(platform) {
  return phonePlatformAccounts.value.get(platform) || []
}

function accountOptionText(account) {
  const name = account?.displayName || account?.accountKey || ''
  const remark = account?.remark || ''
  const text = name === account?.accountKey ? name : `${name} (${account.accountKey})`
  return remark ? `${text} - ${remark}` : text
}

function phoneCellInputValue(phone, platform) {
  const note = phoneNoteValue(phone, platform)
  if (note) return note
  const account = selectedPhoneAccount(phone, platform)
  return account ? accountOptionText(account) : ''
}

function phoneCellListId(phone, platform) {
  return `uploader-phone-options-${platform}-${phone?.id}`
}

function findPhoneAccountOption(platform, value) {
  const normalized = String(value || '').trim()
  if (!normalized) return null
  return phoneAccountOptions(platform).find(account => {
    return [
      String(account.id),
      account.accountKey,
      account.displayName,
      accountOptionText(account),
    ].filter(Boolean).some(item => String(item).trim() === normalized)
  }) || null
}

function phoneAccountAvatar(account) {
  const url = normalizeAccountAvatarUrl(account?.avatarUrl || '')
  cacheAccountAvatar(url)
  return accountAvatarCache.value[url] || url
}

function phoneAccountInitial(account) {
  const text = account?.displayName || account?.accountKey || ''
  return text.trim().slice(0, 1).toUpperCase() || 'A'
}

function phoneCellSaving(phone, platform) {
  return props.uploaderPhoneSavingKey === `${phone?.id}:${platform}`
}

function phoneCellUnavailable(phone, platform) {
  return selectedPhoneAccount(phone, platform)?.isAvailable === false
}

function phoneCellAgentBusy(phone, platform) {
  const accountKey = selectedPhoneAccount(phone, platform)?.accountKey || ''
  return props.uploaderPhoneAgentBusyKey.startsWith(`${platform}:`)
    && (!accountKey || props.uploaderPhoneAgentBusyKey.endsWith(`:${accountKey}`))
}

function defaultNewAccountKey(phone, platform) {
  const phoneDigits = String(phone?.phone || '').replace(/\D/g, '')
  return `${platform}-${phoneDigits || phone?.id || 'new'}`
}

async function runPhoneCellAction(phone, platform) {
  if (uploaderPhoneEditMode.value || phoneCellAgentBusy(phone, platform)) return
  const account = selectedPhoneAccount(phone, platform)
  if (account?.accountKey) {
    const action = account.isAvailable === false ? 'renew' : 'open'
    await props.runUploaderPhoneAccountScript(platform, action, account.accountKey)
    return
  }

  const accountKey = window.prompt('请输入新账号 key', defaultNewAccountKey(phone, platform))
  if (!accountKey?.trim()) return
  const normalizedKey = accountKey.trim()
  if (!window.confirm(`确认新建 ${platform} 账号：${normalizedKey}？`)) return
  if (!window.confirm(`请再次确认：将执行 new，并使用 key ${normalizedKey}。`)) return
  await props.runUploaderPhoneAccountScript(platform, 'new', normalizedKey)
}

async function savePhonePlatform(phone, platform, event) {
  const value = String(event?.target?.value || '').trim()
  const account = findPhoneAccountOption(platform, value)
  await props.saveUploaderPhoneAccount(phone, platform, account?.id || null, account ? '' : value, phoneCellDisabled(phone, platform))
}

async function togglePhoneDisabled(phone, platform) {
  const disabled = !phoneCellDisabled(phone, platform)
  const accountId = phoneAccountValue(phone, platform) || null
  await props.saveUploaderPhoneAccount(phone, platform, accountId, phoneNoteValue(phone, platform), disabled)
}

async function savePhoneAccountProfile(phone, platform, event) {
  const row = phoneSelectedAccountRow(phone, platform)
  const account = selectedPhoneAccount(phone, platform)
  if (!row || !account) return
  const nextName = String(event?.target?.value || '').trim()
  const currentName = phoneAccountName(account)
  if (nextName === currentName) return
  row.draftDisplayName = nextName
  const profile = await props.savePlatformAccountProfile(platform, row)
  syncPhoneAccountOption(platform, account.accountKey, profile)
}

async function uploadPhoneAccountAvatar(phone, platform, event) {
  const row = phoneSelectedAccountRow(phone, platform)
  const account = selectedPhoneAccount(phone, platform)
  const file = event?.target?.files?.[0]
  if (!row || !account || !file) return
  try {
    const profile = await props.uploadPlatformAccountAvatar(platform, row, file)
    syncPhoneAccountOption(platform, account.accountKey, profile)
    if (profile?.avatarUrl) {
      const avatarUrl = normalizeAccountAvatarUrl(profile.avatarUrl)
      delete accountAvatarCache.value[avatarUrl]
      cacheAccountAvatar(avatarUrl)
    }
  } finally {
    if (event?.target) event.target.value = ''
  }
}
</script>

<template>
  <section class="account-page" aria-label="账号管理">
    <section class="biliup-panel account-overview" aria-label="账号管理总览">
      <div class="account-page-head">
        <div></div>
        <div class="account-edit-actions">
          <button
            v-if="backupperDiskStatusText"
            type="button"
            class="account-disk-status"
            title="查看硬盘空间构成"
            @click="diskStatusOpen = true"
          >
            {{ backupperDiskStatusText }}
          </button>
          <template v-if="accountEditMode">
            <button type="button" @click="cancelAccountEditMode">完成</button>
          </template>
          <button v-else type="button" @click="enterAccountEditMode">编辑</button>
        </div>
      </div>
      <div v-if="visibleAccountGroups.length" class="account-key-list" :class="{ editing: accountEditMode }" aria-label="按 key 分组账号表">
        <div class="account-group-grid account-group-heading" :class="{ editing: accountEditMode }">
          <span class="account-type-header">Type</span>
          <div class="account-row account-header account-platform-row">
            <span>Platform</span>
            <span>头像</span>
            <span>账号</span>
            <span v-if="!accountEditMode">今日已发</span>
            <span v-if="!accountEditMode">冷却等待</span>
            <span v-if="!accountEditMode">生产中</span>
            <span v-if="!accountEditMode">上传中</span>
            <span v-if="!accountEditMode">生产失败</span>
            <span v-if="!accountEditMode">待拉取</span>
            <span v-if="!accountEditMode">失败任务</span>
            <span v-if="!accountEditMode">上次上传</span>
            <span v-if="!accountEditMode">下次可发送</span>
            <span v-if="accountEditMode">Key</span>
            <span v-if="accountEditMode">操作</span>
            <span v-if="accountEditMode">随机冷却</span>
            <span v-if="accountEditMode">禁发时间</span>
            <span v-if="accountEditMode">最大暂存</span>
            <span v-if="accountEditMode">启用</span>
          </div>
        </div>
        <section v-for="group in visibleAccountGroups" :key="group.key" class="account-key-group">
          <div class="account-group-grid" :class="{ editing: accountEditMode }">
            <strong class="account-type-cell">{{ group.key }}</strong>
            <div class="account-table" :class="{ editing: accountEditMode }">
            <div
              v-for="item in group.visibleRows"
              :key="`${group.key}-${item.type}`"
              :class="['account-row account-platform-row', { unavailable: accountRowUnavailable(item), saving: accountRowSaving(item) }]"
            >
              <span class="platform-mark" :class="{ saving: accountRowSaving(item) }">
                <PlatformIcon :src="item.iconUrl" :label="item.label" :platform="item.type" />
              </span>
              <span data-label="头像">
                <label
                  v-if="item.configured"
                  class="account-avatar-cell"
                >
                  <img
                    v-if="accountAvatar(item.type, item.row)"
                    :src="accountAvatar(item.type, item.row)"
                    :alt="accountName(item.type, item.row)"
                    loading="lazy"
                    decoding="async"
                  />
                  <span v-else class="account-avatar-fallback">{{ accountAvatarInitial(item.row, item.type) }}</span>
                </label>
                <template v-else>-</template>
              </span>
              <span data-label="账号">
                <span v-if="item.configured" class="account-profile-text">
                  <strong>{{ accountName(item.type, item.row) }}</strong>
                </span>
                <template v-else>-</template>
              </span>
              <span v-if="!accountEditMode" data-label="今日已发">{{ item.configured ? accountMetricText(item.row, 'todayUploadCount') : '-' }}</span>
              <span v-if="!accountEditMode" data-label="冷却等待">{{ item.configured ? accountMetricText(item.row, 'cooldownWaitingCount') : '-' }}</span>
              <span v-if="!accountEditMode" data-label="生产中">{{ item.configured ? accountMetricText(item.row, 'stagedRunningCount') : '-' }}</span>
              <span v-if="!accountEditMode" data-label="上传中">{{ item.configured ? accountMetricText(item.row, 'uploadRunningCount') : '-' }}</span>
              <span v-if="!accountEditMode" :class="{ 'failed-task-count': item.configured && stagedFailedCount(item.row) > 0 }" data-label="生产失败">
                {{ item.configured ? accountMetricText(item.row, 'stagedFailedCount') : '-' }}
              </span>
              <span v-if="!accountEditMode" data-label="待拉取">{{ item.configured ? accountMetricText(item.row, 'downloaderPendingCount') : '-' }}</span>
              <span v-if="!accountEditMode" :class="{ 'failed-task-count': item.configured && failedUploadCount(item.row) > 0 }" data-label="失败任务">
                {{ item.configured ? accountMetricText(item.row, 'failedUploadCount') : '-' }}
              </span>
              <span v-if="!accountEditMode" class="last-upload-time" data-label="上次上传">{{ item.configured ? lastUploadText(item.row.lastUploadAt) : '-' }}</span>
              <span
                v-if="!accountEditMode"
                :class="{
                  'next-send-ready': item.configured && nextSendReady(item.row),
                  'next-send-stale': item.configured && nextSendStale(item.row),
                }"
                data-label="下次可发送"
              >
                <button
                  v-if="item.configured && nextSendRunning(item.row)"
                  type="button"
                  class="next-send-link"
                  @click="openRunningTask(item.row)"
                >
                  {{ nextSendDisplay(item.row) }}
                </button>
                <template v-else>{{ item.configured ? nextSendDisplay(item.row) : '-' }}</template>
              </span>
              <span v-if="accountEditMode" data-label="Key">
                <input
                  v-if="item.configured"
                  v-model="item.row.draftKey"
                  type="text"
                  class="account-key-input"
                  aria-label="账号 key"
                  placeholder="账号 key"
                  :disabled="accountRowSaving(item)"
                  @change="saveAccountKeyEdit(item)"
                />
                <template v-else>-</template>
              </span>
              <span v-if="accountEditMode" data-label="操作">
                <button
                  v-if="item.configured"
                  type="button"
                  class="account-backfill-button"
                  :disabled="accountRowSaving(item)"
                  @click="openUploadBackfill(item.type, item.label, item.row.accountKey, group.key)"
                >
                  补发历史
                </button>
                <template v-else>-</template>
              </span>
              <span v-if="accountEditMode" class="cooldown-editor" data-label="随机冷却">
                <template v-if="item.configured">
                  <input
                    v-model="item.row.draftCooldownMinMinutes"
                    type="number"
                    min="0"
                    step="1"
                    aria-label="最小冷却分钟"
                    :disabled="accountRowSaving(item)"
                    @change="saveAccountCooldownEdit(item)"
                  />
                  <span>-</span>
                  <input
                    v-model="item.row.draftCooldownMaxMinutes"
                    type="number"
                    min="0"
                    step="1"
                    aria-label="最大冷却分钟"
                    :disabled="accountRowSaving(item)"
                    @change="saveAccountCooldownEdit(item)"
                  />
                </template>
                <template v-else>-</template>
              </span>
              <span v-if="accountEditMode" class="cooldown-editor quiet-time-editor" data-label="禁发时间">
                <template v-if="item.configured">
                  <input
                    v-model="item.row.draftUploadQuietStartTime"
                    type="time"
                    aria-label="禁发开始时间"
                    :disabled="accountRowSaving(item)"
                    @change="saveAccountQuietTimeEdit(item)"
                  />
                  <span>-</span>
                  <input
                    v-model="item.row.draftUploadQuietEndTime"
                    type="time"
                    aria-label="禁发结束时间"
                    :disabled="accountRowSaving(item)"
                    @change="saveAccountQuietTimeEdit(item)"
                  />
                </template>
                <template v-else>-</template>
              </span>
              <span v-if="accountEditMode" data-label="最大暂存">
                <input
                  v-if="item.configured"
                  v-model="item.row.draftDownloaderMaxStagedCount"
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  class="account-small-number-input"
                  aria-label="最大暂存个数"
                  :disabled="accountRowSaving(item)"
                  @change="saveAccountDownloaderMaxStagedCountEdit(item)"
                />
                <template v-else>-</template>
              </span>
              <span v-if="accountEditMode" data-label="启用">
                <label v-if="item.configured" class="account-enabled-edit">
                  <input
                    v-model="item.row.draftEnabled"
                    type="checkbox"
                    :disabled="accountRowSaving(item)"
                    @change="saveAccountEnabledEdit(item)"
                  />
                  {{ item.row.draftEnabled ? '启用' : '禁用' }}
                </label>
                <template v-else>-</template>
              </span>
            </div>
            </div>
          </div>
        </section>
      </div>
      <div v-else class="empty-state">暂无账号配置</div>

      <div v-if="accountEditMode && uploadBackfillOpen && uploadBackfillContext" class="upload-backfill-panel">
        <div class="upload-retry-head">
          <strong>
            {{ uploadBackfillLoading ? '正在加载历史视频' : `补发候选 ${uploadBackfillRows.length} 个` }}
          </strong>
          <span class="upload-backfill-context">
            {{ uploadBackfillContext.type }} · {{ uploadBackfillContext.platformLabel }}/{{ uploadBackfillContext.accountKey }}
          </span>
          <div class="upload-retry-actions">
            <button type="button" :disabled="uploadBackfillLoading || uploadBackfillRows.length === 0" @click="toggleUploadBackfillAll">
              {{ uploadBackfillAllSelected ? '取消全选' : '全选' }}
            </button>
            <button type="button" :disabled="uploadBackfillLoading || uploadBackfillBusy" @click="loadUploadBackfillCandidates">
              刷新
            </button>
            <button type="button" :disabled="uploadBackfillBusy" @click="closeUploadBackfill">
              关闭
            </button>
            <button
              type="button"
              class="primary"
              :disabled="uploadBackfillBusy || uploadBackfillSelectedIds.length === 0"
              @click="registerSelectedUploadBackfill"
            >
              {{ uploadBackfillBusy ? '注册中' : `注册选中 ${uploadBackfillSelectedIds.length}` }}
            </button>
          </div>
        </div>
        <p v-if="uploadBackfillError" class="inline-error">{{ uploadBackfillError }}</p>
        <div v-if="!uploadBackfillLoading && uploadBackfillRows.length === 0" class="upload-retry-empty">
          当前 type 暂无可补发历史视频
        </div>
        <div v-else class="upload-retry-list">
          <label
            v-for="row in uploadBackfillRows"
            :key="row.taskId"
            :class="['upload-retry-row', 'upload-backfill-row', { blocked: !row.selectable }]"
          >
            <input
              type="checkbox"
              :checked="uploadBackfillSelectedSet.has(row.taskId)"
              :disabled="!row.selectable"
              @change="toggleUploadBackfillRow(row)"
            />
            <span class="upload-backfill-cover">
              <img v-if="row.coverUrl" :src="row.coverUrl" :alt="row.title || row.taskId" loading="lazy" decoding="async" />
            </span>
            <span class="upload-retry-main">
              <span class="upload-retry-title">{{ row.title || row.taskId }}</span>
              <span class="upload-retry-meta">
                {{ row.taskId }} · 已发 {{ (row.uploadedPlatforms || []).join(', ') || '-' }} · {{ formatDateTime(row.completedAt) }}
              </span>
              <span v-if="!row.selectable" class="upload-retry-error">{{ row.blockedReason || '不可注册' }}</span>
            </span>
          </label>
        </div>
      </div>

      <div class="account-qr-grid">
        <div v-if="bilibiliQrCode" class="bilibili-login">
          <img :src="qrImageUrl(bilibiliQrCode.url)" alt="B站登录二维码" />
          <div>
            <strong>{{ bilibiliQrMessage }}</strong>
            <a :href="bilibiliQrCode.url" target="_blank" rel="noreferrer">打开登录链接</a>
          </div>
        </div>

        <div v-if="xiaohongshuQrCode" class="bilibili-login">
          <img :src="xiaohongshuQrCode.imageDataUrl" alt="小红书登录二维码" />
          <div>
            <strong>{{ xiaohongshuQrMessage }}</strong>
            <span>请用小红书 App 扫码并确认登录</span>
          </div>
        </div>
      </div>

      <p v-if="platformErrorText()" class="inline-error">{{ platformErrorText() }}</p>
    </section>

    <section class="biliup-panel uploader-phone-panel" aria-label="手机号账号矩阵">
      <div class="uploader-phone-head">
        <strong>手机号账号</strong>
        <div class="uploader-phone-actions">
          <span v-if="uploaderPhoneLoading">加载中</span>
          <button type="button" @click="uploaderPhoneEditMode = !uploaderPhoneEditMode">
            {{ uploaderPhoneEditMode ? '完成' : '编辑' }}
          </button>
        </div>
      </div>
      <div v-if="phoneRows.length && visiblePhonePlatforms.length" class="uploader-phone-table">
        <div
          class="uploader-phone-row uploader-phone-header-row"
          :style="{ gridTemplateColumns: `72px repeat(${phoneRows.length}, minmax(180px, 1fr))` }"
        >
          <span class="uploader-phone-platform-cell"></span>
          <span v-for="phone in phoneRows" :key="phone.id" class="uploader-phone-head-cell">
            <small v-if="phone.remark">{{ phone.remark }}</small>
            <strong>{{ phone.phone }}</strong>
          </span>
        </div>
        <div
          v-for="platform in visiblePhonePlatforms"
          :key="platform.type"
          class="uploader-phone-row"
          :style="{ gridTemplateColumns: `72px repeat(${phoneRows.length}, minmax(180px, 1fr))` }"
        >
          <span class="uploader-phone-platform-cell">
            <PlatformIcon :src="platform.iconUrl" :label="platform.label" :platform="platform.type" />
          </span>
          <span
            v-for="phone in phoneRows"
            :key="`${platform.type}-${phone.id}`"
            class="uploader-phone-select-cell"
            :class="{
              disabled: phoneCellDisabled(phone, platform.type),
              unavailable: phoneCellUnavailable(phone, platform.type),
              empty: !selectedPhoneAccount(phone, platform.type),
              actionable: !uploaderPhoneEditMode,
              busy: phoneCellAgentBusy(phone, platform.type),
            }"
            :role="uploaderPhoneEditMode ? undefined : 'button'"
            :tabindex="uploaderPhoneEditMode ? undefined : 0"
            @click="runPhoneCellAction(phone, platform.type)"
            @keyup.enter="runPhoneCellAction(phone, platform.type)"
            @keyup.space.prevent="runPhoneCellAction(phone, platform.type)"
          >
            <template v-if="uploaderPhoneEditMode">
              <div class="uploader-phone-edit-line">
                <input
                  type="text"
                  :class="{ 'disabled-note': phoneCellDisabled(phone, platform.type) }"
                  :value="phoneCellInputValue(phone, platform.type)"
                  :list="phoneCellListId(phone, platform.type)"
                  :disabled="phoneCellSaving(phone, platform.type)"
                  :aria-label="`${platform.label} ${phone.phone}`"
                  @change="savePhonePlatform(phone, platform.type, $event)"
                  @keyup.enter="savePhonePlatform(phone, platform.type, $event)"
                />
                <button
                  type="button"
                  class="uploader-phone-disable-button"
                  :class="{ active: phoneCellDisabled(phone, platform.type) }"
                  :disabled="phoneCellSaving(phone, platform.type)"
                  @click="togglePhoneDisabled(phone, platform.type)"
                >
                  {{ phoneCellDisabled(phone, platform.type) ? '启用' : '禁用' }}
                </button>
              </div>
              <datalist :id="phoneCellListId(phone, platform.type)">
                <option
                  v-for="account in phoneAccountOptions(platform.type)"
                  :key="account.id"
                  :value="accountOptionText(account)"
                >
                </option>
              </datalist>
              <div
                v-if="selectedPhoneAccount(phone, platform.type) && phoneSelectedAccountRow(phone, platform.type)"
                class="uploader-phone-profile-editor"
              >
                <label class="uploader-phone-profile-avatar">
                  <img
                    v-if="phoneAccountProfileAvatar(phone, platform.type)"
                    :src="phoneAccountProfileAvatar(phone, platform.type)"
                    :alt="phoneAccountProfileName(phone, platform.type) || selectedPhoneAccount(phone, platform.type).accountKey"
                    loading="lazy"
                    decoding="async"
                  />
                  <span v-else>{{ phoneAccountInitial(selectedPhoneAccount(phone, platform.type)) }}</span>
                  <input
                    type="file"
                    accept="image/*"
                    aria-label="上传账号头像"
                    :disabled="platformBusyKey(platform.type) === selectedPhoneAccount(phone, platform.type).accountKey"
                    @change="uploadPhoneAccountAvatar(phone, platform.type, $event)"
                  />
                </label>
                <input
                  type="text"
                  class="uploader-phone-profile-name"
                  :value="phoneAccountProfileName(phone, platform.type)"
                  placeholder="账号名"
                  :disabled="platformBusyKey(platform.type) === selectedPhoneAccount(phone, platform.type).accountKey"
                  @change="savePhoneAccountProfile(phone, platform.type, $event)"
                  @keyup.enter="savePhoneAccountProfile(phone, platform.type, $event)"
                />
              </div>
            </template>
            <template v-else>
              <span v-if="phoneCellAgentBusy(phone, platform.type)" class="uploader-phone-running">
                启动中
              </span>
              <span
                v-else-if="selectedPhoneAccount(phone, platform.type)"
                class="uploader-phone-account-card"
                :class="{ 'no-name': !phoneAccountName(selectedPhoneAccount(phone, platform.type)) }"
              >
                <span class="uploader-phone-account-avatar">
                  <img
                    v-if="phoneAccountAvatar(selectedPhoneAccount(phone, platform.type))"
                    :src="phoneAccountAvatar(selectedPhoneAccount(phone, platform.type))"
                    :alt="selectedPhoneAccount(phone, platform.type).displayName || selectedPhoneAccount(phone, platform.type).accountKey"
                    loading="lazy"
                    decoding="async"
                  />
                  <span v-else>{{ phoneAccountInitial(selectedPhoneAccount(phone, platform.type)) }}</span>
                </span>
                <span class="uploader-phone-account-text">
                  <strong v-if="phoneAccountName(selectedPhoneAccount(phone, platform.type))">
                    {{ phoneAccountName(selectedPhoneAccount(phone, platform.type)) }}
                  </strong>
                </span>
              </span>
              <span
                v-else-if="phoneNoteValue(phone, platform.type)"
                class="uploader-phone-note"
                :class="{ disabled: phoneCellDisabled(phone, platform.type) }"
              >
                {{ phoneNoteValue(phone, platform.type) }}
              </span>
              <span v-else class="uploader-phone-account-empty">新建账号</span>
            </template>
          </span>
        </div>
      </div>
      <div v-else class="empty-state">暂无手机号配置</div>
      <p v-if="uploaderPhoneError" class="inline-error">{{ uploaderPhoneError }}</p>
    </section>

    <section class="biliup-panel standalone-account-panel" aria-label="独立账号入口">
      <div class="uploader-phone-head">
        <strong>独立账号</strong>
        <span v-if="standaloneAccountLoading">加载中</span>
      </div>
      <div class="standalone-account-actions">
        <button
          v-for="account in standaloneAccounts"
          :key="account.platform"
          type="button"
          :disabled="Boolean(standaloneAccountBusyKey)"
          @click="runStandaloneAccount(account)"
        >
          <strong>{{ standaloneLabels[account.platform] || account.platform }}</strong>
          <span>{{ standaloneAccountBusyKey === account.platform ? '启动中' : (account.exists ? 'Open' : 'New') }}</span>
        </button>
      </div>
      <div v-if="!standaloneAccountLoading && !standaloneAccounts.length" class="empty-state">
        请先启动本地 agent
      </div>
    </section>

    <div v-if="diskStatusOpen" class="disk-status-modal-backdrop" @click.self="diskStatusOpen = false">
      <section class="disk-status-modal" role="dialog" aria-modal="true" aria-labelledby="disk-status-title">
        <header>
          <div>
            <strong id="disk-status-title">硬盘空间构成</strong>
            <span>{{ backupperDiskStatusText }}</span>
          </div>
          <button type="button" @click="diskStatusOpen = false">关闭</button>
        </header>
        <div class="disk-status-modal-body">
          <div class="disk-status-chart" :style="diskChartStyle" aria-hidden="true">
            <div>
              <strong>{{ backupperDiskStatus?.usedPercent || 0 }}%</strong>
              <span>已使用</span>
            </div>
          </div>
          <div class="disk-status-legend">
            <div v-for="item in diskUsageItems" :key="item.label" class="disk-status-legend-row">
              <span class="disk-status-color" :style="{ background: item.color }"></span>
              <span>{{ item.label }}</span>
              <strong>{{ formatStorageBytes(item.value) }}</strong>
              <small>{{ diskUsagePercent(item.value) }}</small>
            </div>
          </div>
        </div>
      </section>
    </div>
  </section>
</template>
