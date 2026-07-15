<script setup>
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue'
import { useCopyToast } from '../composables/useCopyToast'
import { usePageVisibilityPolling } from '../composables/usePageVisibilityPolling'
import { recentTimeRanges, timeRangeParams } from '../composables/useTimeRangeFilter'
import { formatDuration, formatNumber, formatTime, isSameDate, pad2, parseLocalDateTime } from '../utils/format'
import { formatJson } from '../utils/jsonDisplay'
import { buildPromptTemplateDisplay } from '../utils/promptTemplateDisplay'

const props = defineProps({
  api: { type: Object, required: true },
  pageKey: { type: String, required: true },
  title: { type: String, required: true },
  waitingStatus: { type: String, required: true },
  sourceFilter: { type: Object, default: null },
  textFilters: { type: Array, default: () => [] },
  columns: { type: Array, default: () => [] },
  detailFields: { type: Array, default: () => [] },
})

const filters = reactive({
  status: '',
  source: '',
  timeRange: 'recent',
})
const page = ref(1)
const limit = 50
const rows = ref([])
const total = ref(0)
const pageCount = ref(0)
const loading = ref(false)
const error = ref('')
const detailRow = ref(null)
let filterTimer = null
let requestToken = 0
const { copyToastVisible, copyText } = useCopyToast()
const { syncPolling, stopPolling } = usePageVisibilityPolling(() => {
  loadQueue({ silent: true })
}, () => hasActiveQueue.value)

const statusFilters = computed(() => [
  { value: '', label: '全部' },
  { value: props.waitingStatus, label: '排队中' },
  { value: 'running', label: '执行中' },
  { value: 'success', label: '成功' },
  { value: 'failed', label: '失败' },
])
const timeRanges = recentTimeRanges
const hasActiveQueue = computed(() => rows.value.some(item => [props.waitingStatus, 'running'].includes(item.status)))
const hasDetailDialog = computed(() => props.detailFields.length > 0)
const visibleDetailFields = computed(() => {
  if (!detailRow.value) return []
  return props.detailFields.map(field => {
    const display = detailFieldDisplay(detailRow.value, field)
    return {
      ...field,
      ...display,
    }
  })
})

onMounted(() => {
  restoreQuery()
  loadQueue()
})

onUnmounted(() => {
  stopPolling()
  clearFilterTimer()
})

function restoreQuery() {
  const query = new URLSearchParams(window.location.search)
  filters.status = query.get('status') || ''
  filters.source = query.get('source') || ''
  filters.timeRange = query.get('timeRange') || 'recent'
  if (props.sourceFilter && !sourceOptions().some(item => item.value === filters.source)) filters.source = ''
  if (!timeRanges.some(item => item.value === filters.timeRange)) filters.timeRange = 'recent'
  for (const filter of props.textFilters) {
    filters[filter.key] = query.get(filter.key) || ''
  }
  page.value = positiveInt(query.get('queuePage'), 1)
}

function syncQuery() {
  const query = new URLSearchParams(window.location.search)
  query.set('page', props.pageKey)
  query.set('queuePage', String(page.value))
  for (const key of ['status', 'source', 'timeRange', ...props.textFilters.map(item => item.key)]) {
    const value = filters[key]
    if (value) query.set(key, value)
    else query.delete(key)
  }
  window.history.replaceState(null, '', `${window.location.pathname}?${query.toString()}`)
}

async function loadQueue({ silent = false } = {}) {
  const token = ++requestToken
  if (!silent) loading.value = true
  error.value = ''
  syncQuery()
  try {
    const response = await props.api.listQueue({
      page: page.value,
      limit,
      status: filters.status,
      ...textFilterParams(),
      ...sourceFilterParams(),
      ...timeRangeParams(filters.timeRange),
    })
    if (token !== requestToken) return
    rows.value = response.items || []
    total.value = response.total || 0
    page.value = response.page || 1
    pageCount.value = response.pageCount || 0
    syncQuery()
    syncPolling()
  } catch (err) {
    if (token === requestToken) error.value = err instanceof Error ? err.message : String(err)
  } finally {
    if (token === requestToken) loading.value = false
  }
}

function textFilterParams() {
  return Object.fromEntries(props.textFilters.map(filter => [filter.key, filters[filter.key] || '']))
}

function sourceFilterParams() {
  if (!props.sourceFilter || !filters.source) return {}
  return { [props.sourceFilter.paramKey]: filters.source }
}

function filterChanged() {
  page.value = 1
  loadQueue()
}

function filterChangedDebounced() {
  clearFilterTimer()
  filterTimer = window.setTimeout(filterChanged, 300)
}

function clearFilterTimer() {
  if (filterTimer) window.clearTimeout(filterTimer)
  filterTimer = null
}

function setPage(nextPage) {
  const normalized = Math.max(1, Math.min(nextPage, pageCount.value || 1))
  if (normalized === page.value) return
  page.value = normalized
  loadQueue()
}

function statusText(status) {
  if (status === props.waitingStatus) return '排队中'
  if (status === 'running') return '执行中'
  if (status === 'success') return '成功'
  if (status === 'failed') return '失败'
  return status || '-'
}

function sourceOptions() {
  return props.sourceFilter?.options || []
}

function setSourceFilter(value) {
  filters.source = filters.source === value ? '' : value
  filterChanged()
}

function cellText(row, column) {
  if (column.format === 'status') return statusText(row.status)
  if (column.format === 'time') return relativeTime(row[column.key])
  if (column.format === 'wait') return waitingText(row, column)
  if (column.format === 'duration') return durationText(row)
  if (column.format === 'attempt') return attemptText(row)
  if (column.format === 'chars') return charsText(row)
  if (column.format === 'error') return errorText(row)
  if (column.format === 'taskType') return row.taskTypeDisplayName || row.taskType || '-'
  if (column.format === 'number') return formatNumber(row[column.key])
  if (column.format === 'detail') return '查看'
  return row[column.key] || '-'
}

function openDetailDialog(row) {
  if (!hasDetailDialog.value) return
  detailRow.value = row
}

function closeDetailDialog() {
  detailRow.value = null
}

function detailDialogTitle(row) {
  if (!row) return '任务详情'
  return [row.caller, row.upstreamTaskId || row.taskId, row.taskTypeDisplayName || row.taskType]
    .filter(Boolean)
    .join(' / ') || '任务详情'
}

function detailFieldText(row, field) {
  const value = row?.[field.key]
  if (field.format === 'json') {
    return formatJson(value) || '-'
  }
  if (value === null || value === undefined || value === '') return '-'
  return String(value)
}

function detailFieldDisplay(row, field) {
  const value = row?.[field.key]
  if (field.format === 'promptTemplate') {
    const promptTemplate = buildPromptTemplateDisplay(value)
    if (promptTemplate) return { display: promptTemplate, text: '' }
    return { display: null, text: formatJson(value) || '-' }
  }
  return { display: null, text: detailFieldText(row, field) }
}

function waitingText(row, column) {
  if (column.nextRunKey && row[column.nextRunKey]) {
    return relativeTime(row[column.nextRunKey])
  }
  const created = parseLocalDateTime(row.createdAt)
  const started = parseLocalDateTime(row.startedAt)
  if (created && started) return formatDuration((started.getTime() - created.getTime()) / 1000)
  if (created && [props.waitingStatus, 'running'].includes(row.status)) {
    return formatDuration((Date.now() - created.getTime()) / 1000)
  }
  return '-'
}

function durationText(row) {
  const status = String(row.status || '').toLowerCase()
  const started = parseLocalDateTime(row.startedAt || row.createdAt)
  if (status === 'running') {
    if (!started) return '-'
    return formatDuration((Date.now() - started.getTime()) / 1000)
  }
  if (!['success', 'failed'].includes(status)) return '-'
  const completed = parseLocalDateTime(row.completedAt)
  if (!completed || !started) return '-'
  return formatDuration((completed.getTime() - started.getTime()) / 1000)
}

function attemptText(row) {
  if (row.maxAttempts) return `${row.attemptCount || 0}/${row.maxAttempts}`
  return String(row.attemptCount ?? '-')
}

function charsText(row) {
  const input = Number(row.inputChars || 0)
  const output = Number(row.outputChars || 0)
  if (!input && !output) return '-'
  return `${formatNumber(input)} / ${formatNumber(output)}`
}

function errorText(row) {
  return [row.errorCode, row.errorMessage].filter(Boolean).join(' ') || '-'
}

function relativeTime(value) {
  const date = parseLocalDateTime(value)
  if (!date) return '-'
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const beforeYesterday = new Date(today)
  beforeYesterday.setDate(beforeYesterday.getDate() - 2)
  if (isSameDate(date, today)) return `今天 ${formatTime(date)}`
  if (isSameDate(date, yesterday)) return `昨天 ${formatTime(date)}`
  if (isSameDate(date, beforeYesterday)) return `前天 ${formatTime(date)}`
  return `${pad2(date.getMonth() + 1)}-${pad2(date.getDate())} ${formatTime(date)}`
}

function positiveInt(value, fallback) {
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}
</script>

<template>
  <section class="queue-monitor-page">
    <div v-if="copyToastVisible" class="queue-copy-toast" role="status" aria-live="polite">成功复制</div>

    <header class="queue-monitor-header">
      <div>
        <h1>{{ title }}</h1>
      </div>
      <div class="queue-monitor-actions">
        <span v-if="loading">正在加载</span>
        <button type="button" :disabled="loading" @click="loadQueue">刷新</button>
      </div>
    </header>

    <div class="queue-filter-bar">
      <div v-if="sourceFilter" class="queue-source-filter" aria-label="来源筛选">
        <span>{{ sourceFilter.label || '来源' }}</span>
        <div class="queue-source-icons">
          <button
            type="button"
            :class="{ active: !filters.source }"
            title="全部"
            @click="setSourceFilter('')"
          >
            <span>全部</span>
          </button>
          <button
            v-for="item in sourceOptions()"
            :key="item.value"
            type="button"
            :class="{ active: filters.source === item.value }"
            :title="item.label"
            @click="setSourceFilter(item.value)"
          >
            <span class="queue-source-icon" :data-tone="item.tone || 'default'">{{ item.icon || item.label }}</span>
          </button>
        </div>
      </div>
      <div class="queue-segment-filter">
        <span>时间</span>
        <div class="queue-segment-row">
          <button
            v-for="item in timeRanges"
            :key="item.value"
            type="button"
            :class="{ active: filters.timeRange === item.value }"
            @click="filters.timeRange = item.value; filterChanged()"
          >
            {{ item.label }}
          </button>
        </div>
      </div>
      <div class="queue-segment-filter">
        <span>状态</span>
        <div class="queue-segment-row">
          <button
            v-for="item in statusFilters"
            :key="item.value || 'all'"
            type="button"
            :class="{ active: filters.status === item.value }"
            @click="filters.status = item.value; filterChanged()"
          >
            {{ item.label }}
          </button>
        </div>
      </div>
      <div class="queue-search-row">
        <label v-for="filter in textFilters" :key="filter.key">
          {{ filter.label }}
          <input v-model.trim="filters[filter.key]" type="search" @input="filterChangedDebounced" />
        </label>
      </div>
    </div>

    <section class="queue-panel">
      <div v-if="error" class="queue-page-error">{{ error }}</div>
      <div class="queue-table-wrap">
        <table class="queue-table">
          <thead>
            <tr>
              <th v-for="column in columns" :key="column.key">{{ column.label }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!loading && !rows.length">
              <td :colspan="columns.length" class="queue-empty">没有队列任务</td>
            </tr>
            <tr
              v-for="row in rows"
              :key="row.id || row.opId || row.runId || row.requestKey"
              :class="['queue-row', `queue-${row.status || 'unknown'}`, { 'queue-clickable': hasDetailDialog }]"
              @click="openDetailDialog(row)"
            >
              <td
                v-for="column in columns"
                :key="`${column.key}-${column.label}`"
                :class="[`queue-cell-${column.format || 'text'}`, column.copy ? 'queue-copy-cell' : '']"
              >
                <button
                  v-if="column.copy && cellText(row, column) !== '-'"
                  type="button"
                  class="queue-copy-button"
                  @click.stop="copyText(row[column.copy] || row[column.key])"
                >
                  {{ cellText(row, column) }}
                </button>
                <button
                  v-else-if="column.format === 'detail'"
                  type="button"
                  class="queue-detail-button"
                  @click.stop="openDetailDialog(row)"
                >
                  查看
                </button>
                <span v-else>{{ cellText(row, column) }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <footer class="queue-pagination">
        <span>共 {{ total }} 条</span>
        <button type="button" :disabled="page <= 1 || loading" @click="setPage(page - 1)">上一页</button>
        <span>{{ page }} / {{ pageCount || 1 }}</span>
        <button type="button" :disabled="page >= (pageCount || 1) || loading" @click="setPage(page + 1)">下一页</button>
      </footer>
    </section>

    <div v-if="detailRow" class="queue-modal-backdrop" @click.self="closeDetailDialog">
      <section class="queue-detail-modal" role="dialog" aria-modal="true" aria-labelledby="queue-detail-title">
        <header>
          <div>
            <h2 id="queue-detail-title">API 参数</h2>
            <p>{{ detailDialogTitle(detailRow) }}</p>
          </div>
          <button type="button" @click="closeDetailDialog">关闭</button>
        </header>
        <div class="queue-detail-body">
          <article v-for="field in visibleDetailFields" :key="field.key" class="queue-detail-section">
            <h3>{{ field.label }}</h3>
            <div v-if="field.display?.kind === 'prompt-template'" class="queue-template-panel">
              <pre v-if="field.display.metaText" class="queue-template-meta">{{ field.display.metaText }}</pre>
              <section v-for="(block, blockIndex) in field.display.blocks" :key="`${field.key}-${blockIndex}`" class="queue-template-message">
                <div class="queue-template-role">{{ block.role }}</div>
                <pre class="queue-template-content"><template v-for="(token, tokenIndex) in block.tokens" :key="`${field.key}-${blockIndex}-${tokenIndex}`"><span :class="{ 'queue-template-placeholder': token.placeholder }">{{ token.text }}</span></template></pre>
              </section>
              <div v-if="field.display.params.length" class="queue-template-params">
                <div v-for="param in field.display.params" :key="param.name" class="queue-template-param">
                  <strong>{{ param.name }}</strong>
                  <span>:</span>
                  <pre>{{ param.value }}</pre>
                </div>
              </div>
            </div>
            <pre v-else>{{ field.text }}</pre>
          </article>
        </div>
      </section>
    </div>
  </section>
</template>

<style scoped>
.queue-monitor-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.queue-monitor-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.queue-monitor-header h1 {
  margin: 0;
  font-size: 24px;
}

.queue-monitor-actions,
.queue-pagination {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #64748b;
  font-size: 13px;
  white-space: nowrap;
}

.queue-monitor-actions button,
.queue-pagination button {
  min-height: 30px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  background: #fff;
  color: #0f172a;
  padding: 0 10px;
  cursor: pointer;
}

.queue-monitor-actions button:disabled,
.queue-pagination button:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.queue-filter-bar {
  display: grid;
  gap: 12px;
}

.queue-filter-bar label,
.queue-source-filter,
.queue-segment-filter {
  display: grid;
  gap: 6px;
  color: #64748b;
  font-size: 12px;
}

.queue-source-icons {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  min-height: 34px;
}

.queue-source-icons button {
  display: inline-grid;
  place-items: center;
  min-width: 34px;
  height: 34px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: #334155;
  font-size: 12px;
  font-weight: 680;
  padding: 0 3px;
  cursor: pointer;
}

.queue-source-icons button.active {
  outline: 2px solid #2563eb;
  outline-offset: 2px;
}

.queue-source-icon {
  display: inline-grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  background: #f1f5f9;
  color: #334155;
  font-size: 12px;
  font-weight: 760;
}

.queue-source-icon[data-tone="combiner"],
.queue-source-icon[data-tone="uploader"] {
  background: #dbeafe;
  color: #1d4ed8;
}

.queue-source-icon[data-tone="translator"],
.queue-source-icon[data-tone="asseter"] {
  background: #dcfce7;
  color: #166534;
}

.queue-source-icon[data-tone="publisher"] {
  background: #fef3c7;
  color: #92400e;
}

.queue-source-icon[data-tone="downloader"] {
  background: #e0e7ff;
  color: #3730a3;
}

.queue-segment-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.queue-segment-row button {
  min-height: 34px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  background: #fff;
  color: #334155;
  font-weight: 680;
  padding: 0 12px;
  cursor: pointer;
}

.queue-segment-row button.active {
  border-color: #2563eb;
  background: #2563eb;
  color: #fff;
}

.queue-search-row {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.queue-filter-bar input {
  min-height: 34px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  padding: 0 9px;
  background: #fff;
  color: #0f172a;
}

.queue-panel {
  display: grid;
  gap: 10px;
  border: 1px solid #dde6f0;
  border-radius: 8px;
  background: #fff;
  padding: 14px;
}

.queue-table-wrap {
  overflow-x: auto;
}

.queue-table {
  width: 100%;
  min-width: 1120px;
  border-collapse: collapse;
  font-size: 13px;
}

.queue-table th,
.queue-table td {
  border-bottom: 1px solid #e2e8f0;
  padding: 8px 10px;
  text-align: center;
  vertical-align: middle;
  white-space: nowrap;
}

.queue-table th {
  color: #64748b;
  font-size: 12px;
  font-weight: 760;
}

.queue-table tbody tr:last-child td {
  border-bottom: 0;
}

.queue-row {
  background: #f1f5f9;
}

.queue-clickable {
  cursor: pointer;
}

.queue-clickable:hover td {
  background: rgb(37 99 235 / 6%);
}

.queue-success {
  background: #fff;
}

.queue-failed {
  background: #fecaca;
}

.queue-running {
  background: #dbeafe;
}

.queue-ready,
.queue-pending {
  background: #f1f5f9;
}

.queue-copy-button {
  max-width: 220px;
  overflow: hidden;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  padding: 0;
  text-overflow: ellipsis;
  cursor: pointer;
}

.queue-detail-button {
  min-height: 26px;
  border: 1px solid #bfdbfe;
  border-radius: 6px;
  background: #eff6ff;
  color: #1d4ed8;
  font: inherit;
  font-weight: 680;
  padding: 0 10px;
  cursor: pointer;
}

.queue-detail-button:hover {
  border-color: #60a5fa;
  background: #dbeafe;
}

.queue-cell-error span {
  display: inline-block;
  max-width: 260px;
  overflow: hidden;
  text-overflow: ellipsis;
  vertical-align: middle;
}

.queue-cell-number {
  font-weight: 760;
}

.queue-copy-toast {
  position: fixed;
  top: 18px;
  left: 50%;
  z-index: 30;
  transform: translateX(-50%);
  border: 1px solid #bbf7d0;
  border-radius: 8px;
  background: #f0fdf4;
  color: #166534;
  font-size: 14px;
  font-weight: 700;
  padding: 8px 16px;
  box-shadow: 0 10px 24px rgb(15 23 42 / 12%);
}

.queue-empty {
  color: #64748b;
  text-align: center;
}

.queue-page-error {
  color: #b91c1c;
}

.queue-pagination {
  justify-content: flex-end;
}

.queue-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 40;
  display: grid;
  place-items: center;
  padding: 24px;
  background: rgb(15 23 42 / 42%);
}

.queue-detail-modal {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  width: min(1040px, 100%);
  max-height: min(760px, calc(100vh - 48px));
  overflow: hidden;
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 24px 70px rgb(15 23 42 / 24%);
}

.queue-detail-modal header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  border-bottom: 1px solid #e2e8f0;
  padding: 16px 18px;
}

.queue-detail-modal h2,
.queue-detail-modal h3,
.queue-detail-modal p {
  margin: 0;
}

.queue-detail-modal h2 {
  font-size: 18px;
}

.queue-detail-modal p {
  margin-top: 4px;
  color: #64748b;
  font-size: 13px;
}

.queue-detail-modal header button {
  min-height: 32px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  background: #fff;
  color: #0f172a;
  padding: 0 12px;
  cursor: pointer;
}

.queue-detail-body {
  display: grid;
  gap: 14px;
  overflow: auto;
  padding: 16px 18px 18px;
}

.queue-detail-section {
  display: grid;
  gap: 8px;
}

.queue-detail-section h3 {
  color: #334155;
  font-size: 13px;
}

.queue-detail-section pre {
  max-height: 320px;
  overflow: auto;
  margin: 0;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #f8fafc;
  color: #0f172a;
  padding: 12px;
  font-size: 12px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
}

.queue-template-panel {
  display: grid;
  gap: 10px;
}

.queue-template-message {
  display: grid;
  gap: 6px;
}

.queue-template-role {
  width: fit-content;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  background: #fff;
  color: #334155;
  font-size: 12px;
  font-weight: 760;
  padding: 2px 8px;
}

.queue-template-content,
.queue-template-meta {
  color: #0f172a;
}

.queue-template-placeholder {
  color: #dc2626;
  font-weight: 760;
}

.queue-template-params {
  display: grid;
  gap: 8px;
  border: 1px solid #fecaca;
  border-radius: 8px;
  background: #fff7f7;
  padding: 10px;
}

.queue-template-param {
  display: grid;
  grid-template-columns: max-content max-content minmax(0, 1fr);
  align-items: start;
  gap: 6px;
  color: #0f172a;
  font-size: 12px;
}

.queue-template-param strong {
  color: #dc2626;
  font-weight: 760;
}

.queue-template-param pre {
  max-height: 180px;
  border: 0;
  background: transparent;
  padding: 0;
}

@media (max-width: 1100px) {
  .queue-search-row {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 700px) {
  .queue-monitor-header {
    flex-direction: column;
  }

  .queue-search-row {
    grid-template-columns: minmax(0, 1fr);
  }

  .queue-modal-backdrop {
    padding: 12px;
  }

  .queue-detail-modal header {
    flex-direction: column;
  }

  .queue-template-param {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
