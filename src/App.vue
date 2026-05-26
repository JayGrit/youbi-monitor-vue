<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
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
import { useSubmitter } from './composables/useSubmitter'
import { useTaskFlow } from './composables/useTaskFlow'
import { useTasks } from './composables/useTasks'
import AccountsPage from './pages/AccountsPage.vue'
import MonitorPage from './pages/MonitorPage.vue'
import SubmitterPage from './pages/SubmitterPage.vue'
import TaskFlowPage from './pages/TaskFlowPage.vue'

const activePage = ref('monitor')
const brokenImageUrls = ref({})
let timer = null
const apiBase = `${import.meta.env.BASE_URL}api`
const submitterApiBase = `${import.meta.env.BASE_URL}submitter-api`
const monitorApi = createMonitorApi(apiBase)
const accountsApi = createAccountsApi(apiBase)
const submitterApi = createSubmitterApi(submitterApiBase, apiBase)
const PLATFORM_ICON_URLS = createPlatformIconUrls(import.meta.env.BASE_URL)
const ACCOUNT_PLATFORMS = createAccountPlatforms(PLATFORM_ICON_URLS)

async function cacheImageUrl(url, cacheName, targetRef) {
  if (!url || targetRef.value[url]) return
  if (!('caches' in window)) return
  try {
    const cache = await caches.open(cacheName)
    const cached = await cache.match(url)
    if (cached) {
      const blob = await cached.blob()
      if (blob.size > 0) {
        targetRef.value = { ...targetRef.value, [url]: URL.createObjectURL(blob) }
        return
      }
    }
    const response = await fetch(url, { mode: 'cors', cache: 'force-cache' })
    if (!response.ok) return
    await cache.put(url, response.clone())
    const blob = await response.blob()
    if (blob.size > 0) {
      targetRef.value = { ...targetRef.value, [url]: URL.createObjectURL(blob) }
    }
  } catch (err) {
    // Fall back to the original URL when a thumbnail host does not allow CORS.
  }
}

const {
  tasks,
  serviceHeartbeats,
  loading,
  error,
  taskStatusFilter,
  taskTypeFilter,
  taskActionsExpanded,
  openFailureKey,
  uploadRetryPlatform,
  uploadRetryRows,
  uploadRetryLoading,
  uploadRetryBusy,
  uploadRetrySelectedIds,
  taskFilterCounts,
  taskTypeFilters,
  filteredTasks,
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
  startAccountPolling,
  clearAccountPagePolling,
  clearAccountPolling,
  startBilibiliQrLogin,
  startXiaohongshuQrLogin,
  addDouyinCdpRow,
  togglePlatformEnabled,
  savePlatformCooldown,
  accountDisplay,
  accountCountText,
  nextSendText,
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
  speechMoreRows,
  canEditSpeechDstText,
  isEditingSpeechDstText,
  beginSpeechEdit,
  cancelSpeechEdit,
  saveSpeechDstText,
  speechAudioAsset,
  stageMedia,
  fieldRows,
} = useTaskFlow(monitorApi, brokenImageUrls)

const {
  submitterVideos,
  submitterLoading,
  submitterError,
  submitterMessage,
  submitterUrl,
  submitterAuthor,
  submitterBusy,
  submitterAuthorBusy,
  submitterUploader,
  submitterDurationFilter,
  submitterUploadFilter,
  submitterSort,
  submitterAuthors,
  submitterFields,
  submitterVisibleFields,
  submitterFieldsOpen,
  submitterFocusedBatch,
  submitterJsonTitle,
  submitterJsonPayload,
  submitterThumbUrls,
  submitterSubmittingId,
  submitterPage,
  submitterAuthorTypeOpen,
  submitterAuthorTypeRows,
  submitterAuthorTypeSaving,
  submitterAuthorTypeError,
  submitterFilteredVideos,
  submitterFilteredTotal,
  submitterPageCount,
  submitterVisibleFieldList,
  submitterStatusCounts,
  loadSubmitterVideos,
  applySubmitterFilters,
  loadSubmitterAuthors,
  toggleSubmitterFieldsPanel,
  resetSubmitterFilters,
  clearSubmitterBatchFocus,
  submitVideoToYoubi,
  openSubmitterAuthorTypes,
  autosaveSubmitterAuthorType,
  closeSubmitterAuthorTypes,
  setSubmitterPage,
  createSubmitterVideo,
  importSubmitterAuthor,
  clearSubmitterPolling,
  submitterFieldValue,
  submitterFieldLabel,
  selectAllSubmitterFields,
  selectCommonSubmitterFields,
  selectNoSubmitterFields,
  toggleSubmitterField,
  submitterVideoHref,
  submitterVideoTitle,
  submitterVideoThumb,
  submitterCachedThumb,
  submitterValueKind,
  submitterJsonPreview,
  submitterArrayPreview,
  showSubmitterJson,
  closeSubmitterJson,
  formatUnixSeconds,
} = useSubmitter(submitterApi, cacheImageUrl)

function openPage(page) {
  if (flowPageOpen.value) {
    closeTaskFlow()
  }
  activePage.value = page
  clearAccountPagePolling()
  if (page === 'submitter') {
    loadSubmitterAuthors()
    loadSubmitterVideos()
  }
  if (page === 'accounts') {
    warmPlatformIcons()
    startAccountPolling()
  }
}

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

onMounted(() => {
  warmPlatformIcons()
  loadTasks()
  timer = window.setInterval(loadTasks, 2000)
})

onUnmounted(() => {
  if (timer) {
    window.clearInterval(timer)
  }
  clearAccountPolling()
  clearFlowPolling()
  clearSubmitterPolling()
  for (const url of Object.values(submitterThumbUrls.value)) {
    if (String(url).startsWith('blob:')) URL.revokeObjectURL(url)
  }
})
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
      :task-actions-expanded="taskActionsExpanded"
      :filtered-tasks="filteredTasks"
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
      @update:task-status-filter="taskStatusFilter = $event"
      @update:task-type-filter="setTaskTypeFilter"
      @clear-failure="openFailureKey = ''"
    />

    <SubmitterPage
      v-else-if="activePage === 'submitter'"
      v-model:submitter-url="submitterUrl"
      v-model:submitter-author="submitterAuthor"
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
      :submitter-fields-open="submitterFieldsOpen"
      :submitter-visible-fields="submitterVisibleFields"
      :submitter-fields="submitterFields"
      :submitter-visible-field-list="submitterVisibleFieldList"
      :submitter-filtered-videos="submitterFilteredVideos"
      :submitter-filtered-total="submitterFilteredTotal"
      :submitter-page="submitterPage"
      :submitter-page-count="submitterPageCount"
      :submitter-submitting-id="submitterSubmittingId"
      :submitter-json-payload="submitterJsonPayload"
      :submitter-json-title="submitterJsonTitle"
      :submitter-author-type-open="submitterAuthorTypeOpen"
      :submitter-author-type-error="submitterAuthorTypeError"
      :submitter-author-type-rows="submitterAuthorTypeRows"
      :submitter-author-type-saving="submitterAuthorTypeSaving"
      :create-submitter-video="createSubmitterVideo"
      :import-submitter-author="importSubmitterAuthor"
      :apply-submitter-filters="applySubmitterFilters"
      :open-submitter-author-types="openSubmitterAuthorTypes"
      :reset-submitter-filters="resetSubmitterFilters"
      :clear-submitter-batch-focus="clearSubmitterBatchFocus"
      :toggle-submitter-fields-panel="toggleSubmitterFieldsPanel"
      :select-all-submitter-fields="selectAllSubmitterFields"
      :select-common-submitter-fields="selectCommonSubmitterFields"
      :select-no-submitter-fields="selectNoSubmitterFields"
      :toggle-submitter-field="toggleSubmitterField"
      :submitter-field-label="submitterFieldLabel"
      :submitter-video-thumb="submitterVideoThumb"
      :submitter-cached-thumb="submitterCachedThumb"
      :submitter-video-href="submitterVideoHref"
      :submitter-video-title="submitterVideoTitle"
      :submitter-field-value="submitterFieldValue"
      :submitter-value-kind="submitterValueKind"
      :format-unix-seconds="formatUnixSeconds"
      :submitter-array-preview="submitterArrayPreview"
      :submitter-json-preview="submitterJsonPreview"
      :show-submitter-json="showSubmitterJson"
      :submit-video-to-youbi="submitVideoToYoubi"
      :set-submitter-page="setSubmitterPage"
      :close-submitter-json="closeSubmitterJson"
      :close-submitter-author-types="closeSubmitterAuthorTypes"
      :autosave-submitter-author-type="autosaveSubmitterAuthorType"
    />

    <AccountsPage
      v-else-if="activePage === 'accounts'"
      :account-key-groups="accountKeyGroups"
      :bilibili-qr-code="bilibiliQrCode"
      :bilibili-qr-message="bilibiliQrMessage"
      :xiaohongshu-qr-code="xiaohongshuQrCode"
      :xiaohongshu-qr-message="xiaohongshuQrMessage"
      :add-douyin-cdp-row="addDouyinCdpRow"
      :start-xiaohongshu-qr-login="startXiaohongshuQrLogin"
      :start-bilibili-qr-login="startBilibiliQrLogin"
      :toggle-platform-enabled="togglePlatformEnabled"
      :save-platform-cooldown="savePlatformCooldown"
      :account-display="accountDisplay"
      :account-count-text="accountCountText"
      :next-send-text="nextSendText"
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
      :show-speech-column="showSpeechColumn"
      :speech-audio-asset="speechAudioAsset"
      :log-audio-event="logAudioEvent"
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
