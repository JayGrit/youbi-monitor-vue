<script setup>
import { ref } from 'vue'
import { normalizeResourceUrl } from '../../../utils/media'
import { copyText } from './publisherUtils'

const props = defineProps({
  items: { type: Array, default: () => [] },
  uploadImage: { type: Function, required: true },
})

const fileInputs = new Map()
const busy = ref('')
const copied = ref('')
const message = ref('')
const error = ref('')

function setFileInput(kind, element) {
  if (element) fileInputs.set(kind, element)
  else fileInputs.delete(kind)
}

async function copyPrompt(item) {
  if (!item.prompt) return
  await copyText(item.prompt)
  copied.value = item.kind
  window.setTimeout(() => {
    if (copied.value === item.kind) copied.value = ''
  }, 1600)
}

function chooseImage(item) {
  if (item.url || busy.value) return
  fileInputs.get(item.kind)?.click()
}

async function upload(item, event) {
  const input = event.target
  const file = input.files?.[0]
  if (!file || busy.value) return
  busy.value = item.kind
  message.value = ''
  error.value = ''
  try {
    const result = await props.uploadImage(item.kind, file)
    message.value = `${item.label}已上传：${result.width}x${result.height}`
  } catch (err) {
    error.value = err instanceof Error ? err.message : String(err)
  } finally {
    busy.value = ''
    input.value = ''
  }
}
</script>

<template>
  <div class="publisher-image-table">
    <div class="publisher-image-row publisher-image-head">
      <strong>比例</strong>
      <strong>提示词（点击复制）</strong>
      <strong>图片</strong>
    </div>
    <div v-for="item in items" :key="item.kind" class="publisher-image-row">
      <strong class="publisher-image-ratio">{{ item.ratio }}</strong>
      <button
        type="button"
        class="publisher-prompt-cell"
        :disabled="!item.prompt"
        @click="copyPrompt(item)"
      >
        <span>{{ item.prompt || '暂无提示词' }}</span>
        <small v-if="copied === item.kind">已复制</small>
      </button>
      <div class="publisher-image-cell">
        <a
          v-if="item.url"
          :href="normalizeResourceUrl(item.url)"
          target="_blank"
          rel="noreferrer"
          :title="`查看${item.label}`"
        >
          <img :src="normalizeResourceUrl(item.url)" :alt="item.label" loading="lazy" />
        </a>
        <button
          v-else
          type="button"
          class="publisher-image-upload"
          :disabled="Boolean(busy)"
          @click="chooseImage(item)"
        >
          {{ busy === item.kind ? '上传中…' : '点击上传' }}
        </button>
        <input
          :ref="element => setFileInput(item.kind, element)"
          type="file"
          accept="image/*"
          hidden
          @change="upload(item, $event)"
        />
      </div>
    </div>
  </div>
  <p v-if="message" class="narration-manual-success">{{ message }}</p>
  <p v-if="error" class="inline-error">{{ error }}</p>
</template>
