<script setup>
import { createAccountsApi } from './api/accounts'
import { createAgentApi } from './api/agent'
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
import { useFailureLogs } from './composables/useFailureLogs'
import { useImageCache } from './composables/useImageCache'
import { useSubmitter } from './composables/useSubmitter'
import { useTaskFlow } from './composables/useTaskFlow'
import { useTasks } from './composables/useTasks'
import AccountsPage from './pages/AccountsPage.vue'
import FailureLogsPage from './pages/FailureLogsPage.vue'
import MonitorPage from './pages/MonitorPage.vue'
import SubmitterAuthorsPage from './pages/SubmitterAuthorsPage.vue'
import SubmitterPage from './pages/SubmitterPage.vue'
import TaskFlowPage from './pages/TaskFlowPage.vue'

const apiBase = `${import.meta.env.BASE_URL}api`
const submitterApiBase = `${import.meta.env.BASE_URL}submitter-api`
const monitorApi = createMonitorApi(apiBase)
const accountsApi = createAccountsApi(apiBase)
const agentApi = createAgentApi()
const submitterApi = createSubmitterApi(submitterApiBase, apiBase)
const PLATFORM_ICON_URLS = createPlatformIconUrls(import.meta.env.BASE_URL)
const ACCOUNT_PLATFORMS = createAccountPlatforms(PLATFORM_ICON_URLS)
const { brokenImageUrls, cacheImageUrl, revokeCachedUrls } = useImageCache()

const {
  rows: failureLogRows,
  loading: failureLogLoading,
  error: failureLogError,
  actionError: failureLogActionError,
  actionBusy: failureLogActionBusy,
  loadedAt: failureLogLoadedAt,
  stageFilter: failureLogStageFilter,
  typeFilter: failureLogTypeFilter,
  timeFilter: failureLogTimeFilter,
  platformFilter: failureLogPlatformFilter,
  stageOptions: failureLogStageOptions,
  typeOptions: failureLogTypeOptions,
  platformOptions: failureLogPlatformOptions,
  filteredRows: filteredFailureLogRows,
  selectedIds: failureLogSelectedIds,
  selectedSet: failureLogSelectedSet,
  allSelected: failureLogAllSelected,
  actualPublishedSelectedRows: failureLogActualPublishedSelectedRows,
  retryUploadSelectedRows: failureLogRetryUploadSelectedRows,
  loadFailureLogs,
  markSelectedActualPublished: markSelectedFailureLogActualPublished,
  retrySelectedUploads: retrySelectedFailureLogUploads,
  toggleRow: toggleFailureLogRow,
  toggleAll: toggleFailureLogAll,
  clearSelection: clearFailureLogSelection,
  resetFilters: resetFailureLogFilters,
} = useFailureLogs(monitorApi)

const {
  tasks,
  serviceHeartbeats,
  loading,
  error,
  taskStatusFilter,
  taskTypeFilter,
  taskStageFilter,
  taskIdFilter,
  taskSort,
  taskPage,
  taskTotalCount,
  taskActionsExpanded,
  openFailureKey,
  uploadRetryPlatform,
  uploadRetryRows,
  uploadRetryLoading,
  uploadRetryBusy,
  uploadRetrySelectedIds,
  downloaderFailuresOpen,
  downloaderFailureRows,
  downloaderFailureLoading,
  downloaderFailureBusy,
  downloaderFailureSelectedIds,
  downloaderFailureTypeFilter,
  taskTypeFilters,
  taskStageFilters,
  filteredTasks,
  hasTaskFilter,
  pagedTasks,
  taskPageCount,
  uploadRetryPlatformOptions,
  uploadRetrySelectedSet,
  uploadRetryAllSelected,
  downloaderFailureSelectedSet,
  downloaderFailureAllSelected,
  downloaderFailureTypeOptions,
  downloaderFailureTypeSelected,
  loadTasks,
  loadTaskTypes,
  markTaskReady,
  isTaskReadyBusy,
  setUploadRetryPlatform,
  loadUploadRetryRows,
  toggleUploadRetryRow,
  toggleUploadRetryAll,
  retrySelectedUploadSubmissions,
  toggleDownloaderFailures,
  loadDownloaderFailures,
  toggleDownloaderFailureRow,
  toggleDownloaderFailureAll,
  setDownloaderFailureTypeFilter,
  toggleDownloaderFailureType,
  rollbackSelectedDownloaderFailures,
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
  minioStorageText,
  setTaskTypeFilter,
  setTaskStatusFilter,
  setTaskStageFilter,
  setTaskIdFilter,
  applyTaskIdFilter,
  setTaskSort,
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
  backupperDiskStatus,
  backupperDiskStatusText,
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
  uploaderPhoneAgentBusyKey,
  uploaderPhoneError,
  standaloneAccounts,
  standaloneAccountLoading,
  standaloneAccountBusyKey,
  startAccountPolling,
  clearAccountPagePolling,
  clearAccountPolling,
  togglePlatformEnabled,
  savePlatformCooldown,
  savePlatformQuietTime,
  savePlatformDownloaderMaxStagedCount,
  savePlatformNextUploadAllowedAt,
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
  runUploaderPhoneAccountScript,
  runStandaloneAccount,
  accountDisplay,
  accountAvatarUrl,
  accountAvatarInitial,
  accountCountText,
  nextSendText,
  platformBusyKey,
  platformBusyAction,
  platformErrorText,
  warmPlatformIcons,
  qrImageUrl,
} = useAccounts(accountsApi, agentApi, ACCOUNT_PLATFORMS, PLATFORM_ICON_URLS)

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
  loadSelectedUploaderDiagnostics,
  flowTaskTitle,
  flowSourceUrl,
  flowCoverUrl,
  flowDurationSeconds,
  tableCellText,
  tableCellSummary,
  speechRows,
  uploadSubmissionRows,
  publisherResultRows,
  stageTableRows,
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
  demucsAudioMedia,
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
  submitterVideoName,
  submitterDurationFilter,
  submitterPublishedFilter,
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
  withdrawSubmitterVideo,
  submitterSubmissionStatus,
  autosaveSubmitterAuthorType,
  deleteSubmitterAuthor,
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
  loadTaskTypes,
  loadFailureLogs,
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
      :task-type-filter="taskTypeFilter"
      :task-type-filters="taskTypeFilters"
      :task-stage-filter="taskStageFilter"
      :task-stage-filters="taskStageFilters"
      :task-id-filter="taskIdFilter"
      :task-sort="taskSort"
      :task-page="taskPage"
      :task-total-count="taskTotalCount"
      :task-page-count="taskPageCount"
      :task-actions-expanded="taskActionsExpanded"
      :filtered-tasks="filteredTasks"
      :has-task-filter="hasTaskFilter"
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
      :downloader-failures-open="downloaderFailuresOpen"
      :downloader-failure-rows="downloaderFailureRows"
      :downloader-failure-loading="downloaderFailureLoading"
      :downloader-failure-busy="downloaderFailureBusy"
      :downloader-failure-selected-ids="downloaderFailureSelectedIds"
      :downloader-failure-selected-set="downloaderFailureSelectedSet"
      :downloader-failure-all-selected="downloaderFailureAllSelected"
      :downloader-failure-type-filter="downloaderFailureTypeFilter"
      :downloader-failure-type-options="downloaderFailureTypeOptions"
      :downloader-failure-type-selected="downloaderFailureTypeSelected"
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
      :minio-storage-text="minioStorageText"
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
      :toggle-downloader-failures="toggleDownloaderFailures"
      :load-downloader-failures="loadDownloaderFailures"
      :toggle-downloader-failure-row="toggleDownloaderFailureRow"
      :toggle-downloader-failure-all="toggleDownloaderFailureAll"
      :set-downloader-failure-type-filter="setDownloaderFailureTypeFilter"
      :toggle-downloader-failure-type="toggleDownloaderFailureType"
      :rollback-selected-downloader-failures="rollbackSelectedDownloaderFailures"
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
      @update:task-id-filter="setTaskIdFilter"
      @update:task-sort="setTaskSort"
      @apply-task-id-filter="applyTaskIdFilter"
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
      v-model:submitter-video-name="submitterVideoName"
      v-model:submitter-duration-filter="submitterDurationFilter"
      v-model:submitter-published-filter="submitterPublishedFilter"
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
      :create-submitter-video="createSubmitterVideo"
      :import-submitter-author="importSubmitterAuthor"
      :apply-submitter-filters="applySubmitterFilters"
      :reset-submitter-filters="resetSubmitterFilters"
      :clear-submitter-batch-focus="clearSubmitterBatchFocus"
      :submitter-video-thumb="submitterVideoThumb"
      :submitter-cached-thumb="submitterCachedThumb"
      :submitter-video-href="submitterVideoHref"
      :submitter-video-title="submitterVideoTitle"
      :submitter-field-value="submitterFieldValue"
      :submit-video-to-youbi="submitVideoToYoubi"
      :reject-submitter-video="rejectSubmitterVideo"
      :withdraw-submitter-video="withdrawSubmitterVideo"
      :submitter-submission-status="submitterSubmissionStatus"
      :set-submitter-page="setSubmitterPage"
      :close-submitter-json="closeSubmitterJson"
    />

    <SubmitterAuthorsPage
      v-else-if="activePage === 'submitter-authors'"
      :submitter-author-type-error="submitterAuthorTypeError"
      :submitter-author-type-rows="submitterAuthorTypeRows"
      :submitter-author-type-saving="submitterAuthorTypeSaving"
      :submitter-author-deleting="submitterAuthorDeleting"
      :autosave-submitter-author-type="autosaveSubmitterAuthorType"
      :delete-submitter-author="deleteSubmitterAuthor"
    />

    <AccountsPage
      v-else-if="activePage === 'accounts'"
      :account-key-groups="accountKeyGroups"
      :backupper-disk-status="backupperDiskStatus"
      :backupper-disk-status-text="backupperDiskStatusText"
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
      :uploader-phone-agent-busy-key="uploaderPhoneAgentBusyKey"
      :uploader-phone-error="uploaderPhoneError"
      :standalone-accounts="standaloneAccounts"
      :standalone-account-loading="standaloneAccountLoading"
      :standalone-account-busy-key="standaloneAccountBusyKey"
      :toggle-platform-enabled="togglePlatformEnabled"
      :save-platform-cooldown="savePlatformCooldown"
      :save-platform-quiet-time="savePlatformQuietTime"
      :save-platform-downloader-max-staged-count="savePlatformDownloaderMaxStagedCount"
      :save-platform-next-upload-allowed-at="savePlatformNextUploadAllowedAt"
      :save-platform-key="savePlatformKey"
      :save-platform-account-profile="savePlatformAccountProfile"
      :upload-platform-account-avatar="uploadPlatformAccountAvatar"
      :open-upload-backfill="openUploadBackfill"
      :open-task-flow="openTaskFlow"
      :close-upload-backfill="closeUploadBackfill"
      :load-upload-backfill-candidates="loadUploadBackfillCandidates"
      :toggle-upload-backfill-row="toggleUploadBackfillRow"
      :toggle-upload-backfill-all="toggleUploadBackfillAll"
      :register-selected-upload-backfill="registerSelectedUploadBackfill"
      :save-uploader-phone-account="saveUploaderPhoneAccount"
      :run-uploader-phone-account-script="runUploaderPhoneAccountScript"
      :run-standalone-account="runStandaloneAccount"
      :account-display="accountDisplay"
      :account-avatar-url="accountAvatarUrl"
      :account-avatar-initial="accountAvatarInitial"
      :account-count-text="accountCountText"
      :next-send-text="nextSendText"
      :platform-busy-key="platformBusyKey"
      :platform-busy-action="platformBusyAction"
      :qr-image-url="qrImageUrl"
      :platform-error-text="platformErrorText"
    />

    <FailureLogsPage
      v-else-if="activePage === 'failure-logs'"
      v-model:stage-filter="failureLogStageFilter"
      v-model:type-filter="failureLogTypeFilter"
      v-model:time-filter="failureLogTimeFilter"
      v-model:platform-filter="failureLogPlatformFilter"
      :rows="failureLogRows"
      :filtered-rows="filteredFailureLogRows"
      :loading="failureLogLoading"
      :error="failureLogError"
      :action-error="failureLogActionError"
      :action-busy="failureLogActionBusy"
      :loaded-at="failureLogLoadedAt"
      :stage-options="failureLogStageOptions"
      :type-options="failureLogTypeOptions"
      :platform-options="failureLogPlatformOptions"
      :platform-icon-urls="PLATFORM_ICON_URLS"
      :selected-ids="failureLogSelectedIds"
      :selected-set="failureLogSelectedSet"
      :all-selected="failureLogAllSelected"
      :actual-published-selected-rows="failureLogActualPublishedSelectedRows"
      :retry-upload-selected-rows="failureLogRetryUploadSelectedRows"
      :load-failure-logs="loadFailureLogs"
      :mark-selected-actual-published="markSelectedFailureLogActualPublished"
      :retry-selected-uploads="retrySelectedFailureLogUploads"
      :toggle-row="toggleFailureLogRow"
      :toggle-all="toggleFailureLogAll"
      :clear-selection="clearFailureLogSelection"
      :reset-filters="resetFailureLogFilters"
      :open-task-flow="openTaskFlow"
      :copy-task-id="copyTaskId"
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
      :platform-icon-urls="PLATFORM_ICON_URLS"
      :whisper-word-timestamps="whisperWordTimestamps"
      :whisper-processing="whisperProcessing"
      :flow-task-title="flowTaskTitle"
      :refresh-task-flow="refreshTaskFlow"
      :load-selected-uploader-diagnostics="loadSelectedUploaderDiagnostics"
      :close-task-flow="closeTaskFlow"
      :flow-cover-url="flowCoverUrl"
      :flow-source-url="flowSourceUrl"
      :mark-image-broken="markImageBroken"
      :stage-name="stageName"
      :upload-submission-rows="uploadSubmissionRows"
      :publisher-result-rows="publisherResultRows"
      :stage-table-rows="stageTableRows"
      :upload-platform-name="uploadPlatformName"
      :speech-columns="speechColumns"
      :speech-rows="speechRows"
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
    />
  </main>
</template>
