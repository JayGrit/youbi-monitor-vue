<script setup>
import AccountOverviewTable from './AccountOverviewTable.vue'
import AccountQrPanel from './AccountQrPanel.vue'
import UploadBackfillPanel from './UploadBackfillPanel.vue'

defineProps([
  'accountEditMode',
  'visibleAccountGroups',
  'uploadBackfillOpen',
  'uploadBackfillContext',
  'uploadBackfillRows',
  'uploadBackfillLoading',
  'uploadBackfillBusy',
  'uploadBackfillSelectedIds',
  'uploadBackfillSelectedSet',
  'uploadBackfillAllSelected',
  'uploadBackfillError',
  'bilibiliQrCode',
  'bilibiliQrMessage',
  'xiaohongshuQrCode',
  'xiaohongshuQrMessage',
  'enterAccountEditMode',
  'cancelAccountEditMode',
  'accountRowUnavailable',
  'accountRowSaving',
  'accountAvatar',
  'accountName',
  'accountAvatarInitial',
  'accountMetricText',
  'stagedFailedCount',
  'failedUploadCount',
  'lastUploadText',
  'nextSendReady',
  'nextSendStale',
  'nextSendRunning',
  'openRunningTask',
  'nextSendDisplay',
  'saveTopicEdit',
  'openUploadBackfill',
  'saveAccountCooldownEdit',
  'saveAccountQuietTimeEdit',
  'saveAccountDownloaderMaxStagedCountEdit',
  'saveAccountEnabledEdit',
  'toggleUploadBackfillAll',
  'loadUploadBackfillCandidates',
  'closeUploadBackfill',
  'registerSelectedUploadBackfill',
  'toggleUploadBackfillRow',
  'formatDateTime',
  'qrImageUrl',
  'platformErrorText',
])
</script>

<template>
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
      <AccountOverviewTable
        :account-edit-mode="accountEditMode"
        :visible-account-groups="visibleAccountGroups"
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
        :save-topic-edit="saveTopicEdit"
        :open-upload-backfill="openUploadBackfill"
        :save-account-cooldown-edit="saveAccountCooldownEdit"
        :save-account-quiet-time-edit="saveAccountQuietTimeEdit"
        :save-account-downloader-max-staged-count-edit="saveAccountDownloaderMaxStagedCountEdit"
        :save-account-enabled-edit="saveAccountEnabledEdit"
      />

      <UploadBackfillPanel
        :account-edit-mode="accountEditMode"
        :upload-backfill-open="uploadBackfillOpen"
        :upload-backfill-context="uploadBackfillContext"
        :upload-backfill-rows="uploadBackfillRows"
        :upload-backfill-loading="uploadBackfillLoading"
        :upload-backfill-busy="uploadBackfillBusy"
        :upload-backfill-selected-ids="uploadBackfillSelectedIds"
        :upload-backfill-selected-set="uploadBackfillSelectedSet"
        :upload-backfill-all-selected="uploadBackfillAllSelected"
        :upload-backfill-error="uploadBackfillError"
        :toggle-upload-backfill-all="toggleUploadBackfillAll"
        :load-upload-backfill-candidates="loadUploadBackfillCandidates"
        :close-upload-backfill="closeUploadBackfill"
        :register-selected-upload-backfill="registerSelectedUploadBackfill"
        :toggle-upload-backfill-row="toggleUploadBackfillRow"
        :format-date-time="formatDateTime"
      />

      <AccountQrPanel
        :bilibili-qr-code="bilibiliQrCode"
        :bilibili-qr-message="bilibiliQrMessage"
        :xiaohongshu-qr-code="xiaohongshuQrCode"
        :xiaohongshu-qr-message="xiaohongshuQrMessage"
        :qr-image-url="qrImageUrl"
      />

      <p v-if="platformErrorText()" class="inline-error">{{ platformErrorText() }}</p>
    </section>

  </template>
