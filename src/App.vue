<script setup>
import { createAccountsApi } from './api/accounts'
import { createMonitorApi } from './api/monitor'
import { createSubmitterApi } from './api/submitter'
import {
  createAccountPlatforms,
  createPlatformIconUrls,
  taskStatusFilters,
} from './domain/constants'
import PageTabs from './components/PageTabs.vue'
import { useAccounts } from './composables/useAccounts'
import { useAppShell } from './composables/useAppShell'
import { useImageCache } from './composables/useImageCache'
import { useSubmitter } from './composables/useSubmitter'
import { useTaskFlow } from './composables/useTaskFlow'
import { useTasks } from './composables/useTasks'
import AccountsPage from './pages/AccountsPage.vue'
import MonitorPage from './pages/MonitorPage.vue'
import SubmitterPage from './pages/SubmitterPage.vue'
import TaskFlowPage from './pages/TaskFlowPage.vue'

const apiBase = `${import.meta.env.BASE_URL}api`
const submitterApiBase = `${import.meta.env.BASE_URL}submitter-api`
const monitorApi = createMonitorApi(apiBase)
const accountsApi = createAccountsApi(apiBase)
const submitterApi = createSubmitterApi(submitterApiBase, apiBase)
const PLATFORM_ICON_URLS = createPlatformIconUrls(import.meta.env.BASE_URL)
const ACCOUNT_PLATFORMS = createAccountPlatforms(PLATFORM_ICON_URLS)
const { brokenImageUrls, cacheImageUrl, revokeCachedUrls } = useImageCache()

const {
  tasks,
  serviceHeartbeats,
  loading,
  error,
  taskStatusFilter,
  taskTypeFilter,
  taskStageFilter,
  taskPage,
  taskActionsExpanded,
  openFailureKey,
  uploadRetryPlatform,
  uploadRetryRows,
  uploadRetryLoading,
  uploadRetryBusy,
  uploadRetrySelectedIds,
  taskFilterCounts,
  taskTypeFilters,
  taskStageFilters,
  filteredTasks,
  pagedTasks,
  taskPageCount,
  uploadRetryPlatformOptions,
  uploadRetrySelectedSet,
  uploadRetryAllSelected,
  loadTasks,
  markTaskReady,
  isTaskReadyBusy,
  setUploadRetryPlatform,
  loadUploadRetryRows,
  toggleUploadRetryRow,
  toggleUploadRetryAll,
  retrySelectedUploadSubmissions,
  stopTask,
  isTaskStopBusy,
  restartTask,
  isTaskRestartBusy,
  deleteTask,
  isTaskDeleteBusy,
  stageName,
  failureDetails,
  failureKey,
  displayTitle,
  taskSourceUrl,
  taskThumbnailUrl,
  taskCachedThumbnailUrl,
  markImageBroken,
  sourceDurationSeconds,
  taskTypeText,
  setTaskTypeFilter,
  setTaskStatusFilter,
  setTaskStageFilter,
  setTaskPage,
  copyTaskId,
  onlineDeviceText,
  serviceOnline,
  onlineDeviceTitle,
  toggleTaskActions,
  taskActionsOpen,
  nodeTitle,
  nodeProgress,
} = useTasks(monitorApi, cacheImageUrl, brokenImageUrls)

const {
  bilibiliQrCode,
  bilibiliQrMessage,
  xiaohongshuQrCode,
  xiaohongshuQrMessage,
  accountKeyGroups,
  uploadBackfillOpen,
  uploadBackfillContext,
  uploadBackfillRows,
  uploadBackfillLoading,
  uploadBackfillBusy,
  uploadBackfillSelectedIds,
  uploadBackfillSelectedSet,
  uploadBackfillAllSelected,
  uploadBackfillError,
  uploaderPhoneMatrix,
  uploaderPhoneLoading,
  uploaderPhoneSavingKey,
  uploaderPhoneError,
  startAccountPolling,
  clearAccountPagePolling,
  clearAccountPolling,
  togglePlatformEnabled,
  savePlatformCooldown,
  savePlatformKey,
  savePlatformAccountProfile,
  uploadPlatformAccountAvatar,
  openUploadBackfill,
  closeUploadBackfill,
  loadUploadBackfillCandidates,
  toggleUploadBackfillRow,
  toggleUploadBackfillAll,
  registerSelectedUploadBackfill,
  saveUploaderPhoneAccount,
  accountDisplay,
  accountAvatarUrl,
  accountAvatarInitial,
  accountCountText,
  nextSendText,
  platformBusyKey,
  platformErrorText,
  warmPlatformIcons,
  qrImageUrl,
} = useAccounts(accountsApi, ACCOUNT_PLATFORMS, PLATFORM_ICON_URLS)

const {
  selectedTaskFlow,
  selectedStageKey,
  flowPageOpen,
  flowLoading,
  flowError,
  speechEditDraft,
  speechEditSaving,
  speechEditError,
  uploaderDiagnostics,
  uploaderDiagnosticsLoading,
  uploaderDiagnosticsError,
  whisperWordTimestamps,
  whisperProcessing,
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
  speechTables,
  speechMoreRows,
  canEditSpeechDstText,
  isEditingSpeechDstText,
  beginSpeechEdit,
  cancelSpeechEdit,
  saveSpeechDstText,
  speechAudioAsset,
  stageMedia,
  demucsAudioMedia,
  fieldRows,
} = useTaskFlow(monitorApi, brokenImageUrls)

const {
  submitterVideos,
  submitterLoading,
  submitterError,
  submitterMessage,
  submitterUrl,
  submitterAuthor,
  submitterPlatform,
  submitterBusy,
  submitterAuthorBusy,
  submitterTypeFilter,
  submitterUploader,
  submitterDurationFilter,
  submitterUploadFilter,
  submitterSort,
  submitterAuthors,
  submitterFocusedBatch,
  submitterJsonTitle,
  submitterJsonPayload,
  submitterThumbUrls,
  submitterSubmittingId,
  submitterRejectingId,
  submitterPage,
  submitterAuthorTypeOpen,
  submitterAuthorTypeRows,
  submitterAuthorTypeSaving,
  submitterAuthorDeleting,
  submitterAuthorTypeError,
  submitterFilteredVideos,
  submitterFilteredTotal,
  submitterPageCount,
  submitterStatusCounts,
  submitterAuthorTypeFilters,
  submitterAuthorOptions,
  loadSubmitterVideos,
  applySubmitterFilters,
  loadSubmitterAuthors,
  resetSubmitterFilters,
  clearSubmitterBatchFocus,
  submitVideoToYoubi,
  rejectSubmitterVideo,
  submitterSubmissionStatus,
  openSubmitterAuthorTypes,
  autosaveSubmitterAuthorType,
  deleteSubmitterAuthor,
  closeSubmitterAuthorTypes,
  setSubmitterPage,
  createSubmitterVideo,
  importSubmitterAuthor,
  clearSubmitterPolling,
  submitterFieldValue,
  submitterVideoHref,
  submitterVideoTitle,
  submitterVideoThumb,
  submitterCachedThumb,
  closeSubmitterJson,
} = useSubmitter(submitterApi, cacheImageUrl)

const { activePage, openPage } = useAppShell({
  flowPageOpen,
  closeTaskFlow,
  clearAccountPagePolling,
  loadSubmitterAuthors,
  loadSubmitterVideos,
  warmPlatformIcons,
  startAccountPolling,
  loadTasks,
  clearAccountPolling,
  clearFlowPolling,
  clearSubmitterPolling,
  submitterThumbUrls,
  revokeCachedUrls,
})

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
      :task-stage-filter="taskStageFilter"
      :task-stage-filters="taskStageFilters"
      :task-page="taskPage"
      :task-page-count="taskPageCount"
      :task-actions-expanded="taskActionsExpanded"
      :filtered-tasks="filteredTasks"
      :paged-tasks="pagedTasks"
      :open-failure-key="openFailureKey"
      :upload-retry-platform="uploadRetryPlatform"
      :upload-retry-platform-options="uploadRetryPlatformOptions"
      :upload-retry-rows="uploadRetryRows"
      :upload-retry-loading="uploadRetryLoading"
      :upload-retry-busy="uploadRetryBusy"
      :upload-retry-selected-ids="uploadRetrySelectedIds"
      :upload-retry-selected-set="uploadRetrySelectedSet"
      :upload-retry-all-selected="uploadRetryAllSelected"
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
      :set-upload-retry-platform="setUploadRetryPlatform"
      :load-upload-retry-rows="loadUploadRetryRows"
      :toggle-upload-retry-row="toggleUploadRetryRow"
      :toggle-upload-retry-all="toggleUploadRetryAll"
      :retry-selected-upload-submissions="retrySelectedUploadSubmissions"
      :is-task-stop-busy="isTaskStopBusy"
      :stop-task="stopTask"
      :is-task-restart-busy="isTaskRestartBusy"
      :restart-task="restartTask"
      :is-task-delete-busy="isTaskDeleteBusy"
      :delete-task="deleteTask"
      :failure-key="failureKey"
      :failure-details="failureDetails"
      @update:task-status-filter="setTaskStatusFilter"
      @update:task-type-filter="setTaskTypeFilter"
      @update:task-stage-filter="setTaskStageFilter"
      @set-task-page="setTaskPage"
      @clear-failure="openFailureKey = ''"
    />

    <SubmitterPage
      v-else-if="activePage === 'submitter'"
      v-model:submitter-url="submitterUrl"
      v-model:submitter-author="submitterAuthor"
      v-model:submitter-platform="submitterPlatform"
      v-model:submitter-type-filter="submitterTypeFilter"
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
      :submitter-author-type-filters="submitterAuthorTypeFilters"
      :submitter-author-options="submitterAuthorOptions"
      :submitter-filtered-videos="submitterFilteredVideos"
      :submitter-filtered-total="submitterFilteredTotal"
      :submitter-page="submitterPage"
      :submitter-page-count="submitterPageCount"
      :submitter-submitting-id="submitterSubmittingId"
      :submitter-rejecting-id="submitterRejectingId"
      :submitter-json-payload="submitterJsonPayload"
      :submitter-json-title="submitterJsonTitle"
      :submitter-author-type-open="submitterAuthorTypeOpen"
      :submitter-author-type-error="submitterAuthorTypeError"
      :submitter-author-type-rows="submitterAuthorTypeRows"
      :submitter-author-type-saving="submitterAuthorTypeSaving"
      :submitter-author-deleting="submitterAuthorDeleting"
      :create-submitter-video="createSubmitterVideo"
      :import-submitter-author="importSubmitterAuthor"
      :apply-submitter-filters="applySubmitterFilters"
      :open-submitter-author-types="openSubmitterAuthorTypes"
      :reset-submitter-filters="resetSubmitterFilters"
      :clear-submitter-batch-focus="clearSubmitterBatchFocus"
      :submitter-video-thumb="submitterVideoThumb"
      :submitter-cached-thumb="submitterCachedThumb"
      :submitter-video-href="submitterVideoHref"
      :submitter-video-title="submitterVideoTitle"
      :submitter-field-value="submitterFieldValue"
      :submit-video-to-youbi="submitVideoToYoubi"
      :reject-submitter-video="rejectSubmitterVideo"
      :submitter-submission-status="submitterSubmissionStatus"
      :set-submitter-page="setSubmitterPage"
      :close-submitter-json="closeSubmitterJson"
      :close-submitter-author-types="closeSubmitterAuthorTypes"
      :autosave-submitter-author-type="autosaveSubmitterAuthorType"
      :delete-submitter-author="deleteSubmitterAuthor"
    />

    <AccountsPage
      v-else-if="activePage === 'accounts'"
      :account-key-groups="accountKeyGroups"
      :account-platforms="ACCOUNT_PLATFORMS"
      :bilibili-qr-code="bilibiliQrCode"
      :bilibili-qr-message="bilibiliQrMessage"
      :xiaohongshu-qr-code="xiaohongshuQrCode"
      :xiaohongshu-qr-message="xiaohongshuQrMessage"
      :upload-backfill-open="uploadBackfillOpen"
      :upload-backfill-context="uploadBackfillContext"
      :upload-backfill-rows="uploadBackfillRows"
      :upload-backfill-loading="uploadBackfillLoading"
      :upload-backfill-busy="uploadBackfillBusy"
      :upload-backfill-selected-ids="uploadBackfillSelectedIds"
      :upload-backfill-selected-set="uploadBackfillSelectedSet"
      :upload-backfill-all-selected="uploadBackfillAllSelected"
      :upload-backfill-error="uploadBackfillError"
      :uploader-phone-matrix="uploaderPhoneMatrix"
      :uploader-phone-loading="uploaderPhoneLoading"
      :uploader-phone-saving-key="uploaderPhoneSavingKey"
      :uploader-phone-error="uploaderPhoneError"
      :toggle-platform-enabled="togglePlatformEnabled"
      :save-platform-cooldown="savePlatformCooldown"
      :save-platform-key="savePlatformKey"
      :save-platform-account-profile="savePlatformAccountProfile"
      :upload-platform-account-avatar="uploadPlatformAccountAvatar"
      :open-upload-backfill="openUploadBackfill"
      :close-upload-backfill="closeUploadBackfill"
      :load-upload-backfill-candidates="loadUploadBackfillCandidates"
      :toggle-upload-backfill-row="toggleUploadBackfillRow"
      :toggle-upload-backfill-all="toggleUploadBackfillAll"
      :register-selected-upload-backfill="registerSelectedUploadBackfill"
      :save-uploader-phone-account="saveUploaderPhoneAccount"
      :account-display="accountDisplay"
      :account-avatar-url="accountAvatarUrl"
      :account-avatar-initial="accountAvatarInitial"
      :account-count-text="accountCountText"
      :next-send-text="nextSendText"
      :platform-busy-key="platformBusyKey"
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
      :uploader-diagnostics="uploaderDiagnostics"
      :uploader-diagnostics-loading="uploaderDiagnosticsLoading"
      :uploader-diagnostics-error="uploaderDiagnosticsError"
      :whisper-word-timestamps="whisperWordTimestamps"
      :whisper-processing="whisperProcessing"
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
      :speech-tables="speechTables"
      :show-speech-column="showSpeechColumn"
      :speech-audio-asset="speechAudioAsset"
      :log-audio-event="logAudioEvent"
      :demucs-audio-media="demucsAudioMedia"
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
