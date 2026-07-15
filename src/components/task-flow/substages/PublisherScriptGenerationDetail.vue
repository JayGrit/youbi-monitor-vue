<script setup>
import PublisherScriptGenerationPanel from '../publisher/PublisherScriptGenerationPanel.vue'

defineProps({
  context: { type: Object, required: true },
})
</script>

<template>
  <PublisherScriptGenerationPanel
    :narrations="context.stageTableRows(context.stage, 'product_narration')"
    :jobs="context.stageTableRows(context.stage, 'publisher_jobs')"
    :operator-tasks="context.stageTableRows(context.stage, 'operator_task')"
  />
</template>
