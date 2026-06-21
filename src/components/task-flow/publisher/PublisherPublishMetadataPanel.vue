<script setup>
import { computed } from 'vue'
import PublisherDiagnosticsPanel from './PublisherDiagnosticsPanel.vue'
import PublisherImageTable from './PublisherImageTable.vue'
import { formatTags, jobPrompt, jobResult } from './publisherUtils'

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
const result = computed(() => props.rows[0] || {})
const generated = computed(() => ({
  ...jobResult(props.jobs, 'generate_narration_upload_title'),
  ...jobResult(props.jobs, 'generate_narration_upload_description'),
  ...jobResult(props.jobs, 'generate_narration_upload_tags'),
  ...jobResult(props.jobs, 'generate_narration_cover_text'),
}))
const metadataRows = computed(() => [
  { key: 'title', label: 'Title', value: videoInfo.value.upload_title || result.value.upload_title || generated.value.upload_title || '-' },
  { key: 'coverText', label: '封面文字', value: videoInfo.value.cover_text || result.value.cover_text || generated.value.cover_text || '-' },
  { key: 'description', label: '简介', value: videoInfo.value.upload_description || result.value.upload_description || generated.value.upload_description || '-' },
  { key: 'tags', label: 'Tags', value: formatTags(videoInfo.value.upload_tags || result.value.upload_tags || generated.value.upload_tags) },
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
const diagnosticItems = [
  { key: 'vertical', label: '3:4 ChatGPT 生成', platform: 'chatgpt', jobName: 'generate_narration_vertical_cover', ratio: '3:4' },
  { key: 'horizontal', label: '4:3 ChatGPT 生成', platform: 'chatgpt', jobName: 'generate_narration_horizontal_cover', ratio: '4:3' },
]

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
