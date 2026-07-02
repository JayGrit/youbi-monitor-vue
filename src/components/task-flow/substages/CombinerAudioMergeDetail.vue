<script setup>
import { computed } from 'vue'
import CombinerAudioPanel from '../combiner/CombinerAudioPanel.vue'

const props = defineProps({
  context: { type: Object, required: true },
})

const jobs = computed(() => [
  ...props.context.stageRowsBySubStage(props.context.stage, 'combiner_jobs', props.context.subStage),
  ...props.context.stageRowsBySubStage(props.context.stage, 'combiner_job', props.context.subStage),
])
</script>

<template>
  <CombinerAudioPanel
    :stage="context.stage"
    :jobs="jobs"
    :media="context.media"
    :log-audio-event="context.logAudioEvent"
  />
</template>
