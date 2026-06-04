<script setup>
import { computed, ref } from 'vue'
import { normalizeAccountAvatarUrl } from '../utils/accountAvatar'
import { formatDateTime, formatTime, isSameDate, pad2, parseLocalDateTime } from '../utils/format'

const props = defineProps({
  accountKeyGroups: { type: Array, default: () => [] },
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
  uploaderPhoneError: { type: String, default: '' },
  togglePlatformEnabled: { type: Function, required: true },
  savePlatformCooldown: { type: Function, required: true },
  savePlatformKey: { type: Function, required: true },
  savePlatformAccountProfile: { type: Function, required: true },
  uploadPlatformAccountAvatar: { type: Function, required: true },
  openUploadBackfill: { type: Function, required: true },
  closeUploadBackfill: { type: Function, required: true },
  loadUploadBackfillCandidates: { type: Function, required: true },
  toggleUploadBackfillRow: { type: Function, required: true },
  toggleUploadBackfillAll: { type: Function, required: true },
  registerSelectedUploadBackfill: { type: Function, required: true },
  saveUploaderPhoneAccount: { type: Function, required: true },
  accountDisplay: { type: Function, required: true },
  accountAvatarUrl: { type: Function, required: true },
  accountAvatarInitial: { type: Function, required: true },
  accountCountText: { type: Function, required: true },
  nextSendText: { type: Function, required: true },
  platformBusyKey: { type: Function, required: true },
  qrImageUrl: { type: Function, required: true },
  platformErrorText: { type: Function, required: true },
})

const STALE_READY_MINUTES = 10

const accountEditMode = ref(false)
const accountAvatarCache = ref({})
const uploaderPhoneEditMode = ref(false)

const phonePlatformAccounts = computed(() => {
  const groups = new Map()
  for (const row of props.uploaderPhoneMatrix?.platforms || []) {
    groups.set(row.platform, row.accounts || [])
  }
  return groups
})

const phoneRows = computed(() => props.uploaderPhoneMatrix?.phones || [])

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
  }
}

function cooldownDraftMinutes(seconds, fallback) {
  const value = Number(seconds)
  return Number.isFinite(value) ? String(Math.round(value / 60)) : String(fallback)
}

function resetAccountDraft(item) {
  const draft = accountDraft(item.row, item.type)
  item.row.draftEnabled = draft.enabled
  item.row.draftKey = draft.key
  item.row.draftCooldownMinMinutes = draft.cooldownMinMinutes
  item.row.draftCooldownMaxMinutes = draft.cooldownMaxMinutes
}

function accountChanges(item) {
  const row = item.row
  const draft = accountDraft(row, item.type)
  return {
    cooldown:
      String(row.draftCooldownMinMinutes ?? '').trim() !== draft.cooldownMinMinutes
      || String(row.draftCooldownMaxMinutes ?? '').trim() !== draft.cooldownMaxMinutes,
    enabled: (row.draftEnabled !== false) !== draft.enabled,
    key: Boolean(String(row.draftKey || '').trim()) && String(row.draftKey || '').trim() !== draft.key,
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

async function saveAccountEnabledEdit(item) {
  if (!item?.configured || !accountChanges(item).enabled) return
  await props.togglePlatformEnabled(item.type, item.row)
}

function forEachConfiguredAccount(callback) {
  configuredAccounts().forEach(callback)
}

function visibleRows(group) {
  return group.rows.filter(item => accountEditMode.value || item.row.enabled !== false)
}

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
  const text = props.nextSendText(row)
  if (text !== '可发送') return text
  const next = parseLocalDateTime(row?.nextUploadAllowedAt)
  if (!next) return text
  const waitingMs = Date.now() - next.getTime()
  if (waitingMs < STALE_READY_MINUTES * 60 * 1000) return text
  const minutes = Math.floor(waitingMs / 60000)
  if (minutes < 60) return `已等待 ${minutes} 分钟`
  const hours = Math.floor(minutes / 60)
  const restMinutes = minutes % 60
  return restMinutes ? `已等待 ${hours} 小时 ${restMinutes} 分钟` : `已等待 ${hours} 小时`
}

function nextSendStale(row) {
  return nextSendDisplay(row).startsWith('已等待')
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
          <template v-if="accountEditMode">
            <button type="button" @click="cancelAccountEditMode">完成</button>
          </template>
          <button v-else type="button" @click="enterAccountEditMode">编辑</button>
        </div>
      </div>
      <div v-if="accountKeyGroups.length" class="account-key-list" aria-label="按 key 分组账号表">
        <section v-for="group in accountKeyGroups" :key="group.key" class="account-key-group">
          <div class="account-key-title">
            <strong>{{ group.key }}</strong>
          </div>
          <div v-if="visibleRows(group).length" class="account-table" :class="{ editing: accountEditMode }">
            <div class="account-row account-header account-platform-row">
              <span>Platform</span>
              <span>头像</span>
              <span>账号</span>
              <span>今日已发</span>
              <span>冷却等待</span>
              <span>上次上传</span>
              <span>下次可发送</span>
              <span v-if="accountEditMode">Key</span>
              <span v-if="accountEditMode">操作</span>
              <span v-if="accountEditMode">随机冷却</span>
              <span v-if="accountEditMode">启用</span>
            </div>
            <div
              v-for="item in visibleRows(group)"
              :key="`${group.key}-${item.type}`"
              :class="['account-row account-platform-row', { unavailable: item.configured && accountAvailable(item.row) === false }]"
            >
              <span class="platform-mark">
                <img :src="item.iconUrl" :alt="item.label" loading="lazy" decoding="async" />
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
              <span data-label="今日已发">{{ item.configured ? accountCountText(item.row.todayUploadCount) : '-' }}</span>
              <span data-label="冷却等待">{{ item.configured ? accountCountText(item.row.cooldownWaitingCount) : '-' }}</span>
              <span class="last-upload-time" data-label="上次上传">{{ item.configured ? lastUploadText(item.row.lastUploadAt) : '-' }}</span>
              <span :class="{ 'next-send-stale': item.configured && nextSendStale(item.row) }" data-label="下次可发送">
                {{ item.configured ? nextSendDisplay(item.row) : '-' }}
              </span>
              <span v-if="item.configured && accountEditMode" data-label="Key">
                <input
                  v-model="item.row.draftKey"
                  type="text"
                  class="account-key-input"
                  aria-label="账号 key"
                  placeholder="账号 key"
                  :disabled="platformBusyKey(item.type) === item.row.accountKey"
                  @change="saveAccountKeyEdit(item)"
                />
              </span>
              <span v-if="accountEditMode" data-label="操作">
                <button
                  v-if="item.configured"
                  type="button"
                  class="account-backfill-button"
                  @click="openUploadBackfill(item.type, item.label, item.row.accountKey, group.key)"
                >
                  补发历史
                </button>
                <template v-else>-</template>
              </span>
              <span v-if="item.configured && accountEditMode" class="cooldown-editor" data-label="随机冷却">
                <input
                  v-model="item.row.draftCooldownMinMinutes"
                  type="number"
                  min="0"
                  step="1"
                  aria-label="最小冷却分钟"
                  :disabled="platformBusyKey(item.type) === item.row.accountKey"
                  @change="saveAccountCooldownEdit(item)"
                />
                <span>-</span>
                <input
                  v-model="item.row.draftCooldownMaxMinutes"
                  type="number"
                  min="0"
                  step="1"
                  aria-label="最大冷却分钟"
                  :disabled="platformBusyKey(item.type) === item.row.accountKey"
                  @change="saveAccountCooldownEdit(item)"
                />
              </span>
              <span v-if="item.configured && accountEditMode" data-label="启用">
                <label class="account-enabled-edit">
                  <input
                    v-model="item.row.draftEnabled"
                    type="checkbox"
                    :disabled="platformBusyKey(item.type) === item.row.accountKey"
                    @change="saveAccountEnabledEdit(item)"
                  />
                  {{ item.row.draftEnabled ? '启用' : '禁用' }}
                </label>
              </span>
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
      <div v-if="phoneRows.length" class="uploader-phone-table">
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
          v-for="platform in accountPlatforms"
          :key="platform.type"
          class="uploader-phone-row"
          :style="{ gridTemplateColumns: `72px repeat(${phoneRows.length}, minmax(180px, 1fr))` }"
        >
          <span class="uploader-phone-platform-cell">
            <img :src="platform.iconUrl" :alt="platform.label" loading="lazy" decoding="async" />
          </span>
          <span
            v-for="phone in phoneRows"
            :key="`${platform.type}-${phone.id}`"
            class="uploader-phone-select-cell"
            :class="{ disabled: phoneCellDisabled(phone, platform.type) }"
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
              <span
                v-if="selectedPhoneAccount(phone, platform.type)"
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
            </template>
          </span>
        </div>
      </div>
      <div v-else class="empty-state">暂无手机号配置</div>
      <p v-if="uploaderPhoneError" class="inline-error">{{ uploaderPhoneError }}</p>
    </section>
  </section>
</template>
