<script setup>
import { computed } from 'vue'
import PublisherDiagnosticsPanel from './PublisherDiagnosticsPanel.vue'
import PublisherImageTable from './PublisherImageTable.vue'
import { formatTags, jobPrompt } from './publisherUtils'

const props = defineProps({
  flow: { type: Object, default: null },
  rows: { type: Array, default: () => [] },
  jobs: { type: Array, default: () => [] },
  diagnostics: { type: Array, default: () => [] },
  diagnosticsLoading: { type: Boolean, default: false },
  diagnosticsError: { type: String, default: '' },
  loadDiagnostics: { type: Function, required: true },
  uploadPlatformName: { type: Function, required: true },
  uploadImage: { type: Function, required: true },
})

const videoInfo = computed(() => props.flow?.videoInfo || {})
const metadataRows = computed(() => [
  { key: 'title', label: 'Title', value: videoInfo.value.upload_title || '-' },
  { key: 'coverText', label: '封面文字', value: videoInfo.value.cover_text || '-' },
  { key: 'description', label: '简介', value: videoInfo.value.upload_description || '-' },
  { key: 'tags', label: 'Tags', value: formatTags(videoInfo.value.upload_tags) },
])
const images = computed(() => [
  {
    kind: 'vertical',
    label: '竖版封面',
    ratio: '3:4',
    prompt: jobPrompt(props.jobs, 'generate_narration_vertical_cover', '', '3:4'),
    url: videoInfo.value.vertical_cover_url || '',
  },
  {
    kind: 'horizontal',
    label: '横版封面',
    ratio: '4:3',
    prompt: jobPrompt(props.jobs, 'generate_narration_horizontal_cover', '', '4:3'),
    url: videoInfo.value.horizontal_cover_url || '',
  },
])
const diagnosticItems = computed(() => [
  { key: 'vertical', label: '3:4 ChatGPT 生成', operatorOpId: jobOperatorOpId('generate_narration_vertical_cover') },
  { key: 'horizontal', label: '4:3 ChatGPT 生成', operatorOpId: jobOperatorOpId('generate_narration_horizontal_cover') },
])

function jobOperatorOpId(jobName) {
  const job = props.jobs.find(row => row.job_name === jobName || row.jobName === jobName)
  return String(job?.operator_op_id || job?.operatorOpId || job?.operator_run_id || '').trim()
}

</script>

<template>
  <div class="publisher-panel">
    <section class="flow-section narration-section">
      <h4>投稿信息</h4>
      <div class="publisher-generated-table">
        <div class="publisher-generated-row publisher-generated-head"><strong>字段</strong><strong>生成值</strong></div>
        <div v-for="item in metadataRows" :key="item.key" class="publisher-generated-row">
          <strong class="publisher-field-name">{{ item.label }}</strong>
          <div>
            <p>{{ item.value }}</p>
          </div>
        </div>
      </div>
    </section>
    <section class="flow-section narration-section">
      <h4>投稿封面</h4>
      <PublisherImageTable :items="images" :upload-image="uploadImage" />
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
