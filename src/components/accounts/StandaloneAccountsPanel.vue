<script setup>
defineProps([
  'standaloneAccountLoading',
  'youtubeCookieUpdating',
  'updateYoutubeDownloaderCookies',
  'standaloneAccounts',
  'standaloneAccountBusyKey',
  'runStandaloneAccount',
  'standaloneLabels',
])
</script>

<template>
    <section class="biliup-panel standalone-account-panel" aria-label="独立账号入口">
      <div class="uploader-phone-head">
        <strong>独立账号</strong>
        <div class="standalone-account-head-actions">
          <span v-if="standaloneAccountLoading">加载中</span>
          <button
            type="button"
            :disabled="youtubeCookieUpdating"
            @click="updateYoutubeDownloaderCookies"
          >
            {{ youtubeCookieUpdating ? '更新中' : '更新 YouTube Cookie' }}
          </button>
        </div>
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
  </template>
