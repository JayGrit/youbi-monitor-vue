<script setup>
import CombinerFinalVideoPanel from '../combiner/CombinerFinalVideoPanel.vue'

defineProps({
  context: { type: Object, required: true },
})
</script>

<template>
  <CombinerFinalVideoPanel
    :flow="context.flow"
    :stage="context.stage"
    :jobs="[...context.stageTableRows(context.stage, 'combiner_jobs'), ...context.stageTableRows(context.stage, 'combiner_job')]"
    :media="context.media"
    :log-audio-event="context.logAudioEvent"
  />
</template>
