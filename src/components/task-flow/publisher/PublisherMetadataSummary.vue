<script setup>
import { computed, ref } from 'vue'
import { normalizeResourceUrl } from '../../../utils/media'
import { formatTags } from './publisherUtils'

const props = defineProps({
  flow: { type: Object, default: null },
  rows: { type: Array, default: () => [] },
})

const expanded = ref(new Set())
const result = computed(() => props.rows[0] || {})
const taskInfo = computed(() => props.flow?.taskInfo || {})
const comparisonRows = computed(() => [
  { key: 'title', label: '标题', original: taskInfo.value.title || props.flow?.task?.title || '-', generated: taskInfo.value.upload_title || result.value.upload_title || '-' },
  { key: 'description', label: '简介', original: taskInfo.value.source_description || '-', generated: taskInfo.value.upload_description || result.value.upload_description || '-', collapsible: true },
  { key: 'tags', label: '标签', original: formatTags(taskInfo.value.source_tags_json), generated: formatTags(taskInfo.value.upload_tags || result.value.upload_tags) },
])
const completion = computed(() => {
  const status = String(result.value.status || '').toLowerCase()
  if (status === 'success') return { text: '已完成', className: 'status-success' }
  if (status === 'failed') return { text: '失败', className: 'status-failed' }
  if (status === 'running') return { text: '进行中', className: 'status-running' }
  return { text: '未完成', className: 'status-pending' }
})
const coverImages = computed(() => [
  normalizeResourceUrl(result.value.source_cover_url || taskInfo.value.source_thumbnail_url || ''),
  normalizeResourceUrl(result.value.final_cover_url || ''),
])
const showCover = computed(() => {
  const reset = taskInfo.value.reset_cover ?? result.value.reset_cover
  return ![false, null, undefined, 0, '0', 'false', ''].includes(reset)
    || Boolean(result.value.final_cover_url)
})

function isExpanded(key) {
  return expanded.value.has(key)
}

function toggle(key) {
  const next = new Set(expanded.value)
  next.has(key) ? next.delete(key) : next.add(key)
  expanded.value = next
}
</script>

<template>
  <section class="flow-section">
    <h4>投稿信息</h4>
    <div v-if="!rows.length" class="flow-muted">还没有 publisher 结果</div>
    <template v-else>
      <div class="publisher-comparison-table">
        <div class="publisher-comparison-row publisher-comparison-head">
          <strong>字段</strong><strong>原始值</strong><strong>Publisher 生成值</strong><strong>完成状态</strong>
        </div>
        <div v-for="item in comparisonRows" :key="item.key" class="publisher-comparison-row">
          <strong class="publisher-field-name">{{ item.label }}</strong>
          <div v-for="side in ['original', 'generated']" :key="side">
            <p :class="{ 'publisher-description-collapsed': item.collapsible && !isExpanded(`${item.key}-${side}`) }">
              {{ item[side] }}
            </p>
            <button
              v-if="item.collapsible && item[side] !== '-'"
              type="button"
              class="publisher-expand-button"
              @click="toggle(`${item.key}-${side}`)"
            >
              {{ isExpanded(`${item.key}-${side}`) ? '收起' : '展开' }}
            </button>
          </div>
          <div class="publisher-completion-cell">
            <span :class="['stage-job-status', completion.className]">{{ completion.text }}</span>
          </div>
        </div>
      </div>
      <pre v-if="result.error_message" class="flow-stage-error">{{ result.error_message }}</pre>
    </template>
  </section>

  <section v-if="rows.length && showCover" class="flow-section publisher-cover-section">
    <h4>封面</h4>
    <p class="publisher-cover-text"><strong>封面文字</strong>{{ result.cover_text || '-' }}</p>
    <div class="publisher-cover-flow">
      <template v-for="(image, index) in coverImages" :key="index">
        <article class="publisher-cover-card">
          <a v-if="image" :href="image" target="_blank" rel="noreferrer"><img :src="image" alt="" loading="lazy" /></a>
          <div v-else class="publisher-cover-empty">暂无封面</div>
        </article>
        <span v-if="index < coverImages.length - 1" class="publisher-cover-arrow" aria-hidden="true">→</span>
      </template>
    </div>
  </section>
</template>
