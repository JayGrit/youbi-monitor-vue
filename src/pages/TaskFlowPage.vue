<script setup>
import SubStageDetailPanel from '../components/task-flow/substages/SubStageDetailPanel.vue'
import TaskFlowHeader from '../components/task-flow/TaskFlowHeader.vue'
import TaskProgressGraph from '../components/monitor/TaskProgressGraph.vue'

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
        <SubStageDetailPanel
          :selected-stage-key="selectedStageKey"
          :selected-task-flow="selectedTaskFlow"
          :selected-stage="selectedStage"
          :speech-edit-draft="speechEditDraft"
          :speech-edit-saving="speechEditSaving"
          :speech-edit-error="speechEditError"
          :uploader-diagnostics="uploaderDiagnostics"
          :uploader-diagnostics-loading="uploaderDiagnosticsLoading"
          :uploader-diagnostics-error="uploaderDiagnosticsError"
          :platform-icon-urls="platformIconUrls"
          :whisper-word-timestamps="whisperWordTimestamps"
          :whisper-processing="whisperProcessing"
          :flow-cover-url="flowCoverUrl"
          :stage-media="stageMedia"
          :demucs-audio-media="demucsAudioMedia"
          :upload-submission-rows="uploadSubmissionRows"
          :publisher-result-rows="publisherResultRows"
          :stage-table-rows="stageTableRows"
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
          :load-selected-uploader-diagnostics="loadSelectedUploaderDiagnostics"
          :submit-narration-segments="submitNarrationSegments"
          :upload-narration-image="uploadNarrationImage"
          @update:speech-edit-draft="emit('update:speechEditDraft', $event)"
        />
      </section>
      <div v-else-if="flowLoading" class="flow-loading">Loading stage metrics</div>
    </template>
  </section>
</template>
