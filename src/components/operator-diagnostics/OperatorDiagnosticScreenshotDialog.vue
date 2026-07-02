<script setup>
import { computed, nextTick, onUnmounted, ref, watch } from 'vue'
import { isSameDate, pad2, parseLocalDateTime } from '../../utils/format'
import { diagnosticArtifactUrl, normalizeResourceUrl } from '../../utils/media'

const props = defineProps({
  api: { type: Object, required: true },
  open: { type: Boolean, default: false },
  task: { type: Object, default: null },
  title: { type: String, default: '诊断截图' },
})

const emit = defineEmits(['close'])

const pageSize = 10000
const rows = ref([])
const total = ref(0)
const loading = ref(false)
const error = ref('')
const previewIndex = ref(-1)
const screenshotObjectUrls = ref({})
const screenshotLoadingUrls = ref({})
const screenshotErrors = ref({})
let requestToken = 0

const opId = computed(() => props.task?.opId || props.task?.op_id || props.task?.runId || props.task?.run_id || '')
const sortedRows = computed(() => [...rows.value].sort(compareDiagnostics))
const previewRow = computed(() => sortedRows.value[previewIndex.value] || null)

watch(
  () => props.open,
  async isOpen => {
    if (!isOpen) {
      previewIndex.value = -1
      window.removeEventListener('keydown', handleKeydown)
      return
    }
    window.addEventListener('keydown', handleKeydown)
    await nextTick()
    await loadFirstPage()
  }
)

watch(
  sortedRows,
  items => {
    for (const row of items) {
      downloadScreenshot(row)
    }
  },
  { immediate: true }
)

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
  for (const url of Object.values(screenshotObjectUrls.value)) {
    URL.revokeObjectURL(url)
  }
})

async function loadFirstPage() {
  rows.value = []
  total.value = 0
  previewIndex.value = -1
  if (!opId.value) {
    error.value = '缺少 op_id'
    return
  }
  await loadPage(1)
}

async function loadPage(nextPage) {
  const token = ++requestToken
  loading.value = true
  error.value = ''
  try {
    const response = await props.api.getDiagnostics(opId.value, { page: nextPage, limit: pageSize })
    if (token !== requestToken) return
    rows.value = response.items || []
    total.value = Number(response.total || 0)
  } catch (err) {
    if (token === requestToken) error.value = err instanceof Error ? err.message : String(err)
  } finally {
    if (token === requestToken) {
      loading.value = false
    }
  }
}

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

function diagnosticTitle(row) {
  return row.stepName || row.step_name || '诊断截图'
}

function diagnosticMeta(row) {
  return [
    row.pageTitle || row.page_title || '',
    relativeTime(row.createdAt || row.created_at),
  ].filter(Boolean).join(' · ')
}

function screenshotUrl(row) {
  return diagnosticArtifactUrl(row, 'screenshot') || normalizeResourceUrl(row.screenshotUrl || row.screenshot_url || '')
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

function openPreview(row) {
  const index = sortedRows.value.findIndex(item => screenshotKey(item) === screenshotKey(row))
  previewIndex.value = Math.max(0, index)
}

function closePreview() {
  previewIndex.value = -1
}

function movePreview(offset) {
  if (previewIndex.value < 0 || !sortedRows.value.length) return
  const length = sortedRows.value.length
  previewIndex.value = (previewIndex.value + offset + length) % length
}

function handleKeydown(event) {
  if (!props.open) return
  if (event.key === 'Escape') {
    if (previewIndex.value >= 0) closePreview()
    else emit('close')
  } else if (event.key === 'ArrowLeft') {
    movePreview(-1)
  } else if (event.key === 'ArrowRight') {
    movePreview(1)
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
  const timeText = `${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}`
  if (isSameDate(date, today)) return `今天 ${timeText}`
  if (isSameDate(date, yesterday)) return `昨天 ${timeText}`
  if (isSameDate(date, beforeYesterday)) return `前天 ${timeText}`
  return `${pad2(date.getMonth() + 1)}-${pad2(date.getDate())} ${timeText}`
}
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="operator-screenshot-backdrop" @click.self="emit('close')">
      <section class="operator-screenshot-modal" role="dialog" aria-modal="true" :aria-label="title">
        <header class="operator-screenshot-head">
          <div>
            <strong>{{ title }}</strong>
            <span>{{ opId || '-' }}<template v-if="total"> · {{ sortedRows.length }} / {{ total }}</template></span>
          </div>
          <button type="button" @click="emit('close')">关闭</button>
        </header>

        <div v-if="loading" class="operator-screenshot-state">正在加载诊断截图</div>
        <div v-else-if="error" class="operator-screenshot-error">诊断截图接口错误：{{ error }}</div>
        <div v-else-if="!sortedRows.length" class="operator-screenshot-state">没有诊断截图</div>
        <div v-else class="operator-screenshot-grid-wrap">
          <div class="operator-screenshot-grid">
            <article
              v-for="row in sortedRows"
              :key="row.id || `${opId}-${diagnosticStep(row)}-${screenshotUrl(row)}`"
              class="operator-screenshot-card"
            >
              <button
                v-if="renderedScreenshotUrl(row)"
                type="button"
                class="operator-screenshot-thumb"
                aria-label="查看诊断截图大图"
                @click="openPreview(row)"
              >
                <img :src="renderedScreenshotUrl(row)" loading="lazy" alt="" />
              </button>
              <div v-else class="operator-screenshot-thumb operator-screenshot-thumb-state">
                <span v-if="screenshotLoading(row)" class="operator-screenshot-spinner" aria-label="正在加载"></span>
                <span v-else-if="screenshotError(row)">下载失败</span>
                <span v-else>无截图</span>
              </div>
              <div class="operator-screenshot-card-body">
                <strong>{{ diagnosticTitle(row) }}</strong>
                <p>{{ diagnosticMeta(row) }}</p>
                <p v-if="screenshotError(row)">图片下载失败：{{ screenshotError(row) }}</p>
                <p v-if="diagnosticError(row)" class="operator-screenshot-row-error">{{ diagnosticError(row) }}</p>
              </div>
            </article>
          </div>
        </div>

        <div v-if="previewRow" class="operator-screenshot-preview" @click.self="closePreview">
          <button type="button" class="operator-screenshot-nav operator-screenshot-prev" @click="movePreview(-1)">&lsaquo;</button>
          <figure>
            <figcaption>
              <strong>{{ diagnosticTitle(previewRow) }}</strong>
              <span>{{ previewIndex + 1 }} / {{ sortedRows.length }}</span>
            </figcaption>
            <img :src="renderedScreenshotUrl(previewRow)" :alt="diagnosticTitle(previewRow)" />
          </figure>
          <button type="button" class="operator-screenshot-nav operator-screenshot-next" @click="movePreview(1)">&rsaquo;</button>
          <button type="button" class="operator-screenshot-preview-close" @click="closePreview">关闭</button>
        </div>
      </section>
    </div>
  </Teleport>
</template>

<style scoped>
.operator-screenshot-backdrop {
  position: fixed;
  inset: 0;
  z-index: 70;
  display: grid;
  place-items: center;
  padding: 18px;
  background: rgb(15 23 42 / 0.72);
}

.operator-screenshot-modal {
  position: relative;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  width: min(1480px, calc(100vw - 36px));
  height: min(920px, calc(100vh - 36px));
  overflow: hidden;
  border-radius: 10px;
  background: #ffffff;
  box-shadow: 0 24px 80px rgb(15 23 42 / 0.38);
}

.operator-screenshot-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 12px 14px;
  border-bottom: 1px solid #e2e8f0;
}

.operator-screenshot-head div {
  display: grid;
  min-width: 0;
  gap: 3px;
}

.operator-screenshot-head strong,
.operator-screenshot-card strong,
.operator-screenshot-preview strong {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.operator-screenshot-head span,
.operator-screenshot-card p,
.operator-screenshot-preview span {
  color: #64748b;
  font-size: 12px;
}

.operator-screenshot-head button,
.operator-screenshot-preview-close {
  flex: 0 0 auto;
  border: 1px solid #cbd5e1;
  border-radius: 7px;
  background: #ffffff;
  color: #243044;
  min-height: 32px;
  padding: 0 11px;
  cursor: pointer;
}

.operator-screenshot-state,
.operator-screenshot-error {
  margin: 14px;
  border-radius: 8px;
  padding: 14px;
  color: #64748b;
  background: #f8fafc;
}

.operator-screenshot-error {
  border: 1px solid #fecaca;
  background: #fff7f7;
  color: #991b1b;
}

.operator-screenshot-grid-wrap {
  min-height: 0;
  overflow-y: auto;
  padding: 14px;
}

.operator-screenshot-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.operator-screenshot-card {
  min-width: 0;
  overflow: hidden;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #f8fafc;
}

.operator-screenshot-thumb {
  display: grid;
  place-items: center;
  width: 100%;
  aspect-ratio: 16 / 10;
  overflow: hidden;
  border: 0;
  background: #0f172a;
  padding: 0;
  cursor: zoom-in;
}

.operator-screenshot-thumb img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.operator-screenshot-thumb-state {
  color: #cbd5e1;
  cursor: default;
  font-size: 13px;
}

.operator-screenshot-card-body {
  display: grid;
  gap: 5px;
  padding: 9px;
}

.operator-screenshot-card-body p {
  margin: 0;
  overflow-wrap: anywhere;
}

.operator-screenshot-row-error {
  color: #b91c1c;
}

.operator-screenshot-spinner {
  width: 24px;
  height: 24px;
  border: 3px solid rgb(203 213 225 / 0.45);
  border-top-color: #ffffff;
  border-radius: 999px;
  animation: operator-screenshot-spin 0.8s linear infinite;
}

@keyframes operator-screenshot-spin {
  to {
    transform: rotate(360deg);
  }
}

.operator-screenshot-preview {
  position: absolute;
  inset: 0;
  z-index: 1;
  display: grid;
  place-items: center;
  background: rgb(15 23 42 / 0.92);
}

.operator-screenshot-preview figure {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  width: 100%;
  height: 100%;
  margin: 0;
  min-width: 0;
}

.operator-screenshot-preview figcaption {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-width: 0;
  padding: 12px 64px 10px;
  color: #f8fafc;
}

.operator-screenshot-preview img {
  display: block;
  align-self: center;
  justify-self: center;
  max-width: calc(100% - 96px);
  max-height: calc(100% - 18px);
  object-fit: contain;
}

.operator-screenshot-nav {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  display: grid;
  place-items: center;
  width: 42px;
  height: 64px;
  border: 1px solid rgb(226 232 240 / 0.35);
  border-radius: 8px;
  background: rgb(15 23 42 / 0.62);
  color: #ffffff;
  cursor: pointer;
  font-size: 40px;
  line-height: 1;
}

.operator-screenshot-prev {
  left: 14px;
}

.operator-screenshot-next {
  right: 14px;
}

.operator-screenshot-preview-close {
  position: absolute;
  top: 10px;
  right: 12px;
  background: rgb(248 250 252 / 0.96);
}

@media (max-width: 1100px) {
  .operator-screenshot-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 760px) {
  .operator-screenshot-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .operator-screenshot-preview figcaption {
    padding-right: 56px;
    padding-left: 56px;
  }
}
</style>
