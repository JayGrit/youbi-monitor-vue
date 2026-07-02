<script setup>
import CombinerMainPanel from '../combiner/CombinerMainPanel.vue'

defineProps({
  context: { type: Object, required: true },
})
</script>

<template>
  <CombinerMainPanel
    :flow="context.flow"
    :stage="context.stage"
    :jobs="[...context.stageTableRows(context.stage, 'combiner_jobs'), ...context.stageTableRows(context.stage, 'combiner_job')]"
    :media="context.media"
    :log-audio-event="context.logAudioEvent"
  />
</template>
