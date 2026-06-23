<script setup>
import CombinerAudioPanel from './combiner/CombinerAudioPanel.vue'
import CombinerFinalVideoPanel from './combiner/CombinerFinalVideoPanel.vue'
import CombinerMainPanel from './combiner/CombinerMainPanel.vue'
import CombinerSubtitlePanel from './combiner/CombinerSubtitlePanel.vue'

defineProps({
  subStage: { type: String, default: 'main' },
  flow: { type: Object, default: null },
  stage: { type: Object, default: null },
  jobs: { type: Array, default: () => [] },
  media: { type: Array, default: () => [] },
  logAudioEvent: { type: Function, required: true },
})
</script>

<template>
  <CombinerAudioPanel
    v-if="subStage === 'audio_mix'"
    :stage="stage"
    :jobs="jobs"
    :media="media"
    :log-audio-event="logAudioEvent"
  />
  <CombinerSubtitlePanel
    v-else-if="subStage === 'subtitle'"
    :stage="stage"
    :jobs="jobs"
  />
  <CombinerFinalVideoPanel
    v-else-if="subStage === 'final_video'"
    :flow="flow"
    :stage="stage"
    :jobs="jobs"
    :media="media"
    :log-audio-event="logAudioEvent"
  />
  <CombinerMainPanel
    v-else
    :flow="flow"
    :stage="stage"
    :jobs="jobs"
    :media="media"
    :log-audio-event="logAudioEvent"
  />
</template>
