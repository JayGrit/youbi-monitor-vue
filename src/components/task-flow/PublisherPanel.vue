<script setup>
import { computed } from 'vue'
import { statusText } from '../../domain/constants'
import { normalizeResourceUrl } from '../../utils/media'

const props = defineProps({
  stage: { type: Object, default: null },
  rows: { type: Array, default: () => [] },
  media: { type: Array, default: () => [] },
})

const result = computed(() => props.rows[0] || {})
const resultDetail = computed(() => {
  try {
    const value = result.value.result_json
    return value ? JSON.parse(value) : {}
  } catch {
    return {}
  }
})
const images = computed(() => {
  const byKey = new Map()
  function add(name, url) {
    const normalized = normalizeResourceUrl(url)
    if (!normalized || byKey.has(normalized)) return
    byKey.set(normalized, { name, url: normalized })
  }
  add('source_cover_url', result.value.source_cover_url)
  add('clean_cover_url', result.value.clean_cover_url)
  add('final_cover_url', result.value.final_cover_url)
  for (const item of props.media || []) {
    if (item?.kind === 'image') {
      add(item.name || item.objectName || 'image', item.url)
    }
  }
  return [...byKey.values()]
})

const metaRows = computed(() => {
  const row = result.value
  return [
    ['status', statusText[row.status] || row.status || '-'],
    ['upload_title', row.upload_title || '-'],
    ['upload_description', row.upload_description || '-'],
    ['upload_tags', row.upload_tags || '-'],
    ['cover_text', row.cover_text || '-'],
    ['source_subtitle_txt_url', row.source_subtitle_txt_url || '-'],
  ]
})

const publisherTasks = computed(() => {
  const row = result.value
  const detail = resultDetail.value
  const runCover = detail.run_cover === true
  return [
    {
      name: '投稿标题',
      status: row.upload_title ? 'success' : props.stage?.status || 'pending',
      detail: row.upload_title || '',
    },
    {
      name: '封面文案',
      status: row.cover_text ? 'success' : props.stage?.status || 'pending',
      detail: row.cover_text || '',
    },
    {
      name: '去字封面',
      status: row.clean_cover_url ? 'success' : (runCover ? props.stage?.status || 'pending' : 'skipped'),
      detail: row.clean_cover_url || detail.cover_skip_reason || '',
    },
    {
      name: '最终封面',
      status: row.final_cover_url ? 'success' : (runCover ? props.stage?.status || 'pending' : 'skipped'),
      detail: row.final_cover_url || detail.cover_skip_reason || '',
    },
  ]
})
</script>

<template>
  <div class="flow-section publisher-panel">
    <h4>Publisher 结果</h4>
    <div class="publisher-task-grid">
      <article
        v-for="item in publisherTasks"
        :key="item.name"
        :class="['publisher-task-card', `status-${item.status}`]"
      >
        <strong>{{ item.name }}</strong>
        <span>{{ statusText[item.status] || item.status || '-' }}</span>
        <p v-if="item.detail">{{ item.detail }}</p>
      </article>
    </div>
    <div v-if="!rows.length" class="flow-muted">还没有 publisher 结果</div>
    <template v-else>
      <dl class="publisher-meta">
        <div v-for="[name, value] in metaRows" :key="name" class="publisher-meta-row">
          <dt>{{ name }}</dt>
          <dd>{{ value }}</dd>
        </div>
      </dl>
      <pre v-if="result.error_message" class="flow-stage-error">{{ result.error_message }}</pre>
      <pre v-if="result.result_json" class="publisher-result-json">{{ result.result_json }}</pre>
      <div v-if="images.length" class="publisher-image-grid">
        <article v-for="image in images" :key="image.url" class="publisher-image-card">
          <div class="media-title">
            <strong>{{ image.name }}</strong>
          </div>
          <img :src="image.url" alt="" loading="lazy" />
        </article>
      </div>
    </template>
  </div>
</template>
