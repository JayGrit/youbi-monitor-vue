<script setup>
import PublisherPublishMetadataPanel from '../publisher/PublisherPublishMetadataPanel.vue'

defineProps({
  context: { type: Object, required: true },
})
</script>

<template>
  <PublisherPublishMetadataPanel
    :flow="context.flow"
    :rows="context.publisherResultRows(context.stage)"
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
