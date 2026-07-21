<script setup>
import { computed } from 'vue'
import PublisherDiagnosticsPanel from './PublisherDiagnosticsPanel.vue'
import PublisherImageTable from './PublisherImageTable.vue'
import { jobOperatorOpId as findJobOperatorOpId, jobPrompt } from './publisherUtils'

const props = defineProps({
  narrations: { type: Array, default: () => [] },
  blessings: { type: Array, default: () => [] },
  jobs: { type: Array, default: () => [] },
  diagnostics: { type: Array, default: () => [] },
  diagnosticsLoading: { type: Boolean, default: false },
  diagnosticsError: { type: String, default: '' },
  operatorDiagnosticsApi: { type: Object, required: true },
  loadDiagnostics: { type: Function, required: true },
  uploadPlatformName: { type: Function, required: true },
  uploadImage: { type: Function, required: true },
})

const narration = computed(() => props.narrations[0] || {})
const blessing = computed(() => props.blessings[0] || {})
const imageItems = computed(() => [
  {
    kind: 'cover',
    label: '封面图',
    ratio: '1:1',
    prompt: jobPrompt(props.jobs, 'generate_cover_image', narration.value.cover_prompt, '1:1'),
    url: narration.value.cover_image_url || '',
    secondaryUrl: narration.value.cover_saved_image_url || '',
  },
  {
    kind: 'background',
    label: '背景图',
    ratio: '4:3',
    prompt: jobPrompt(props.jobs, 'generate_background_image', narration.value.background_prompt, '4:3'),
    url: narration.value.background_image_url || '',
    secondaryUrl: narration.value.background_saved_image_url || '',
  },
].filter(item => item.prompt || item.url))
const blessingItems = computed(() => [
  {
    kind: 'blessing',
    label: '祝福图',
    ratio: '1:1',
    prompt: blessing.value.prompt || jobPrompt(props.jobs, 'generate_blessing_image', '', '1:1'),
    url: blessing.value.image_url || '',
    secondaryUrl: blessing.value.saved_image_url || blessing.value.savedImageUrl || '',
  },
])
const diagnosticItems = computed(() => [
  { key: 'cover', label: '1:1 豆包生成', operatorOpId: jobOperatorOpId('generate_cover_image') },
  { key: 'background', label: '4:3 豆包生成', operatorOpId: jobOperatorOpId('generate_background_image') },
])

function jobOperatorOpId(jobName) {
  return findJobOperatorOpId(props.jobs, jobName)
}
</script>

<template>
  <div class="publisher-panel">
    <section class="flow-section narration-section">
      <h4>图片生成</h4>
      <PublisherImageTable v-if="imageItems.length" :items="imageItems" :upload-image="uploadImage" />
      <PublisherImageTable v-if="blessing.image_url || blessing.prompt" :items="blessingItems" :upload-image="uploadImage" />
      <dl v-if="blessing.id" class="substage-field-grid publisher-blessing-summary">
        <dt>blessing_text</dt>
        <dd>{{ blessing.blessing_text || '-' }}</dd>
        <dt>background_music_url</dt>
        <dd>{{ blessing.background_music_url || '-' }}</dd>
        <dt>video_url</dt>
        <dd>{{ blessing.video_url || '-' }}</dd>
      </dl>
      <pre v-if="narration.error_message" class="flow-stage-error">{{ narration.error_message }}</pre>
      <pre v-if="blessing.error_message" class="flow-stage-error">{{ blessing.error_message }}</pre>
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
