<script setup>
import { ref } from 'vue'
import { formatDateTime, parseLocalDateTime } from '../utils/format'

const props = defineProps({
  accountKeyGroups: { type: Array, default: () => [] },
  bilibiliQrCode: { type: Object, default: null },
  bilibiliQrMessage: { type: String, default: '' },
  xiaohongshuQrCode: { type: Object, default: null },
  xiaohongshuQrMessage: { type: String, default: '' },
  togglePlatformEnabled: { type: Function, required: true },
  savePlatformCooldown: { type: Function, required: true },
  savePlatformKey: { type: Function, required: true },
  accountDisplay: { type: Function, required: true },
  accountAvatarUrl: { type: Function, required: true },
  accountAvatarInitial: { type: Function, required: true },
  accountCountText: { type: Function, required: true },
  nextSendText: { type: Function, required: true },
  platformBusyKey: { type: Function, required: true },
  qrImageUrl: { type: Function, required: true },
  platformErrorText: { type: Function, required: true },
})

const ACCOUNT_PROFILE_OVERRIDES_KEY = 'youbi-account-profile-overrides-v1'
const STALE_READY_MINUTES = 10

const accountEditMode = ref(false)
const accountEditBusy = ref(false)
const profileOverrides = ref(loadProfileOverrides())

function loadProfileOverrides() {
  if (typeof window === 'undefined') return {}
  try {
    return JSON.parse(window.localStorage.getItem(ACCOUNT_PROFILE_OVERRIDES_KEY) || '{}') || {}
  } catch {
    return {}
  }
}

function saveProfileOverrides() {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(ACCOUNT_PROFILE_OVERRIDES_KEY, JSON.stringify(profileOverrides.value))
}

function profileOverrideKey(type, row) {
  return `${type}:${row?.accountKey || row?.draftKey || ''}`
}

function profileOverride(type, row) {
  return profileOverrides.value[profileOverrideKey(type, row)] || {}
}

function accountName(type, row) {
  return row?.draftDisplayName || profileOverride(type, row).displayName || props.accountDisplay(row, type)
}

function accountAvatar(type, row) {
  return row?.draftAvatarDataUrl
    || profileOverride(type, row).avatarDataUrl
    || props.accountAvatarUrl(row)
}

function enterAccountEditMode() {
  forEachConfiguredAccount((item) => {
    const override = profileOverride(item.type, item.row)
    item.row.draftDisplayName = override.displayName || props.accountDisplay(item.row, item.type)
    item.row.draftAvatarDataUrl = override.avatarDataUrl || ''
    item.row.draftEnabled = item.row.enabled !== false
    item.row.draftKey = item.row.accountKey || ''
  })
  accountEditMode.value = true
}

function cancelAccountEditMode() {
  forEachConfiguredAccount((item) => {
    const override = profileOverride(item.type, item.row)
    item.row.draftDisplayName = override.displayName || props.accountDisplay(item.row, item.type)
    item.row.draftAvatarDataUrl = override.avatarDataUrl || ''
    item.row.draftEnabled = item.row.enabled !== false
    item.row.draftKey = item.row.accountKey || ''
  })
  accountEditMode.value = false
}

async function saveAccountEdits() {
  accountEditBusy.value = true
  try {
    for (const item of configuredAccounts()) {
      const row = item.row
      const overrideKey = profileOverrideKey(item.type, row)
      const nextDisplayName = String(row.draftDisplayName || '').trim()
      const nextAvatarDataUrl = row.draftAvatarDataUrl || ''
      const nextOverride = { ...profileOverrides.value[overrideKey] }
      if (nextDisplayName && nextDisplayName !== props.accountDisplay(row, item.type)) {
        nextOverride.displayName = nextDisplayName
      } else {
        delete nextOverride.displayName
      }
      if (nextAvatarDataUrl) {
        nextOverride.avatarDataUrl = nextAvatarDataUrl
      } else {
        delete nextOverride.avatarDataUrl
      }
      if (Object.keys(nextOverride).length) {
        profileOverrides.value[overrideKey] = nextOverride
      } else {
        delete profileOverrides.value[overrideKey]
      }

      const nextKey = String(row.draftKey || '').trim()
      if (nextKey && nextKey !== row.accountKey) {
        await props.savePlatformKey(item.type, row)
      }
      await props.savePlatformCooldown(item.type, row)
      if ((row.enabled !== false) !== (row.draftEnabled !== false)) {
        await props.togglePlatformEnabled(item.type, row)
      }
    }
    saveProfileOverrides()
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

function handleAvatarUpload(event, row) {
  const file = event.target.files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => {
    row.draftAvatarDataUrl = typeof reader.result === 'string' ? reader.result : ''
  }
  reader.readAsDataURL(file)
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

function accountAvailableText(row) {
  const available = accountAvailable(row)
  if (available === false) return '不可用'
  if (available === true) return '可用'
  for (const key of ['availableStatus', 'availabilityStatus', 'usableStatus']) {
    const value = String(row?.[key] || '').trim()
    if (value) return value
  }
  return '-'
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
          <div class="account-table">
            <div class="account-row account-header account-platform-row">
              <span>Type</span>
              <span>账号</span>
              <span>今日已发</span>
              <span>冷却等待</span>
              <span>上次上传</span>
              <span>随机冷却</span>
              <span>下次可发送</span>
              <span>可用</span>
              <span>启用</span>
            </div>
            <div
              v-for="item in group.rows"
              :key="`${group.key}-${item.type}`"
              class="account-row account-platform-row"
            >
              <span class="platform-mark">
                <img :src="item.iconUrl" :alt="item.label" loading="lazy" decoding="async" />
              </span>
              <span data-label="账号">
                <span v-if="item.configured" class="account-profile">
                  <img
                    v-if="accountAvatar(item.type, item.row)"
                    :src="accountAvatar(item.type, item.row)"
                    :alt="accountName(item.type, item.row)"
                    loading="lazy"
                    decoding="async"
                  />
                  <span v-else class="account-avatar-fallback">{{ accountAvatarInitial(item.row, item.type) }}</span>
                  <span class="account-profile-text">
                    <template v-if="accountEditMode">
                      <input
                        v-model="item.row.draftDisplayName"
                        type="text"
                        aria-label="账号名"
                        placeholder="账号名"
                      />
                      <label class="avatar-upload">
                        上传头像
                        <input
                          type="file"
                          accept="image/*"
                          aria-label="上传头像"
                          @change="handleAvatarUpload($event, item.row)"
                        />
                      </label>
                    </template>
                    <strong v-else>{{ accountName(item.type, item.row) }}</strong>
                    <small>{{ item.row.accountKey }}</small>
                  </span>
                </span>
                <template v-else>-</template>
              </span>
              <span data-label="今日已发">{{ item.configured ? accountCountText(item.row.todayUploadCount) : '-' }}</span>
              <span data-label="冷却等待">{{ item.configured ? accountCountText(item.row.cooldownWaitingCount) : '-' }}</span>
              <span data-label="上次上传">{{ item.configured ? formatDateTime(item.row.lastUploadAt) : '-' }}</span>
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
              <span v-else data-label="随机冷却">{{ item.configured ? `${item.row.draftCooldownMinMinutes}-${item.row.draftCooldownMaxMinutes} 分钟` : '-' }}</span>
              <span :class="{ 'next-send-stale': item.configured && nextSendStale(item.row) }" data-label="下次可发送">
                {{ item.configured ? nextSendDisplay(item.row) : '-' }}
              </span>
              <span
                :class="{ 'account-unavailable': item.configured && accountAvailable(item.row) === false }"
                data-label="可用"
              >
                {{ item.configured ? accountAvailableText(item.row) : '-' }}
              </span>
              <span data-label="启用">
                <label v-if="item.configured && accountEditMode" class="account-enabled-edit">
                  <input
                    v-model="item.row.draftEnabled"
                    type="checkbox"
                    :disabled="platformBusyKey(item.type) === item.row.accountKey"
                  />
                  {{ item.row.draftEnabled ? '启用' : '禁用' }}
                </label>
                <span
                  v-else-if="item.configured"
                  :class="['account-enabled-state', { disabled: item.row.enabled === false }]"
                >
                  {{ item.row.enabled === false ? '禁用' : '启用' }}
                </span>
                <template v-else>-</template>
              </span>
            </div>
          </div>
        </section>
      </div>
      <div v-else class="empty-state">暂无账号配置</div>

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
