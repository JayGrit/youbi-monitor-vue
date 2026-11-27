<script setup>
import { computed, ref, watch } from 'vue'
import { requestJson } from '../../api/http'
import { normalizeResourceUrl } from '../../utils/media'

const props = defineProps({
  taskId: { type: String, required: true },
  taskStatus: { type: String, default: '' },
  gateStatus: { type: String, default: '' },
})
const emit = defineEmits(['released'])
const record = ref(null)
const lines = ref(['', '', ''])
const error = ref('')
const saving = ref(false)
const editing = ref(false)
const coverFailed = ref(false)
const titleLines = computed(() => lines.value.map(line => line.trim()).filter(Boolean))
const cover = computed(() => normalizeResourceUrl(record.value?.originalCover || ''))
const endpoint = `${import.meta.env.BASE_URL}distributor-api/tasks/${encodeURIComponent(props.taskId)}/podcast-title-release`

async function load() {
  try {
    const row = await requestJson(endpoint)
    if (record.value?.podcastId && !row.podcastId) return
    record.value = row
    error.value = ''
    if (!editing.value || row.podcastId) {
      const result = (row.approvedTitle || row.generatedTitle || '').split(/\r?\n|\\n/)
      lines.value = [result[0] || '', result[1] || '', result[2] || '']
    }
  } catch (err) {
    error.value = err.message
  }
}

async function release() {
  if (saving.value || titleLines.value.length < 2) return
  saving.value = true
  error.value = ''
  try {
    const approvedTitle = titleLines.value.join('\n')
    const result = await requestJson(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ titleLines: titleLines.value }),
    })
    record.value = { ...record.value, approvedTitle, podcastId: result.podcastId }
    lines.value = [...approvedTitle.split('\n'), ''].slice(0, 3)
    editing.value = false
    emit('released')
  } catch (err) {
    error.value = err.message
  } finally {
    saving.value = false
  }
}

watch([() => props.taskStatus, () => props.gateStatus], load, { immediate: true })
</script>

<template>
  <section v-if="record?.generatedTitle || error" class="title-review">
    <div class="review-source">
      <img v-if="cover && !coverFailed" :src="cover" alt="原视频封面" @error="coverFailed = true" />
      <div v-else class="cover-placeholder">原视频封面不可用</div>
      <div>
        <span class="review-label">原标题</span>
        <p>{{ record?.originalTitle || '—' }}</p>
      </div>
    </div>
    <form class="review-form" @submit.prevent="release">
      <h3>{{ record?.podcastId ? '已放行标题' : '编辑输出标题并放行' }}</h3>
      <label v-for="(_, index) in lines" :key="index">
        <span>第 {{ index + 1 }} 行</span>
        <input
          v-model="lines[index]"
          type="text"
          :placeholder="index === 2 ? '可选' : ''"
          :disabled="saving || !record || !!record.podcastId || record.status !== 'pending'"
          @input="editing = true"
        />
      </label>
      <div class="review-actions">
        <span v-if="record?.podcastId" role="status">已提交准入 · podcast-{{ record.podcastId }}</span>
        <button v-else class="review-button" type="submit"
          :disabled="saving || record?.status !== 'pending' || titleLines.length < 2">
          {{ saving ? '正在放行…' : '放行并提交准入' }}
        </button>
        <span v-if="!record?.podcastId && titleLines.length < 2" class="review-label">填写两行或三行</span>
      </div>
      <p v-if="error" class="review-error" role="alert">{{ error }}</p>
    </form>
  </section>
</template>

<style scoped>
.title-review {
  display: grid;
  grid-template-columns: minmax(0, .95fr) minmax(0, 1fr);
  gap: 24px;
  margin: 12px 0;
  padding: 18px;
  background: white;
  border: 1px solid #dbe3ef;
  border-radius: 12px;
}
.review-source { display: grid; grid-template-columns: minmax(100px, 42%) 1fr; gap: 14px; align-items: start; }
.review-source img, .cover-placeholder { width: 100%; aspect-ratio: 16 / 9; border-radius: 8px; object-fit: cover; }
.cover-placeholder { display: grid; place-items: center; background: #f3f6fa; color: #617189; font-size: 13px; }
.review-source p, .review-form h3, .review-error { margin: 4px 0 0; }
.review-label, label span { color: #52637a; font-size: 13px; }
.review-form { display: grid; gap: 9px; min-width: 0; }
.review-form h3 { font-size: 16px; }
.review-form label { display: grid; grid-template-columns: 58px 1fr; align-items: center; gap: 8px; }
.review-form input {
  box-sizing: border-box;
  width: 100%;
  min-width: 0;
  border: 1px solid #becddd;
  border-radius: 6px;
  padding: 8px 10px;
  font: inherit;
  background: #fff;
  color: #16243b;
}
.review-form input:focus-visible { outline: 2px solid #3269b6; outline-offset: 1px; }
.review-actions { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
.review-button { background: #245bae; color: white; border: 0; border-radius: 7px; padding: 8px 13px; cursor: pointer; }
.review-button:disabled { opacity: .55; cursor: default; }
.review-error { color: #a42b31; }
@media (max-width: 760px) {
  .title-review { grid-template-columns: 1fr; gap: 16px; }
}
</style>
