<script setup>
import DemucsAudioPanel from '../DemucsAudioPanel.vue'

defineProps({
  context: { type: Object, required: true },
})
</script>

<template>
  <DemucsAudioPanel
    :media="context.demucsMedia"
    :words="context.whisperWordTimestamps"
    :log-audio-event="context.logAudioEvent"
  />
</template>
