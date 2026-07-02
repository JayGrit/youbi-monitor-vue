<script setup>
import { ref } from 'vue'
import DemucsAudioPanel from '../DemucsAudioPanel.vue'
import SpeechJoinedTable from '../SpeechJoinedTable.vue'
import WhisperProcessingPanel from '../WhisperProcessingPanel.vue'

const props = defineProps({
  context: { type: Object, required: true },
})
const emit = defineEmits(['update:speechEditDraft'])
const vocalsPlayback = ref({ currentMs: 0, playing: false })
const demucsAudioPanel = ref(null)

function demucsStage(flow) {
  return flow?.stages?.find(stage => stage.key === 'demucs') || null
}

function vocalsOnlyMedia(stage) {
  return props.context.demucsAudioMedia(stage).filter(asset => asset.key === 'vocals')
}

function seekVocalsPlayback(ms) {
  demucsAudioPanel.value?.seekVocals(ms)
}
</script>

<template>
  <DemucsAudioPanel
    ref="demucsAudioPanel"
    :media="vocalsOnlyMedia(demucsStage(context.flow))"
    :words="context.whisperWordTimestamps"
    :log-audio-event="context.logAudioEvent"
    :show-bgm="false"
    @vocals-playback="vocalsPlayback = $event"
  />

  <SpeechJoinedTable
    :speech-edit-draft="context.speechEditDraft"
    :speech-edit-saving="context.speechEditSaving"
    :speech-edit-error="context.speechEditError"
    :speech-columns="context.speechColumns"
    :speech-rows="context.speechRows"
    :show-speech-column="context.showSpeechColumn"
    :speech-audio-asset="context.speechAudioAsset"
    :log-audio-event="context.logAudioEvent"
    :speech-more-rows="context.speechMoreRows"
    :is-editing-speech-dst-text="context.isEditingSpeechDstText"
    :save-speech-dst-text="context.saveSpeechDstText"
    :cancel-speech-edit="context.cancelSpeechEdit"
    :can-edit-speech-dst-text="context.canEditSpeechDstText"
    :begin-speech-edit="context.beginSpeechEdit"
    :table-cell-text="context.tableCellText"
    :table-cell-summary="context.tableCellSummary"
    :words="context.whisperWordTimestamps"
    :processing="context.whisperProcessing"
    :vocals-playback="vocalsPlayback"
    :seek-vocals-playback="seekVocalsPlayback"
    speech-view="whisper"
    :show-speech-view-toggle="false"
    @update:speech-edit-draft="emit('update:speechEditDraft', $event)"
  />

  <WhisperProcessingPanel :processing="context.whisperProcessing" />
</template>
