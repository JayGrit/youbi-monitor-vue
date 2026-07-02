<script setup>
import DownloaderPanel from '../DownloaderPanel.vue'

defineProps({
  context: { type: Object, required: true },
})
</script>

<template>
  <DownloaderPanel
    :flow="context.flow"
    :stage="context.stage"
    :media="context.media"
    :cover-url="context.coverUrl"
    :log-audio-event="context.logAudioEvent"
  />
</template>
