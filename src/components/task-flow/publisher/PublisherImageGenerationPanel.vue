<script setup>
import { computed } from 'vue'
import PublisherDiagnosticsPanel from './PublisherDiagnosticsPanel.vue'
import PublisherImageTable from './PublisherImageTable.vue'
import { jobPrompt } from './publisherUtils'

const props = defineProps({
  narrations: { type: Array, default: () => [] },
  jobs: { type: Array, default: () => [] },
  diagnostics: { type: Array, default: () => [] },
  diagnosticsLoading: { type: Boolean, default: false },
  diagnosticsError: { type: String, default: '' },
  loadDiagnostics: { type: Function, required: true },
  uploadPlatformName: { type: Function, required: true },
  uploadImage: { type: Function, required: true },
})

const narration = computed(() => props.narrations[0] || {})
const imageItems = computed(() => [
  {
    kind: 'cover',
    label: '封面图',
    ratio: '1:1',
    prompt: jobPrompt(props.jobs, 'generate_cover_image', narration.value.cover_prompt, '1:1'),
    url: narration.value.cover_image_url || '',
  },
  {
    kind: 'background',
    label: '背景图',
    ratio: '4:3',
    prompt: jobPrompt(props.jobs, 'generate_background_image', narration.value.background_prompt, '4:3'),
    url: narration.value.background_image_url || '',
  },
])
const diagnosticItems = computed(() => [
  { key: 'cover', label: '1:1 豆包生成', operatorOpId: jobOperatorOpId('generate_cover_image') },
  { key: 'background', label: '4:3 豆包生成', operatorOpId: jobOperatorOpId('generate_background_image') },
])

function jobOperatorOpId(jobName) {
  const job = props.jobs.find(row => row.job_name === jobName || row.jobName === jobName)
  return String(job?.operator_op_id || job?.operatorOpId || job?.operator_run_id || '').trim()
}
</script>

<template>
  <div class="publisher-panel">
    <section class="flow-section narration-section">
      <h4>图片生成</h4>
      <PublisherImageTable :items="imageItems" :upload-image="uploadImage" />
      <pre v-if="narration.error_message" class="flow-stage-error">{{ narration.error_message }}</pre>
    </section>
    <PublisherDiagnosticsPanel
      :diagnostics="diagnostics"
      :items="diagnosticItems"
      :loading="diagnosticsLoading"
      :error="diagnosticsError"
      :load="loadDiagnostics"
      :upload-platform-name="uploadPlatformName"
    />
  </div>
</template>
