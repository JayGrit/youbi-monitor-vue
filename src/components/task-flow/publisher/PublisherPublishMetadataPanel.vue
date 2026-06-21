<script setup>
import { computed, ref } from 'vue'
import StageJobsPanel from '../StageJobsPanel.vue'
import PublisherDiagnosticsPanel from './PublisherDiagnosticsPanel.vue'
import PublisherMetadataSummary from './PublisherMetadataSummary.vue'
import { copyText, jobPrompt, jobsNamed } from './publisherUtils'

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

const files = ref({ vertical: null, horizontal: null })
const busy = ref('')
const message = ref('')
const error = ref('')
const copied = ref('')
const videoInfo = computed(() => props.flow?.videoInfo || {})
const metadataJobNames = [
  'generate_narration_upload_title',
  'generate_narration_upload_description',
  'generate_narration_upload_tags',
  'generate_narration_cover_text',
  'generate_narration_image_prompt',
  'generate_narration_vertical_cover',
  'generate_narration_horizontal_cover',
  'generate_upload_title',
  'generate_upload_description',
  'generate_cover_text',
]
const metadataJobs = computed(() => jobsNamed(props.jobs, metadataJobNames))
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

async function copyPrompt(item) {
  await copyText(item.prompt)
  copied.value = item.kind
  window.setTimeout(() => {
    if (copied.value === item.kind) copied.value = ''
  }, 1600)
}

function selectImage(kind, event) {
  files.value = { ...files.value, [kind]: event.target.files?.[0] || null }
  message.value = ''
  error.value = ''
}

async function upload(item) {
  const file = files.value[item.kind]
  if (!file || busy.value) return
  busy.value = item.kind
  message.value = ''
  error.value = ''
  try {
    const result = await props.uploadImage(item.kind, file)
    files.value = { ...files.value, [item.kind]: null }
    message.value = `${item.label}已上传：${result.width}x${result.height}`
  } catch (err) {
    error.value = err instanceof Error ? err.message : String(err)
  } finally {
    busy.value = ''
  }
}
</script>

<template>
  <div class="publisher-panel">
    <PublisherMetadataSummary :flow="flow" :rows="rows" />
    <section class="flow-section narration-section">
      <h4>投稿封面人工补交</h4>
      <div class="narration-manual-image-grid">
        <section v-for="item in images" :key="item.kind" class="narration-manual-card">
          <div class="narration-manual-head">
            <div>
              <strong>人工生成{{ item.label }}</strong>
              <span>要求精确 {{ item.ratio }}</span>
            </div>
            <button type="button" :disabled="!item.prompt" @click="copyPrompt(item)">
              {{ copied === item.kind ? '已复制' : '复制完整绘图提示词' }}
            </button>
          </div>
          <p v-if="item.prompt" class="narration-manual-prompt">{{ item.prompt }}</p>
          <p v-else class="flow-muted">该阶段尚未保存绘图提示词。</p>
          <input type="file" accept="image/*" @change="selectImage(item.kind, $event)" />
          <div class="narration-manual-actions">
            <button type="button" :disabled="Boolean(busy) || !files[item.kind] || !item.prompt" @click="upload(item)">
              {{ busy === item.kind ? '校验并上传中' : `上传${item.label}` }}
            </button>
            <span v-if="item.url" class="narration-manual-complete">已入库</span>
          </div>
        </section>
      </div>
      <p v-if="message" class="narration-manual-success">{{ message }}</p>
      <p v-if="error" class="inline-error">{{ error }}</p>
    </section>
    <StageJobsPanel v-if="metadataJobs.length" title="投稿元数据执行步骤" :rows="metadataJobs" />
    <PublisherDiagnosticsPanel
      :diagnostics="diagnostics"
      :loading="diagnosticsLoading"
      :error="diagnosticsError"
      :load="loadDiagnostics"
      :upload-platform-name="uploadPlatformName"
    />
  </div>
</template>
