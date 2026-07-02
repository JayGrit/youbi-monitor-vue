<script setup>
import PublisherSegmentPlanPanel from '../publisher/PublisherSegmentPlanPanel.vue'

defineProps({
  context: { type: Object, required: true },
})
</script>

<template>
  <PublisherSegmentPlanPanel
    :narrations="context.stageTableRows(context.stage, 'product_narration')"
    :sentences="context.stageTableRows(context.stage, 'product_narration_sentence')"
    :jobs="context.stageTableRows(context.stage, 'publisher_jobs')"
    :submit-segments="context.submitNarrationSegments"
  />
</template>
