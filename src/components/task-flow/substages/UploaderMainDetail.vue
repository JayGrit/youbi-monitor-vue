<script setup>
import StageMediaGrid from '../StageMediaGrid.vue'
import UploadSubmissionGrid from '../UploadSubmissionGrid.vue'

defineProps({
  context: { type: Object, required: true },
})
</script>

<template>
  <StageMediaGrid
    v-if="context.media.length"
    :media="context.media"
    :log-audio-event="context.logAudioEvent"
    compact
  />
  <UploadSubmissionGrid
    v-if="context.uploadSubmissionRows(context.stage).length"
    :rows="context.uploadSubmissionRows(context.stage)"
    :upload-platform-name="context.uploadPlatformName"
    :platform-icon-urls="context.platformIconUrls"
    :diagnostics="context.uploaderDiagnostics"
    :loading="context.uploaderDiagnosticsLoading"
    :error="context.uploaderDiagnosticsError"
    :load-diagnostics="context.loadSelectedUploaderDiagnostics"
  />
</template>
