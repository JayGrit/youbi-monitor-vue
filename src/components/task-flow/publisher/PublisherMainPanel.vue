<script setup>
import { computed } from 'vue'
import StageJobsPanel from '../StageJobsPanel.vue'
import PublisherDiagnosticsPanel from './PublisherDiagnosticsPanel.vue'
import PublisherMetadataSummary from './PublisherMetadataSummary.vue'

const props = defineProps({
  flow: { type: Object, default: null },
  rows: { type: Array, default: () => [] },
  jobs: { type: Array, default: () => [] },
  diagnostics: { type: Array, default: () => [] },
  diagnosticsLoading: { type: Boolean, default: false },
  diagnosticsError: { type: String, default: '' },
  loadDiagnostics: { type: Function, required: true },
  uploadPlatformName: { type: Function, required: true },
})

const mainJobs = computed(() => props.jobs.filter(job => !job.sub_stage || job.sub_stage === 'main'))
</script>

<template>
  <div class="publisher-panel">
    <PublisherMetadataSummary :flow="flow" :rows="rows" />
    <StageJobsPanel v-if="mainJobs.length" title="Publisher 执行步骤" :rows="mainJobs" />
    <PublisherDiagnosticsPanel
      :diagnostics="diagnostics"
      :loading="diagnosticsLoading"
      :error="diagnosticsError"
      :load="loadDiagnostics"
      :upload-platform-name="uploadPlatformName"
    />
  </div>
</template>
