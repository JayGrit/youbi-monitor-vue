<script setup>
import RawDatabaseTables from '../components/task-flow/RawDatabaseTables.vue'
import SpeechJoinedTable from '../components/task-flow/SpeechJoinedTable.vue'
import StageFieldTable from '../components/task-flow/StageFieldTable.vue'
import StageMediaGrid from '../components/task-flow/StageMediaGrid.vue'
import TaskFlowHeader from '../components/task-flow/TaskFlowHeader.vue'
import TaskFlowTabs from '../components/task-flow/TaskFlowTabs.vue'
import UploadSubmissionGrid from '../components/task-flow/UploadSubmissionGrid.vue'
import { SPEECH_STAGE_KEY } from '../domain/constants'
import { formatDuration } from '../utils/format'

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
  flowTaskTitle: { type: Function, required: true },
  flowDurationSeconds: { type: Function, required: true },
  refreshTaskFlow: { type: Function, required: true },
  closeTaskFlow: { type: Function, required: true },
  flowCoverUrl: { type: Function, required: true },
  flowSourceUrl: { type: Function, required: true },
  markImageBroken: { type: Function, required: true },
  stageName: { type: Function, required: true },
  uploadSubmissionRows: { type: Function, required: true },
  uploadPlatformName: { type: Function, required: true },
  speechColumns: { type: Function, required: true },
  speechRows: { type: Function, required: true },
  showSpeechColumn: { type: Function, required: true },
  speechAudioAsset: { type: Function, required: true },
  logAudioEvent: { type: Function, required: true },
  speechMoreRows: { type: Function, required: true },
  isEditingSpeechDstText: { type: Function, required: true },
  saveSpeechDstText: { type: Function, required: true },
  cancelSpeechEdit: { type: Function, required: true },
  canEditSpeechDstText: { type: Function, required: true },
  beginSpeechEdit: { type: Function, required: true },
  tableCellText: { type: Function, required: true },
  tableCellSummary: { type: Function, required: true },
  stageMedia: { type: Function, required: true },
  fieldRows: { type: Function, required: true },
  tableColumns: { type: Function, required: true },
})

const emit = defineEmits(['update:selectedStageKey', 'update:speechEditDraft'])
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
      <div v-if="flowCoverUrl(selectedTaskFlow)" class="flow-summary">
        <a
          class="source-cover-link"
          :href="flowSourceUrl(selectedTaskFlow) || flowCoverUrl(selectedTaskFlow)"
          target="_blank"
          rel="noreferrer"
          title="打开原视频"
        >
          <img :src="flowCoverUrl(selectedTaskFlow)" alt="" @error="markImageBroken(flowCoverUrl(selectedTaskFlow))" />
        </a>
      </div>

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
          @update:speech-edit-draft="emit('update:speechEditDraft', $event)"
        />

        <template v-else>
          <StageMediaGrid
            v-if="stageMedia(selectedStage).length"
            :media="stageMedia(selectedStage)"
            :log-audio-event="logAudioEvent"
          />
          <StageFieldTable :rows="fieldRows(selectedStage)" />
          <RawDatabaseTables
            :tables="selectedStage.tables || []"
            :table-columns="tableColumns"
            :table-cell-text="tableCellText"
            :table-cell-summary="tableCellSummary"
          />
        </template>
      </section>
    </template>
  </section>
</template>
