<script setup>
import StageJobsPanel from './StageJobsPanel.vue'
import StageMediaGrid from './StageMediaGrid.vue'

defineProps({
  jobs: { type: Array, default: () => [] },
  media: { type: Array, default: () => [] },
  logAudioEvent: { type: Function, required: true },
})
</script>

<template>
  <div class="asseter-panel">
    <StageMediaGrid v-if="media.length" :media="media" :log-audio-event="logAudioEvent" />
    <StageJobsPanel
      title="素材加工步骤"
      :rows="jobs"
      name-field="job_type"
      order-field="id"
      result-field="output_url"
    />
  </div>
</template>
