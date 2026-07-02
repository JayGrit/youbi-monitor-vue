<script setup>
import { computed } from 'vue'
import { SPEECH_STAGE_KEY, stageNameText, subStageNameText } from '../../../domain/constants'
import AsseterAudioVisualizationDetail from './AsseterAudioVisualizationDetail.vue'
import AsseterImageCompositionDetail from './AsseterImageCompositionDetail.vue'
import CombinerAsmrDetail from './CombinerAsmrDetail.vue'
import CombinerAudioMergeDetail from './CombinerAudioMergeDetail.vue'
import CombinerMainDetail from './CombinerMainDetail.vue'
import CombinerVideoRenderDetail from './CombinerVideoRenderDetail.vue'
import DemucsMainDetail from './DemucsMainDetail.vue'
import DownloaderMainDetail from './DownloaderMainDetail.vue'
import DownloaderMetadataDetail from './DownloaderMetadataDetail.vue'
import PublisherImageGenerationDetail from './PublisherImageGenerationDetail.vue'
import PublisherMainDetail from './PublisherMainDetail.vue'
import PublisherPublishMetadataDetail from './PublisherPublishMetadataDetail.vue'
import PublisherScriptGenerationDetail from './PublisherScriptGenerationDetail.vue'
import PublisherSegmentPlanDetail from './PublisherSegmentPlanDetail.vue'
import CombinerBlessingVideoDetail from './CombinerBlessingVideoDetail.vue'
import SpeakerDubbingMultiSegmentDetail from './SpeakerDubbingMultiSegmentDetail.vue'
import SpeakerMainDetail from './SpeakerMainDetail.vue'
import SpeakerNarrationDetail from './SpeakerNarrationDetail.vue'
import SpeechMainDetail from './SpeechMainDetail.vue'
import TranslatorMainDetail from './TranslatorMainDetail.vue'
import UploaderMainDetail from './UploaderMainDetail.vue'
import WhisperDubbingAlignmentDetail from './WhisperDubbingAlignmentDetail.vue'
import WhisperMainDetail from './WhisperMainDetail.vue'
import WhisperSourceTranscriptionDetail from './WhisperSourceTranscriptionDetail.vue'
import NoDetailPage from './NoDetailPage.vue'

const props = defineProps({
  selectedStageKey: { type: String, default: '' },
  selectedTaskFlow: { type: Object, default: null },
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
  flowCoverUrl: { type: Function, required: true },
  stageMedia: { type: Function, required: true },
  demucsAudioMedia: { type: Function, required: true },
  uploadSubmissionRows: { type: Function, required: true },
  publisherResultRows: { type: Function, required: true },
  stageTableRows: { type: Function, required: true },
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
  loadSelectedUploaderDiagnostics: { type: Function, required: true },
  submitNarrationSegments: { type: Function, required: true },
  uploadNarrationImage: { type: Function, required: true },
})

const emit = defineEmits(['update:speechEditDraft'])

const detailComponents = {
  'asseter:audio_visualization': AsseterAudioVisualizationDetail,
  'asseter:image_composition': AsseterImageCompositionDetail,
  'combiner:asmr': CombinerAsmrDetail,
  'combiner:audio_align': CombinerAudioMergeDetail,
  'combiner:blessing_video': CombinerBlessingVideoDetail,
  'combiner:audio_merge': CombinerAudioMergeDetail,
  'combiner:main': CombinerMainDetail,
  'combiner:video_render': CombinerVideoRenderDetail,
  'demucs:main': DemucsMainDetail,
  'downloader:main': DownloaderMainDetail,
  'downloader:metadata': DownloaderMetadataDetail,
  'publisher:image_generation': PublisherImageGenerationDetail,
  'publisher:main': PublisherMainDetail,
  'publisher:publish_metadata': PublisherPublishMetadataDetail,
  'publisher:script_generation': PublisherScriptGenerationDetail,
  'publisher:segment_plan': PublisherSegmentPlanDetail,
  'speaker:dubbing_multi_segment': SpeakerDubbingMultiSegmentDetail,
  'speaker:main': SpeakerMainDetail,
  'speaker:narration': SpeakerNarrationDetail,
  'translator:main': TranslatorMainDetail,
  'uploader:main': UploaderMainDetail,
  'whisper:dubbing_alignment': WhisperDubbingAlignmentDetail,
  'whisper:main': WhisperMainDetail,
  'whisper:source_transcription': WhisperSourceTranscriptionDetail,
}

const detailKey = computed(() => {
  if (props.selectedStageKey === SPEECH_STAGE_KEY) return SPEECH_STAGE_KEY
  const stage = props.selectedStage?.key || String(props.selectedStageKey || '').split(':', 1)[0]
  const parts = String(props.selectedStageKey || '').split(':')
  const subStage = parts.length > 1 ? parts.slice(1).join(':') || 'main' : 'main'
  return `${stage}:${subStage}`
})
const detailComponent = computed(() => {
  if (detailKey.value === SPEECH_STAGE_KEY) return SpeechMainDetail
  return detailComponents[detailKey.value] || NoDetailPage
})
const detailTitle = computed(() => {
  if (detailKey.value === SPEECH_STAGE_KEY) {
    return `${stageNameText[SPEECH_STAGE_KEY]} - ${subStageNameText.main}`
  }
  const [stage, ...subStageParts] = detailKey.value.split(':')
  const subStage = subStageParts.join(':') || 'main'
  const stageLabel = stageNameText[stage] || stage || '-'
  const subStageLabel = subStageNameText[subStage] || subStage || '-'
  return `${stageLabel} - ${subStageLabel}`
})
const detailParts = computed(() => {
  if (detailKey.value === SPEECH_STAGE_KEY) {
    return { stage: SPEECH_STAGE_KEY, subStage: 'main', detailKey: SPEECH_STAGE_KEY }
  }
  const [stage, ...subStageParts] = detailKey.value.split(':')
  return {
    stage,
    subStage: subStageParts.join(':') || 'main',
    detailKey: detailKey.value,
  }
})
function stageRowsBySubStage(stage, tableName, subStage = detailParts.value.subStage) {
  const rows = props.stageTableRows(stage, tableName)
  if (!subStage) return rows
  const matched = rows.filter(row => String(row?.sub_stage || '') === subStage)
  if (matched.length) return matched
  return rows.filter(row => row?.sub_stage === undefined || row?.sub_stage === null || row?.sub_stage === '')
}
const context = computed(() => ({
  ...props,
  stage: props.selectedStage,
  stageKey: detailParts.value.stage,
  subStage: detailParts.value.subStage,
  detailKey: detailParts.value.detailKey,
  flow: props.selectedTaskFlow,
  media: props.stageMedia(props.selectedStage),
  demucsMedia: props.demucsAudioMedia(props.selectedStage),
  coverUrl: props.flowCoverUrl(props.selectedTaskFlow),
  stageRowsBySubStage,
}))
</script>

<template>
  <div class="substage-detail">
    <header class="substage-detail-title" aria-label="当前详情阶段">
      <h3>{{ detailTitle }}</h3>
    </header>
    <pre v-if="context.stage?.errorMessage" class="flow-stage-error">{{ context.stage.errorMessage }}</pre>
    <component
      :is="detailComponent"
      :context="context"
      @update:speech-edit-draft="emit('update:speechEditDraft', $event)"
    />
  </div>
</template>
