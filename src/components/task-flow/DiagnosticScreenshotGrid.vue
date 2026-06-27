<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { formatTime, isSameDate, parseLocalDateTime } from '../../utils/format'
import { normalizeResourceUrl } from '../../utils/media'

const props = defineProps({
  rows: { type: Array, default: () => [] },
  emptyText: { type: String, default: '没有诊断截图' },
  titlePrefix: { type: Function, default: null },
})

const screenshotObjectUrls = ref({})
const screenshotLoadingUrls = ref({})
const screenshotErrors = ref({})
const previewRow = ref(null)
const previewIndex = computed(() => {
  if (!previewRow.value) return -1
  return visibleRows.value.findIndex(row => screenshotKey(row) === screenshotKey(previewRow.value))
})

const visibleRows = computed(() => [...props.rows].sort(compareDiagnostics))

watch(
  visibleRows,
  rows => {
    for (const row of rows) {
      downloadScreenshot(row)
    }
  },
  { immediate: true }
)

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
  for (const url of Object.values(screenshotObjectUrls.value)) {
    URL.revokeObjectURL(url)
  }
})

function compareDiagnostics(left, right) {
  return diagnosticStep(left) - diagnosticStep(right)
    || diagnosticCreatedAt(left) - diagnosticCreatedAt(right)
    || Number(left.id || 0) - Number(right.id || 0)
}

function diagnosticStep(row) {
  const step = Number(row.stepIndex ?? row.step_index)
  if (Number.isFinite(step)) return step
  return Number.MAX_SAFE_INTEGER
}

function diagnosticCreatedAt(row) {
  return Date.parse(row.createdAt || row.created_at || '') || 0
}

function diagnosticOpId(row) {
  return row.opId || row.op_id || row.runId || row.run_id || ''
}

function diagnosticTitle(row) {
  return [
    props.titlePrefix ? props.titlePrefix(row) : '',
    row.stepName || row.step_name || '诊断截图',
  ].filter(Boolean).join(' / ')
}

function diagnosticMeta(row) {
  const width = row.screenshotWidth || row.screenshot_width
  const height = row.screenshotHeight || row.screenshot_height
  return [
    row.pageTitle || row.page_title || '',
    relativeTime(row.createdAt || row.created_at),
    width && height ? `${width}x${height}` : '',
  ].filter(Boolean).join(' · ')
}

function screenshotUrl(row) {
  return normalizeResourceUrl(row.screenshotUrl || row.screenshot_url || '')
}

function htmlUrl(row) {
  return normalizeResourceUrl(row.htmlUrl || row.html_url || '')
}

function diagnosticError(row) {
  return row.errorMessage || row.error_message || ''
}

function screenshotKey(row) {
  return String(row.id || screenshotUrl(row))
}

function renderedScreenshotUrl(row) {
  return screenshotObjectUrls.value[screenshotKey(row)] || ''
}

function screenshotLoading(row) {
  return Boolean(screenshotLoadingUrls.value[screenshotKey(row)])
}

function screenshotError(row) {
  return screenshotErrors.value[screenshotKey(row)] || ''
}

function handleKeydown(event) {
  if (event.key === 'Escape') {
    previewRow.value = null
  } else if (event.key === 'ArrowLeft') {
    movePreview(-1)
  } else if (event.key === 'ArrowRight') {
    movePreview(1)
  }
}

function movePreview(offset) {
  if (!previewRow.value || !visibleRows.value.length) return
  const current = previewIndex.value >= 0 ? previewIndex.value : 0
  const next = (current + offset + visibleRows.value.length) % visibleRows.value.length
  previewRow.value = visibleRows.value[next]
}

async function downloadScreenshot(row) {
  const url = screenshotUrl(row)
  const key = screenshotKey(row)
  if (!url || screenshotObjectUrls.value[key] || screenshotLoadingUrls.value[key]) return
  screenshotLoadingUrls.value = { ...screenshotLoadingUrls.value, [key]: true }
  screenshotErrors.value = { ...screenshotErrors.value, [key]: '' }
  try {
    const response = await fetch(url, { mode: 'cors', cache: 'no-store' })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const blob = await response.blob()
    if (!blob.size) throw new Error('empty image')
    const oldUrl = screenshotObjectUrls.value[key]
    if (oldUrl) URL.revokeObjectURL(oldUrl)
    screenshotObjectUrls.value = { ...screenshotObjectUrls.value, [key]: URL.createObjectURL(blob) }
  } catch (err) {
    screenshotErrors.value = {
      ...screenshotErrors.value,
      [key]: err instanceof Error ? err.message : String(err),
    }
  } finally {
    const next = { ...screenshotLoadingUrls.value }
    delete next[key]
    screenshotLoadingUrls.value = next
  }
}

function relativeTime(value) {
  const date = parseLocalDateTime(value)
  if (!date) return ''
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const beforeYesterday = new Date(today)
  beforeYesterday.setDate(beforeYesterday.getDate() - 2)
  if (isSameDate(date, today)) return `今天 ${formatTime(date)}`
  if (isSameDate(date, yesterday)) return `昨天 ${formatTime(date)}`
  if (isSameDate(date, beforeYesterday)) return `前天 ${formatTime(date)}`
  return formatTime(date)
}
</script>

<template>
  <p v-if="!visibleRows.length" class="flow-muted">{{ emptyText }}</p>
  <div v-else class="diagnostic-grid">
    <article
      v-for="row in visibleRows"
      :key="row.id || `${diagnosticOpId(row)}-${row.stepIndex || row.step_index}-${screenshotUrl(row)}`"
      class="diagnostic-item"
    >
      <div class="media-title">
        <strong>{{ diagnosticTitle(row) }}</strong>
        <span>
          <a v-if="screenshotUrl(row)" :href="screenshotUrl(row)" target="_blank" rel="noreferrer">截图</a>
          <a v-if="htmlUrl(row)" :href="htmlUrl(row)" target="_blank" rel="noreferrer">HTML</a>
        </span>
      </div>
      <p v-if="screenshotLoading(row)" class="flow-muted">正在下载图片</p>
      <button
        v-else-if="renderedScreenshotUrl(row)"
        type="button"
        class="diagnostic-image-link"
        aria-label="查看诊断截图大图"
        @click="previewRow = row"
      >
        <img :src="renderedScreenshotUrl(row)" loading="lazy" alt="" />
      </button>
      <p v-else-if="screenshotError(row)" class="flow-muted">图片下载失败：{{ screenshotError(row) }}</p>
      <p>{{ diagnosticMeta(row) }}</p>
      <pre v-if="diagnosticError(row)" class="flow-stage-error">{{ diagnosticError(row) }}</pre>
    </article>
  </div>
  <Teleport to="body">
    <div v-if="previewRow" class="diagnostic-preview-backdrop" @click.self="previewRow = null">
      <section class="diagnostic-preview-modal" role="dialog" aria-modal="true" aria-label="诊断截图大图">
        <header>
          <strong>{{ diagnosticTitle(previewRow) }}</strong>
          <span>{{ previewIndex + 1 }} / {{ visibleRows.length }}</span>
          <button type="button" @click="previewRow = null">关闭</button>
        </header>
        <div class="diagnostic-preview-body">
          <button type="button" class="diagnostic-preview-nav diagnostic-preview-prev" @click="movePreview(-1)">&lsaquo;</button>
          <img :src="renderedScreenshotUrl(previewRow)" :alt="diagnosticTitle(previewRow)" />
          <button type="button" class="diagnostic-preview-nav diagnostic-preview-next" @click="movePreview(1)">&rsaquo;</button>
        </div>
      </section>
    </div>
  </Teleport>
</template>
