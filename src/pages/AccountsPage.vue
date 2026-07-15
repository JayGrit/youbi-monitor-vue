<script setup>
import { computed, ref } from 'vue'
import AccountOverviewPanel from '../components/accounts/AccountOverviewPanel.vue'
import StandaloneAccountsPanel from '../components/accounts/StandaloneAccountsPanel.vue'
import UploaderPhoneMatrix from '../components/accounts/UploaderPhoneMatrix.vue'
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
  updateYoutubeDownloaderCookies: { type: Function, required: true },
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
const OVERVIEW_TOOL_ACCOUNT_TYPES = new Set(['chatgpt', 'doubao', 'notebooklm'])

const accountEditMode = ref(false)
const accountAvatarCache = ref({})
const uploaderPhoneEditMode = ref(false)

const standaloneLabels = {
  notebooklm: 'NotebookLM',
  chatgpt: 'ChatGPT',
}

const youtubeCookieUpdating = computed(() => props.uploaderPhoneAgentBusyKey === 'youtube:cookies:default')

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
  return group.rows.filter(item => {
    if (OVERVIEW_TOOL_ACCOUNT_TYPES.has(item.type)) return false
    return accountEditMode.value || item.row.enabled !== false
  })
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
    <AccountOverviewPanel
      :account-edit-mode="accountEditMode"
      :visible-account-groups="visibleAccountGroups"
      :upload-backfill-open="uploadBackfillOpen"
      :upload-backfill-context="uploadBackfillContext"
      :upload-backfill-rows="uploadBackfillRows"
      :upload-backfill-loading="uploadBackfillLoading"
      :upload-backfill-busy="uploadBackfillBusy"
      :upload-backfill-selected-ids="uploadBackfillSelectedIds"
      :upload-backfill-selected-set="uploadBackfillSelectedSet"
      :upload-backfill-all-selected="uploadBackfillAllSelected"
      :upload-backfill-error="uploadBackfillError"
      :bilibili-qr-code="bilibiliQrCode"
      :bilibili-qr-message="bilibiliQrMessage"
      :xiaohongshu-qr-code="xiaohongshuQrCode"
      :xiaohongshu-qr-message="xiaohongshuQrMessage"
      :enter-account-edit-mode="enterAccountEditMode"
      :cancel-account-edit-mode="cancelAccountEditMode"
      :account-row-unavailable="accountRowUnavailable"
      :account-row-saving="accountRowSaving"
      :account-avatar="accountAvatar"
      :account-name="accountName"
      :account-avatar-initial="accountAvatarInitial"
      :account-metric-text="accountMetricText"
      :staged-failed-count="stagedFailedCount"
      :failed-upload-count="failedUploadCount"
      :last-upload-text="lastUploadText"
      :next-send-ready="nextSendReady"
      :next-send-stale="nextSendStale"
      :next-send-running="nextSendRunning"
      :open-running-task="openRunningTask"
      :next-send-display="nextSendDisplay"
      :save-account-key-edit="saveAccountKeyEdit"
      :open-upload-backfill="openUploadBackfill"
      :save-account-cooldown-edit="saveAccountCooldownEdit"
      :save-account-quiet-time-edit="saveAccountQuietTimeEdit"
      :save-account-downloader-max-staged-count-edit="saveAccountDownloaderMaxStagedCountEdit"
      :save-account-enabled-edit="saveAccountEnabledEdit"
      :toggle-upload-backfill-all="toggleUploadBackfillAll"
      :load-upload-backfill-candidates="loadUploadBackfillCandidates"
      :close-upload-backfill="closeUploadBackfill"
      :register-selected-upload-backfill="registerSelectedUploadBackfill"
      :toggle-upload-backfill-row="toggleUploadBackfillRow"
      :format-date-time="formatDateTime"
      :qr-image-url="qrImageUrl"
      :platform-error-text="platformErrorText"
    />

    <UploaderPhoneMatrix
      :uploader-phone-edit-mode="uploaderPhoneEditMode"
      :uploader-phone-loading="uploaderPhoneLoading"
      :phone-rows="phoneRows"
      :visible-phone-platforms="visiblePhonePlatforms"
      :uploader-phone-error="uploaderPhoneError"
      :phone-cell-disabled="phoneCellDisabled"
      :phone-cell-unavailable="phoneCellUnavailable"
      :selected-phone-account="selectedPhoneAccount"
      :phone-cell-agent-busy="phoneCellAgentBusy"
      :run-phone-cell-action="runPhoneCellAction"
      :phone-cell-input-value="phoneCellInputValue"
      :phone-cell-list-id="phoneCellListId"
      :phone-cell-saving="phoneCellSaving"
      :save-phone-platform="savePhonePlatform"
      :toggle-phone-disabled="togglePhoneDisabled"
      :phone-account-options="phoneAccountOptions"
      :account-option-text="accountOptionText"
      :phone-selected-account-row="phoneSelectedAccountRow"
      :phone-account-profile-avatar="phoneAccountProfileAvatar"
      :phone-account-profile-name="phoneAccountProfileName"
      :phone-account-initial="phoneAccountInitial"
      :platform-busy-key="platformBusyKey"
      :upload-phone-account-avatar="uploadPhoneAccountAvatar"
      :save-phone-account-profile="savePhoneAccountProfile"
      :phone-account-name="phoneAccountName"
      :phone-account-avatar="phoneAccountAvatar"
      :phone-note-value="phoneNoteValue"
      @toggle-edit-mode="uploaderPhoneEditMode = !uploaderPhoneEditMode"
    />

    <StandaloneAccountsPanel
      :standalone-account-loading="standaloneAccountLoading"
      :youtube-cookie-updating="youtubeCookieUpdating"
      :update-youtube-downloader-cookies="updateYoutubeDownloaderCookies"
      :standalone-accounts="standaloneAccounts"
      :standalone-account-busy-key="standaloneAccountBusyKey"
      :run-standalone-account="runStandaloneAccount"
      :standalone-labels="standaloneLabels"
    />
  </section>
</template>
