<script setup>
import CombinerAudioPanel from '../combiner/CombinerAudioPanel.vue'

defineProps({
  context: { type: Object, required: true },
})
</script>

<template>
  <CombinerAudioPanel
    :stage="context.stage"
    :jobs="[...context.stageTableRows(context.stage, 'combiner_jobs'), ...context.stageTableRows(context.stage, 'combiner_job')]"
    :media="context.media"
    :log-audio-event="context.logAudioEvent"
  />
</template>
