<script setup>
import { computed } from 'vue'

const props = defineProps([
  'standaloneAccountLoading',
  'youtubeCookieUpdating',
  'updateYoutubeDownloaderCookies',
  'standaloneAccounts',
  'standaloneAccountBusyKey',
  'runStandaloneAccount',
  'standaloneLabels',
])

const platforms = ['douyin', 'notebooklm', 'youtube', 'chatgpt', 'x']
const groups = computed(() => platforms.map(platform => ({
  platform,
  accounts: (props.standaloneAccounts || []).filter(account => account.platform === platform),
})).filter(group => group.accounts.length))

function accountDetail(account) {
  if (!account.exists) return `新增到 Profile ${account.profileKey || '数据库'}`
  const location = account.profileKey ? `Profile ${account.profileKey}` : '数据库登录态'
  const status = !account.enabled ? '已禁用' : account.available ? '可用' : '不可用'
  return `${account.topic} · ${location} · ${status}`
}
</script>

<template>
  <section class="biliup-panel standalone-account-panel" aria-label="独立账号入口">
    <div class="uploader-phone-head">
      <strong>独立账号</strong>
      <div class="standalone-account-head-actions">
        <span v-if="standaloneAccountLoading">加载中</span>
        <button type="button" :disabled="youtubeCookieUpdating" @click="updateYoutubeDownloaderCookies">
          {{ youtubeCookieUpdating ? '更新中' : '更新 YouTube Cookie' }}
        </button>
      </div>
    </div>
    <div v-for="group in groups" :key="group.platform" class="standalone-account-group">
      <strong>{{ standaloneLabels[group.platform] || group.platform }}</strong>
      <div class="standalone-account-actions">
        <button
          v-for="account in group.accounts"
          :key="`${group.platform}:${account.topic || 'new'}:${account.profileKey || 'db'}`"
          type="button"
          :disabled="Boolean(standaloneAccountBusyKey) || (account.exists && !account.enabled)"
          @click="runStandaloneAccount(account)"
        >
          <span class="standalone-account-detail">{{ accountDetail(account) }}</span>
          <span>{{ standaloneAccountBusyKey === group.platform ? '启动中' : account.exists ? '打开' : '新增' }}</span>
        </button>
      </div>
    </div>
    <div v-if="!standaloneAccountLoading && !standaloneAccounts.length" class="empty-state">请先启动本地 agent</div>
  </section>
</template>
