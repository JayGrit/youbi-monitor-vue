<script setup>
import PublisherCoverGenerationPanel from '../publisher/PublisherCoverGenerationPanel.vue'

defineProps({
  context: { type: Object, required: true },
})
</script>

<template>
  <PublisherCoverGenerationPanel
    :flow="context.flow"
    :jobs="context.stageTableRows(context.stage, 'publisher_jobs')"
    :diagnostics="context.uploaderDiagnostics"
    :diagnostics-loading="context.uploaderDiagnosticsLoading"
    :diagnostics-error="context.uploaderDiagnosticsError"
    :operator-diagnostics-api="context.operatorDiagnosticsApi"
    :load-diagnostics="context.loadSelectedUploaderDiagnostics"
    :upload-platform-name="context.uploadPlatformName"
    :upload-image="context.uploadNarrationImage"
  />
</template>
