<script setup>
import { computed, ref } from 'vue'
import { normalizeResourceUrl } from '../../../utils/media'
import StageJobsPanel from '../StageJobsPanel.vue'
import { copyText, jobPrompt, jobsNamed } from './publisherUtils'

const props = defineProps({
  narrations: { type: Array, default: () => [] },
  jobs: { type: Array, default: () => [] },
  uploadImage: { type: Function, required: true },
})

const files = ref({ cover: null, background: null })
const busy = ref('')
const message = ref('')
const error = ref('')
const copied = ref('')
const narration = computed(() => props.narrations[0] || {})
const imageJobNames = [
  'generate_cover_prompt',
  'generate_cover_image',
  'generate_background_prompt',
  'generate_background_image',
  'generate_title_text',
]
const imageJobs = computed(() => jobsNamed(props.jobs, imageJobNames))
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
const generatedImages = computed(() => [
  ['封面图', narration.value.cover_image_url],
  ['背景图', narration.value.background_image_url],
  ['牛皮纸背景', narration.value.kraft_background_image_url],
  ['标题文字', narration.value.title_text_image_url],
].map(([label, url]) => ({ label, url: normalizeResourceUrl(url || '') })).filter(item => item.url))

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
    <section class="flow-section narration-section">
      <h4>图片生成</h4>
      <div class="narration-manual-image-grid">
        <section v-for="item in imageItems" :key="item.kind" class="narration-manual-card">
          <div class="narration-manual-head">
            <div>
              <strong>人工生成{{ item.label }}</strong>
              <span>要求精确 {{ item.ratio }}</span>
            </div>
            <button type="button" :disabled="!item.prompt" @click="copyPrompt(item)">
              {{ copied === item.kind ? '已复制' : '复制绘图提示词' }}
            </button>
          </div>
          <p v-if="item.prompt" class="narration-manual-prompt">{{ item.prompt }}</p>
          <p v-else class="flow-muted">提示词尚未生成</p>
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
      <div v-if="generatedImages.length" class="narration-image-grid">
        <figure v-for="item in generatedImages" :key="item.label">
          <a :href="item.url" target="_blank" rel="noreferrer"><img :src="item.url" :alt="item.label" loading="lazy" /></a>
          <figcaption>{{ item.label }}</figcaption>
        </figure>
      </div>
      <details v-if="narration.cover_prompt"><summary>封面提示词</summary><p>{{ narration.cover_prompt }}</p></details>
      <details v-if="narration.background_prompt"><summary>背景提示词</summary><p>{{ narration.background_prompt }}</p></details>
      <pre v-if="narration.error_message" class="flow-stage-error">{{ narration.error_message }}</pre>
    </section>
    <StageJobsPanel v-if="imageJobs.length" title="图片生成执行步骤" :rows="imageJobs" />
  </div>
</template>
