<script setup>
import DemucsAudioPanel from '../components/task-flow/DemucsAudioPanel.vue'
import DownloaderPanel from '../components/task-flow/DownloaderPanel.vue'
import SpeechJoinedTable from '../components/task-flow/SpeechJoinedTable.vue'
import StageMediaGrid from '../components/task-flow/StageMediaGrid.vue'
import PublisherPanel from '../components/task-flow/PublisherPanel.vue'
import TaskFlowHeader from '../components/task-flow/TaskFlowHeader.vue'
import TaskFlowTabs from '../components/task-flow/TaskFlowTabs.vue'
import UploadSubmissionGrid from '../components/task-flow/UploadSubmissionGrid.vue'
import WhisperProcessingPanel from '../components/task-flow/WhisperProcessingPanel.vue'
import { SPEECH_STAGE_KEY } from '../domain/constants'
import { formatDuration } from '../utils/format'
import { ref } from 'vue'

defineProps({
  selectedTaskFlow: { type: Object, default: null },
  flowLoading: { type: Boolean, default: false },
  flowError: { type: String, default: '' },
  flowTabs: { type: Array, default: () => [] },
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
  flowDurationSeconds: { type: Function, required: true },
  refreshTaskFlow: { type: Function, required: true },
  loadSelectedUploaderDiagnostics: { type: Function, required: true },
  closeTaskFlow: { type: Function, required: true },
  flowCoverUrl: { type: Function, required: true },
  flowSourceUrl: { type: Function, required: true },
  markImageBroken: { type: Function, required: true },
  stageName: { type: Function, required: true },
  uploadSubmissionRows: { type: Function, required: true },
  publisherResultRows: { type: Function, required: true },
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

const emit = defineEmits(['update:selectedStageKey', 'update:speechEditDraft'])
const vocalsPlayback = ref({ currentMs: 0, playing: false })
const demucsAudioPanel = ref(null)

function demucsStage(flow) {
  return flow?.stages?.find(stage => stage.key === 'demucs') || null
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
      :flow-duration-seconds="flowDurationSeconds"
      :refresh-task-flow="refreshTaskFlow"
      :close-task-flow="closeTaskFlow"
    />

    <div v-if="flowError" class="flow-error">Task flow API error: {{ flowError }}</div>
    <div v-else-if="flowLoading && !selectedTaskFlow" class="flow-loading">Loading task flow</div>
    <template v-else-if="selectedTaskFlow">
      <TaskFlowTabs
        :flow-tabs="flowTabs"
        :selected-stage-key="selectedStageKey"
        :stage-name="stageName"
        @update:selected-stage-key="emit('update:selectedStageKey', $event)"
      />

      <section v-if="selectedStage" class="flow-stage">
        <div class="flow-stage-head">
          <div>
            <p>
              耗时 {{ formatDuration(selectedStage.elapsedSeconds) }}
            </p>
          </div>
        </div>

        <pre v-if="selectedStage.errorMessage" class="flow-stage-error">{{ selectedStage.errorMessage }}</pre>

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
          :stage="selectedStage"
          :rows="publisherResultRows(selectedStage)"
          :media="stageMedia(selectedStage)"
        />

        <DemucsAudioPanel
          v-if="selectedStageKey === SPEECH_STAGE_KEY"
          ref="demucsAudioPanel"
          :media="demucsAudioMedia(demucsStage(selectedTaskFlow))"
          :words="whisperWordTimestamps"
          :log-audio-event="logAudioEvent"
          @vocals-playback="vocalsPlayback = $event"
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
          v-else-if="selectedStageKey !== SPEECH_STAGE_KEY && stageMedia(selectedStage).length"
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
          @update:speech-edit-draft="emit('update:speechEditDraft', $event)"
        />

        <WhisperProcessingPanel
          v-if="selectedStageKey === SPEECH_STAGE_KEY"
          :processing="whisperProcessing"
        />

      </section>
    </template>
  </section>
</template>
