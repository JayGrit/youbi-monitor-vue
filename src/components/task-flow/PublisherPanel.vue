<script setup>
import PublisherImageGenerationPanel from './publisher/PublisherImageGenerationPanel.vue'
import PublisherMainPanel from './publisher/PublisherMainPanel.vue'
import PublisherPublishMetadataPanel from './publisher/PublisherPublishMetadataPanel.vue'
import PublisherSegmentPlanPanel from './publisher/PublisherSegmentPlanPanel.vue'

defineProps({
  subStage: { type: String, default: 'main' },
  flow: { type: Object, default: null },
  rows: { type: Array, default: () => [] },
  jobs: { type: Array, default: () => [] },
  narrations: { type: Array, default: () => [] },
  sentences: { type: Array, default: () => [] },
  diagnostics: { type: Array, default: () => [] },
  diagnosticsLoading: { type: Boolean, default: false },
  diagnosticsError: { type: String, default: '' },
  loadDiagnostics: { type: Function, required: true },
  uploadPlatformName: { type: Function, required: true },
  submitSegments: { type: Function, required: true },
  uploadImage: { type: Function, required: true },
})
</script>

<template>
  <PublisherSegmentPlanPanel
    v-if="subStage === 'segment_plan'"
    :narrations="narrations"
    :sentences="sentences"
    :jobs="jobs"
    :submit-segments="submitSegments"
  />
  <PublisherImageGenerationPanel
    v-else-if="subStage === 'image_generation'"
    :narrations="narrations"
    :jobs="jobs"
    :upload-image="uploadImage"
  />
  <PublisherPublishMetadataPanel
    v-else-if="subStage === 'publish_metadata'"
    :flow="flow"
    :rows="rows"
    :jobs="jobs"
    :diagnostics="diagnostics"
    :diagnostics-loading="diagnosticsLoading"
    :diagnostics-error="diagnosticsError"
    :load-diagnostics="loadDiagnostics"
    :upload-platform-name="uploadPlatformName"
    :upload-image="uploadImage"
  />
  <PublisherMainPanel
    v-else
    :flow="flow"
    :rows="rows"
    :jobs="jobs"
    :diagnostics="diagnostics"
    :diagnostics-loading="diagnosticsLoading"
    :diagnostics-error="diagnosticsError"
    :load-diagnostics="loadDiagnostics"
    :upload-platform-name="uploadPlatformName"
  />
</template>
