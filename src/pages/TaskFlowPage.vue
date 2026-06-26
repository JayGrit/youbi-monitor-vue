<script setup>
import DemucsAudioPanel from '../components/task-flow/DemucsAudioPanel.vue'
import DownloaderPanel from '../components/task-flow/DownloaderPanel.vue'
import SpeechJoinedTable from '../components/task-flow/SpeechJoinedTable.vue'
import StageMediaGrid from '../components/task-flow/StageMediaGrid.vue'
import CombinerPanel from '../components/task-flow/CombinerPanel.vue'
import PublisherPanel from '../components/task-flow/PublisherPanel.vue'
import TaskFlowHeader from '../components/task-flow/TaskFlowHeader.vue'
import TaskProgressGraph from '../components/monitor/TaskProgressGraph.vue'
import UploadSubmissionGrid from '../components/task-flow/UploadSubmissionGrid.vue'
import WhisperProcessingPanel from '../components/task-flow/WhisperProcessingPanel.vue'
import AsseterPanel from '../components/task-flow/AsseterPanel.vue'
import { SPEECH_STAGE_KEY } from '../domain/constants'
import { computed, ref } from 'vue'

const props = defineProps({
  selectedTaskFlow: { type: Object, default: null },
  selectedTaskProgress: { type: Object, default: null },
  flowLoading: { type: Boolean, default: false },
  flowError: { type: String, default: '' },
  selectedStageKey: { type: String, default: '' },
  selectedStage: { type: Object, default: null },
  speechEditDraft: { type: String, default: '' },
  speechEditSaving: { type: Boolean, default: false },
  speechEditError: { type: String, default: '' },
  uploaderDiagnostics: { type: Array, default: () => [] },
  uploaderDiagnosticsLoading: { type: Boolean, default: false },
  uploaderDiagnosticsError: { type: String, default: '' },
  platformIconUrls: { type: Object, default: () => ({}) },
  whisperWordTimestamps: { type: Array, default: () => [] },
  whisperProcessing: { type: Object, default: null },
  flowTaskTitle: { type: Function, required: true },
  refreshTaskFlow: { type: Function, required: true },
  selectTaskFlowStage: { type: Function, required: true },
  nodeProgress: { type: Function, required: true },
  nodeTitle: { type: Function, required: true },
  loadSelectedUploaderDiagnostics: { type: Function, required: true },
  submitNarrationSegments: { type: Function, required: true },
  uploadNarrationImage: { type: Function, required: true },
  closeTaskFlow: { type: Function, required: true },
  flowCoverUrl: { type: Function, required: true },
  flowSourceUrl: { type: Function, required: true },
  markImageBroken: { type: Function, required: true },
  stageName: { type: Function, required: true },
  uploadSubmissionRows: { type: Function, required: true },
  publisherResultRows: { type: Function, required: true },
  stageTableRows: { type: Function, required: true },
  uploadPlatformName: { type: Function, required: true },
  speechColumns: { type: Function, required: true },
  speechRows: { type: Function, required: true },
  showSpeechColumn: { type: Function, required: true },
  speechAudioAsset: { type: Function, required: true },
  logAudioEvent: { type: Function, required: true },
  demucsAudioMedia: { type: Function, required: true },
  speechMoreRows: { type: Function, required: true },
  isEditingSpeechDstText: { type: Function, required: true },
  saveSpeechDstText: { type: Function, required: true },
  cancelSpeechEdit: { type: Function, required: true },
  canEditSpeechDstText: { type: Function, required: true },
  beginSpeechEdit: { type: Function, required: true },
  tableCellText: { type: Function, required: true },
  tableCellSummary: { type: Function, required: true },
  stageMedia: { type: Function, required: true },
})

const emit = defineEmits(['update:speechEditDraft'])
const vocalsPlayback = ref({ currentMs: 0, playing: false })
const demucsAudioPanel = ref(null)
const publisherSubStage = computed(() => {
  if (!props.selectedStageKey.startsWith('publisher:')) return 'main'
  return props.selectedStageKey.slice('publisher:'.length) || 'main'
})
const combinerSubStage = computed(() => {
  if (!props.selectedStageKey.startsWith('combiner:')) return 'main'
  return props.selectedStageKey.slice('combiner:'.length) || 'main'
})

function demucsStage(flow) {
  return flow?.stages?.find(stage => stage.key === 'demucs') || null
}

function vocalsOnlyMedia(stage) {
  return demucsAudioMedia(stage).filter(asset => asset.key === 'vocals')
}

function seekVocalsPlayback(ms) {
  demucsAudioPanel.value?.seekVocals(ms)
}
</script>

<template>
  <section class="flow-page" aria-label="任务流详情">
    <TaskFlowHeader
      :selected-task-flow="selectedTaskFlow"
      :flow-loading="flowLoading"
      :flow-task-title="flowTaskTitle"
      :refresh-task-flow="refreshTaskFlow"
      :close-task-flow="closeTaskFlow"
    />

    <div v-if="flowError" class="flow-error">Task flow API error: {{ flowError }}</div>
    <div v-else-if="flowLoading && !selectedTaskFlow" class="flow-loading">Loading task flow</div>
    <template v-else-if="selectedTaskFlow">
      <TaskProgressGraph
        v-if="selectedTaskProgress"
        :task="{ taskId: selectedTaskFlow.task.id }"
        :progress="selectedTaskProgress"
        :node-progress="nodeProgress"
        :node-title="nodeTitle"
        :open-task-flow="(_task, stage, subStage) => selectTaskFlowStage(stage, subStage)"
      />

      <section v-if="selectedStage" class="flow-stage">
        <pre v-if="selectedStage.errorMessage" class="flow-stage-error">{{ selectedStage.errorMessage }}</pre>

        <StageMediaGrid
          v-if="selectedStage.key === 'uploader' && stageMedia(selectedStage).length"
          :media="stageMedia(selectedStage)"
          :log-audio-event="logAudioEvent"
          compact
        />

        <UploadSubmissionGrid
          v-if="selectedStage.key === 'uploader' && uploadSubmissionRows(selectedStage).length"
          :rows="uploadSubmissionRows(selectedStage)"
          :upload-platform-name="uploadPlatformName"
          :platform-icon-urls="platformIconUrls"
          :diagnostics="uploaderDiagnostics"
          :loading="uploaderDiagnosticsLoading"
          :error="uploaderDiagnosticsError"
          :load-diagnostics="loadSelectedUploaderDiagnostics"
        />

        <PublisherPanel
          v-if="selectedStage.key === 'publisher'"
          :sub-stage="publisherSubStage"
          :flow="selectedTaskFlow"
          :rows="publisherResultRows(selectedStage)"
          :jobs="stageTableRows(selectedStage, 'publisher_jobs')"
          :narrations="stageTableRows(selectedStage, 'product_narration')"
          :sentences="stageTableRows(selectedStage, 'product_narration_sentence')"
          :diagnostics="uploaderDiagnostics"
          :diagnostics-loading="uploaderDiagnosticsLoading"
          :diagnostics-error="uploaderDiagnosticsError"
          :load-diagnostics="loadSelectedUploaderDiagnostics"
          :upload-platform-name="uploadPlatformName"
          :submit-segments="submitNarrationSegments"
          :upload-image="uploadNarrationImage"
        />

        <AsseterPanel
          v-if="selectedStage.key === 'asseter'"
          :jobs="stageTableRows(selectedStage, 'asseter_jobs')"
          :media="stageMedia(selectedStage)"
          :log-audio-event="logAudioEvent"
        />

        <CombinerPanel
          v-if="selectedStage.key === 'combiner'"
          :sub-stage="combinerSubStage"
          :flow="selectedTaskFlow"
          :stage="selectedStage"
          :jobs="[...stageTableRows(selectedStage, 'combiner_jobs'), ...stageTableRows(selectedStage, 'combiner_job')]"
          :media="stageMedia(selectedStage)"
          :log-audio-event="logAudioEvent"
        />

        <DemucsAudioPanel
          v-if="selectedStage.key === 'demucs'"
          ref="demucsAudioPanel"
          :media="demucsAudioMedia(selectedStage)"
          :words="whisperWordTimestamps"
          :log-audio-event="logAudioEvent"
          @vocals-playback="vocalsPlayback = $event"
        />

        <DemucsAudioPanel
          v-else-if="selectedStage.key === 'whisper'"
          ref="demucsAudioPanel"
          :media="vocalsOnlyMedia(demucsStage(selectedTaskFlow))"
          :words="whisperWordTimestamps"
          :log-audio-event="logAudioEvent"
          :show-bgm="false"
          @vocals-playback="vocalsPlayback = $event"
        />

        <SpeechJoinedTable
          v-if="selectedStage.key === 'whisper'"
          :speech-edit-draft="speechEditDraft"
          :speech-edit-saving="speechEditSaving"
          :speech-edit-error="speechEditError"
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
          :words="whisperWordTimestamps"
          :processing="whisperProcessing"
          :vocals-playback="vocalsPlayback"
          :seek-vocals-playback="seekVocalsPlayback"
          speech-view="whisper"
          :show-speech-view-toggle="false"
          @update:speech-edit-draft="emit('update:speechEditDraft', $event)"
        />

        <DownloaderPanel
          v-else-if="selectedStage.key === 'downloader'"
          :flow="selectedTaskFlow"
          :stage="selectedStage"
          :media="stageMedia(selectedStage)"
          :cover-url="flowCoverUrl(selectedTaskFlow)"
          :log-audio-event="logAudioEvent"
        />

        <StageMediaGrid
          v-else-if="selectedStageKey !== SPEECH_STAGE_KEY && !['publisher', 'asseter', 'combiner', 'uploader', 'demucs', 'whisper', 'downloader'].includes(selectedStage.key) && stageMedia(selectedStage).length"
          :media="stageMedia(selectedStage)"
          :log-audio-event="logAudioEvent"
        />

        <SpeechJoinedTable
          v-if="selectedStageKey === SPEECH_STAGE_KEY"
          :speech-edit-draft="speechEditDraft"
          :speech-edit-saving="speechEditSaving"
          :speech-edit-error="speechEditError"
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
          :words="whisperWordTimestamps"
          :processing="whisperProcessing"
          :vocals-playback="vocalsPlayback"
          :seek-vocals-playback="seekVocalsPlayback"
          speech-view="translator-chunk"
          :show-speech-view-toggle="false"
          @update:speech-edit-draft="emit('update:speechEditDraft', $event)"
        />

        <WhisperProcessingPanel
          v-if="selectedStage.key === 'whisper'"
          :processing="whisperProcessing"
        />

      </section>
      <div v-else-if="flowLoading" class="flow-loading">Loading stage metrics</div>
    </template>
  </section>
</template>
