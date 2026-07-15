<script setup>
import { ref } from 'vue'
import { normalizeResourceUrl } from '../../../utils/media'
import { copyText } from './publisherUtils'

const props = defineProps({
  items: { type: Array, default: () => [] },
  uploadImage: { type: Function, required: true },
})

const fileInputs = new Map()
const busyByKind = ref({})
const copied = ref('')
const messages = ref({})
const errors = ref({})

function isBusy(kind) {
  return Boolean(busyByKind.value[kind])
}

function setBusy(kind, value) {
  busyByKind.value = { ...busyByKind.value, [kind]: value }
}

function setMessage(kind, value) {
  messages.value = { ...messages.value, [kind]: value }
}

function setError(kind, value) {
  errors.value = { ...errors.value, [kind]: value }
}

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
  if (item.url || isBusy(item.kind)) return
  fileInputs.get(item.kind)?.click()
}

async function upload(item, event) {
  const input = event.target
  const file = input.files?.[0]
  if (!file || isBusy(item.kind)) return
  setBusy(item.kind, true)
  setMessage(item.kind, '')
  setError(item.kind, '')
  try {
    const result = await props.uploadImage(item.kind, file)
    setMessage(item.kind, `${item.label}已上传：${result.width}x${result.height}`)
  } catch (err) {
    setError(item.kind, err instanceof Error ? err.message : String(err))
  } finally {
    setBusy(item.kind, false)
    input.value = ''
  }
}
</script>

<template>
  <div class="publisher-image-table">
    <div class="publisher-image-row publisher-image-head">
      <strong>比例</strong>
      <strong>提示词（点击复制）</strong>
      <strong>图片 1</strong>
      <strong>图片 2</strong>
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
          :disabled="isBusy(item.kind)"
          @click="chooseImage(item)"
        >
          {{ isBusy(item.kind) ? '上传中…' : '点击上传' }}
        </button>
        <input
          :ref="element => setFileInput(item.kind, element)"
          type="file"
          accept="image/*"
          hidden
          @change="upload(item, $event)"
        />
      </div>
      <div class="publisher-image-cell">
        <a
          v-if="item.secondaryUrl"
          :href="normalizeResourceUrl(item.secondaryUrl)"
          target="_blank"
          rel="noreferrer"
          :title="`查看${item.label}保存图`"
        >
          <img :src="normalizeResourceUrl(item.secondaryUrl)" :alt="`${item.label}保存图`" loading="lazy" />
        </a>
        <span v-else class="publisher-image-empty">-</span>
      </div>
      <p v-if="messages[item.kind]" class="publisher-image-feedback narration-manual-success">{{ messages[item.kind] }}</p>
      <p v-if="errors[item.kind]" class="publisher-image-feedback inline-error">{{ errors[item.kind] }}</p>
    </div>
  </div>
</template>
