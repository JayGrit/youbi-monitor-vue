<script setup>
import { computed } from 'vue'
import PublisherDiagnosticsPanel from './PublisherDiagnosticsPanel.vue'
import PublisherImageTable from './PublisherImageTable.vue'
import { jobOperatorOpId as findJobOperatorOpId, jobPrompt } from './publisherUtils'

const props = defineProps({
  flow: { type: Object, default: null },
  jobs: { type: Array, default: () => [] },
  diagnostics: { type: Array, default: () => [] },
  diagnosticsLoading: { type: Boolean, default: false },
  diagnosticsError: { type: String, default: '' },
  operatorDiagnosticsApi: { type: Object, required: true },
  loadDiagnostics: { type: Function, required: true },
  uploadPlatformName: { type: Function, required: true },
  uploadImage: { type: Function, required: true },
})

const taskInfo = computed(() => props.flow?.taskInfo || {})
const images = computed(() => [
  {
    kind: 'cover_16_9',
    label: '16:9 封面',
    ratio: '16:9',
    prompt: jobPrompt(props.jobs, 'generate_dubbing_chunk_aligned_cover', '', '16:9'),
    url: taskInfo.value.cover_16_9 || '',
    uploadable: false,
  },
  {
    kind: 'cover_4_3',
    label: '4:3 封面',
    ratio: '4:3',
    prompt: jobPrompt(props.jobs, 'generate_dubbing_chunk_aligned_cover_4_3', '', '4:3'),
    url: taskInfo.value.cover_4_3 || '',
    uploadable: false,
  },
])
const diagnosticItems = computed(() => [
  { key: 'cover_16_9', label: '16:9 ChatGPT 生成', operatorOpId: jobOperatorOpId('generate_dubbing_chunk_aligned_cover') },
  { key: 'cover_4_3', label: '4:3 ChatGPT 生成', operatorOpId: jobOperatorOpId('generate_dubbing_chunk_aligned_cover_4_3') },
])

function jobOperatorOpId(jobName) {
  return findJobOperatorOpId(props.jobs, jobName)
}
</script>

<template>
  <div class="publisher-panel">
    <section class="flow-section narration-section">
      <h4>重绘封面</h4>
      <PublisherImageTable :items="images" :upload-image="uploadImage" />
    </section>
    <PublisherDiagnosticsPanel
      :api="operatorDiagnosticsApi"
      :diagnostics="diagnostics"
      :items="diagnosticItems"
      :loading="diagnosticsLoading"
      :error="diagnosticsError"
      :load="loadDiagnostics"
      :upload-platform-name="uploadPlatformName"
    />
  </div>
</template>
