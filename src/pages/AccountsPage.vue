<script setup>
import { ref } from 'vue'
import { normalizeAccountAvatarUrl } from '../utils/accountAvatar'
import { formatDateTime, formatTime, isSameDate, pad2, parseLocalDateTime } from '../utils/format'

const props = defineProps({
  accountKeyGroups: { type: Array, default: () => [] },
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
const accountEditBusy = ref(false)
const accountAvatarCache = ref({})
const editingNameKeys = ref({})

function accountName(type, row) {
  return row?.draftDisplayName || props.accountDisplay(row, type)
}

function accountAvatar(type, row) {
  const url = normalizeAccountAvatarUrl(row?.draftAvatarUrl || props.accountAvatarUrl(row))
  cacheAccountAvatar(url)
  return accountAvatarCache.value[url] || url
}

function enterAccountEditMode() {
  forEachConfiguredAccount((item) => {
    item.row.draftDisplayName = props.accountDisplay(item.row, item.type)
    item.row.draftAvatarUrl = props.accountAvatarUrl(item.row)
    item.row.draftEnabled = item.row.enabled !== false
    item.row.draftKey = item.row.accountKey || ''
  })
  accountEditMode.value = true
}

function cancelAccountEditMode() {
  forEachConfiguredAccount((item) => {
    item.row.draftDisplayName = props.accountDisplay(item.row, item.type)
    item.row.draftAvatarUrl = props.accountAvatarUrl(item.row)
    item.row.draftEnabled = item.row.enabled !== false
    item.row.draftKey = item.row.accountKey || ''
  })
  editingNameKeys.value = {}
  props.closeUploadBackfill()
  accountEditMode.value = false
}

async function saveAccountEdits() {
  accountEditBusy.value = true
  try {
    for (const item of configuredAccounts()) {
      const row = item.row
      const nextDisplayName = String(row.draftDisplayName || '').trim()
      if (nextDisplayName !== props.accountDisplay(row, item.type)) {
        await props.savePlatformAccountProfile(item.type, row)
      }
      await props.savePlatformCooldown(item.type, row)
      if ((row.enabled !== false) !== (row.draftEnabled !== false)) {
        await props.togglePlatformEnabled(item.type, row)
      }
      const nextKey = String(row.draftKey || '').trim()
      if (nextKey && nextKey !== row.accountKey) {
        await props.savePlatformKey(item.type, row)
      }
    }
    editingNameKeys.value = {}
    props.closeUploadBackfill()
    accountEditMode.value = false
  } finally {
    accountEditBusy.value = false
  }
}

function configuredAccounts() {
  return props.accountKeyGroups.flatMap(group => group.rows.filter(item => item.configured))
}

function forEachConfiguredAccount(callback) {
  configuredAccounts().forEach(callback)
}

function visibleRows(group) {
  return group.rows.filter(item => accountEditMode.value || item.row.enabled !== false)
}

function isNameEditing(type, row) {
  return Boolean(editingNameKeys.value[`${type}:${row?.accountKey || ''}`])
}

function startNameEdit(type, row) {
  if (!accountEditMode.value) return
  editingNameKeys.value = { ...editingNameKeys.value, [`${type}:${row?.accountKey || ''}`]: true }
}

async function handleAvatarUpload(event, item) {
  const file = event.target.files?.[0]
  if (!file) return
  try {
    const profile = await props.uploadPlatformAccountAvatar(item.type, item.row, file)
    item.row.avatarUrl = profile?.avatarUrl || item.row.avatarUrl
    item.row.avatar_url = profile?.avatarUrl || item.row.avatar_url
    item.row.draftAvatarUrl = normalizeAccountAvatarUrl(profile?.avatarUrl || item.row.draftAvatarUrl)
    if (profile?.avatarUrl) {
      const avatarUrl = normalizeAccountAvatarUrl(profile.avatarUrl)
      delete accountAvatarCache.value[avatarUrl]
      cacheAccountAvatar(avatarUrl)
    }
  } finally {
    event.target.value = ''
  }
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
</script>

<template>
  <section class="account-page" aria-label="账号管理">
    <section class="biliup-panel account-overview" aria-label="账号管理总览">
      <div class="account-page-head">
        <div></div>
        <div class="account-edit-actions">
          <template v-if="accountEditMode">
            <button type="button" :disabled="accountEditBusy" @click="cancelAccountEditMode">取消</button>
            <button type="button" class="primary" :disabled="accountEditBusy" @click="saveAccountEdits">
              {{ accountEditBusy ? '保存中' : '保存' }}
            </button>
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
                  :class="['account-avatar-cell', { editable: accountEditMode }]"
                >
                  <img
                    v-if="accountAvatar(item.type, item.row)"
                    :src="accountAvatar(item.type, item.row)"
                    :alt="accountName(item.type, item.row)"
                    loading="lazy"
                    decoding="async"
                  />
                  <span v-else class="account-avatar-fallback">{{ accountAvatarInitial(item.row, item.type) }}</span>
                  <input
                    v-if="accountEditMode"
                    type="file"
                    accept="image/*"
                    aria-label="上传头像"
                    @change="handleAvatarUpload($event, item)"
                  />
                </label>
                <template v-else>-</template>
              </span>
              <span data-label="账号">
                <span v-if="item.configured" class="account-profile-text">
                  <template v-if="accountEditMode && isNameEditing(item.type, item.row)">
                      <input
                        v-model="item.row.draftDisplayName"
                        type="text"
                        aria-label="账号名"
                        placeholder="账号名"
                      />
                  </template>
                  <button
                    v-else-if="accountEditMode"
                    type="button"
                    class="account-name-button"
                    @click="startNameEdit(item.type, item.row)"
                  >
                    {{ accountName(item.type, item.row) }}
                  </button>
                  <strong v-else>{{ accountName(item.type, item.row) }}</strong>
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
                />
                <span>-</span>
                <input
                  v-model="item.row.draftCooldownMaxMinutes"
                  type="number"
                  min="0"
                  step="1"
                  aria-label="最大冷却分钟"
                />
              </span>
              <span v-if="item.configured && accountEditMode" data-label="启用">
                <label class="account-enabled-edit">
                  <input
                    v-model="item.row.draftEnabled"
                    type="checkbox"
                    :disabled="platformBusyKey(item.type) === item.row.accountKey"
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
  </section>
</template>
