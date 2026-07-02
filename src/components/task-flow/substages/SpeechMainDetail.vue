<script setup>
import SpeechJoinedTable from '../SpeechJoinedTable.vue'

defineProps({
  context: { type: Object, required: true },
})
const emit = defineEmits(['update:speechEditDraft'])
</script>

<template>
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
    :vocals-playback="{ currentMs: 0, playing: false }"
    :seek-vocals-playback="() => {}"
    speech-view="translator-chunk"
    :show-speech-view-toggle="false"
    @update:speech-edit-draft="emit('update:speechEditDraft', $event)"
  />
</template>
