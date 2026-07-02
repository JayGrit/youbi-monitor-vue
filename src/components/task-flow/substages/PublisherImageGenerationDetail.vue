<script setup>
import PublisherImageGenerationPanel from '../publisher/PublisherImageGenerationPanel.vue'

defineProps({
  context: { type: Object, required: true },
})
</script>

<template>
  <PublisherImageGenerationPanel
    :narrations="context.stageTableRows(context.stage, 'product_narration')"
    :blessings="context.stageTableRows(context.stage, 'product_blessing')"
    :jobs="context.stageTableRows(context.stage, 'publisher_jobs')"
    :diagnostics="context.uploaderDiagnostics"
    :diagnostics-loading="context.uploaderDiagnosticsLoading"
    :diagnostics-error="context.uploaderDiagnosticsError"
    :load-diagnostics="context.loadSelectedUploaderDiagnostics"
    :upload-platform-name="context.uploadPlatformName"
    :upload-image="context.uploadNarrationImage"
  />
</template>
