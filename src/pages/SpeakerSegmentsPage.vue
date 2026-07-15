<script setup>
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue'
import { useCopyToast } from '../composables/useCopyToast'
import { usePageVisibilityPolling } from '../composables/usePageVisibilityPolling'
import { formatDuration, formatTime, isSameDate, pad2, parseLocalDateTime } from '../utils/format'

const props = defineProps({
  api: { type: Object, required: true },
})

const limit = 80
const filters = reactive({
  device: '',
  taskId: '',
  taskType: '',
})
const rows = ref([])
const summary = ref({})
const total = ref(0)
const page = ref(1)
const pageCount = ref(0)
const loading = ref(false)
const error = ref('')
let filterTimer = null
let requestToken = 0
const { copyToastVisible, copyText } = useCopyToast()
const { syncPolling, stopPolling } = usePageVisibilityPolling(() => {
  loadSegments({ silent: true })
}, () => hasActiveQueue.value)

const summaryData = computed(() => summary.value || {})
const deviceRows = computed(() => {
  const known = ['Macbook Air M4', 'myhp']
  const source = Array.isArray(summaryData.value.devices) ? summaryData.value.devices : []
  return known.map((name) => {
    const matched = source.find(row => deviceDisplay(row.device) === name || deviceDisplay(row.device).toLowerCase() === name.toLowerCase())
    return matched || { device: name, pending: 0, ready: 0, running: 0, success: 0, failed: 0, total: 0 }
  })
})
const deviceOptions = computed(() => {
  const names = new Set(deviceRows.value.map(row => deviceDisplay(row.device)).filter(Boolean))
  names.add('未分配')
  return Array.from(names)
})
const hasActiveQueue = computed(() => rows.value.some(row => ['pending', 'ready', 'running'].includes(row.status)))
const headlineCards = computed(() => [
  { key: 'unfinished', label: '未完成', value: summaryData.value.unfinishedCount || 0 },
])

onMounted(() => {
  restoreQuery()
  loadSegments()
})

onUnmounted(() => {
  stopPolling()
  clearFilterTimer()
})

function restoreQuery() {
  const query = new URLSearchParams(window.location.search)
  filters.device = query.get('device') || ''
  filters.taskId = query.get('taskId') || ''
  filters.taskType = query.get('taskType') || ''
  page.value = positiveInt(query.get('speakerPage'), 1)
}

function syncQuery() {
  const query = new URLSearchParams(window.location.search)
  query.set('page', 'speaker')
  query.set('speakerPage', String(page.value))
  query.delete('status')
  query.delete('timeRange')
  for (const key of ['device', 'taskId', 'taskType']) {
    if (filters[key]) query.set(key, filters[key])
    else query.delete(key)
  }
  window.history.replaceState(null, '', `${window.location.pathname}?${query.toString()}`)
}

async function loadSegments({ silent = false } = {}) {
  const token = ++requestToken
  if (!silent) loading.value = true
  error.value = ''
  syncQuery()
  try {
    const response = await props.api.listSegments({
      page: page.value,
      limit,
      device: deviceParam(filters.device),
      taskId: filters.taskId,
      taskType: filters.taskType,
    })
    if (token !== requestToken) return
    rows.value = response.items || []
    summary.value = response.summary || {}
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

function filterChanged() {
  page.value = 1
  loadSegments()
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
  loadSegments()
}

function deviceDisplay(device) {
  const text = String(device || '').trim()
  if (!text) return '未分配'
  const normalized = text.toLowerCase().replace(/[\s_-]+/g, '')
  if (normalized === 'macbookairm4') return 'Macbook Air M4'
  if (normalized === 'lpxbhp' || normalized === 'myhp') return 'myhp'
  return text
}

function deviceParam(device) {
  return device === '未分配' ? '__unassigned' : device
}

function attemptText(row) {
  return row.maxAttempts ? `${row.attemptCount || 0}/${row.maxAttempts}` : String(row.attemptCount ?? '-')
}

function errorText(row) {
  const text = String(row.errorMessage || '').replace(/\s+/g, ' ').trim()
  if (!text) return '-'
  return text.length > 80 ? `${text.slice(0, 80)}...` : text
}

function durationValue(row) {
  if (row.elapsedSeconds !== null && row.elapsedSeconds !== undefined) return Number(row.elapsedSeconds)
  const started = parseLocalDateTime(row.startedAt)
  if (!started) return null
  if (row.status === 'running') return (Date.now() - started.getTime()) / 1000
  const completed = parseLocalDateTime(row.completedAt)
  if (!completed) return null
  return (completed.getTime() - started.getTime()) / 1000
}

function durationText(row) {
  const seconds = durationValue(row)
  return seconds === null || !Number.isFinite(seconds) ? '-' : formatDuration(seconds)
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
  <section class="speaker-page">
    <div v-if="copyToastVisible" class="speaker-copy-toast" role="status" aria-live="polite">成功复制</div>

    <header class="speaker-header">
      <h1>配音</h1>
      <div class="speaker-actions">
        <span v-if="loading">正在加载</span>
        <button type="button" :disabled="loading" @click="loadSegments">刷新</button>
      </div>
    </header>

    <section class="speaker-summary">
      <article v-for="card in headlineCards" :key="card.key" class="speaker-summary-card">
        <span>{{ card.label }}</span>
        <strong>{{ card.value }}</strong>
      </article>
    </section>

    <section class="speaker-device-grid">
      <article v-for="device in deviceRows" :key="device.device" class="speaker-device-card">
        <header>
          <strong>{{ deviceDisplay(device.device) }}</strong>
          <span>{{ device.total || 0 }} 段</span>
        </header>
        <dl>
          <div><dt>最近完成</dt><dd>{{ (device.success || 0) + (device.failed || 0) }}</dd></div>
        </dl>
      </article>
    </section>

    <div class="speaker-filter-bar">
      <label>
        设备
        <select v-model="filters.device" @change="filterChanged">
          <option value="">全部</option>
          <option v-for="device in deviceOptions" :key="device" :value="device">{{ device }}</option>
        </select>
      </label>
      <label>
        task_id
        <input v-model.trim="filters.taskId" type="search" @input="filterChangedDebounced" />
      </label>
      <label>
        任务类型
        <input v-model.trim="filters.taskType" type="search" @input="filterChangedDebounced" />
      </label>
    </div>

    <section class="speaker-panel">
      <div v-if="error" class="speaker-page-error">{{ error }}</div>
      <div class="speaker-table-wrap">
        <table class="speaker-table">
          <thead>
            <tr>
              <th>设备</th>
              <th>任务</th>
              <th>优先级</th>
              <th>段号</th>
              <th>任务类型</th>
              <th>尝试</th>
              <th>提交时间</th>
              <th>完成</th>
              <th>耗时</th>
              <th>错误</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!loading && !rows.length">
              <td colspan="10" class="speaker-empty">没有配音段</td>
            </tr>
            <tr
              v-for="row in rows"
              :key="row.id"
              :class="['speaker-row', `speaker-${row.status || 'unknown'}`]"
            >
                <td>{{ deviceDisplay(row.device || row.operator) }}</td>
                <td>
                  <button type="button" class="speaker-copy-button" @click.stop="copyText(row.taskId)">{{ row.taskId || '-' }}</button>
                </td>
                <td class="speaker-priority-cell">{{ row.priority ?? '-' }}</td>
                <td>{{ row.itemIndex ?? '-' }}</td>
                <td>{{ row.taskType || '-' }}</td>
                <td>{{ attemptText(row) }}</td>
                <td>{{ relativeTime(row.createdAt) }}</td>
                <td>{{ relativeTime(row.completedAt) }}</td>
                <td>{{ durationText(row) }}</td>
                <td class="speaker-error-cell">{{ errorText(row) }}</td>
              </tr>
          </tbody>
        </table>
      </div>
      <footer class="speaker-pagination">
        <span>共 {{ total }} 条</span>
        <button type="button" :disabled="page <= 1 || loading" @click="setPage(page - 1)">上一页</button>
        <span>{{ page }} / {{ pageCount || 1 }}</span>
        <button type="button" :disabled="page >= (pageCount || 1) || loading" @click="setPage(page + 1)">下一页</button>
      </footer>
    </section>
  </section>
</template>

<style scoped>
.speaker-page {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.speaker-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.speaker-header h1 {
  margin: 0;
  font-size: 24px;
}

.speaker-actions,
.speaker-pagination {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #64748b;
  font-size: 13px;
  white-space: nowrap;
}

.speaker-actions button,
.speaker-pagination button {
  min-height: 30px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  background: #fff;
  color: #0f172a;
  padding: 0 10px;
  cursor: pointer;
}

.speaker-actions button:disabled,
.speaker-pagination button:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.speaker-summary,
.speaker-device-grid {
  display: grid;
  gap: 10px;
}

.speaker-summary {
  grid-template-columns: minmax(180px, 260px);
}

.speaker-device-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.speaker-summary-card,
.speaker-device-card {
  border: 1px solid #dde6f0;
  border-radius: 8px;
  background: #fff;
  padding: 12px 14px;
}

.speaker-summary-card {
  display: grid;
  gap: 5px;
}

.speaker-summary-card span,
.speaker-device-card header span,
.speaker-device-card dt {
  color: #64748b;
  font-size: 12px;
}

.speaker-summary-card strong {
  color: #0f172a;
  font-size: 24px;
}

.speaker-device-card {
  display: grid;
  gap: 10px;
}

.speaker-device-card header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.speaker-device-card dl {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 8px;
  margin: 0;
}

.speaker-device-card div {
  display: grid;
  gap: 3px;
}

.speaker-device-card dd {
  margin: 0;
  color: #0f172a;
  font-weight: 760;
}

.speaker-filter-bar {
  display: grid;
  grid-template-columns: 160px repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.speaker-filter-bar label {
  display: grid;
  gap: 6px;
  color: #64748b;
  font-size: 12px;
}

.speaker-filter-bar input,
.speaker-filter-bar select {
  min-height: 34px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  background: #fff;
  color: #0f172a;
  padding: 0 9px;
}

.speaker-panel {
  display: grid;
  gap: 10px;
  border: 1px solid #dde6f0;
  border-radius: 8px;
  background: #fff;
  padding: 14px;
}

.speaker-table-wrap {
  overflow-x: auto;
}

.speaker-table {
  width: 100%;
  min-width: 980px;
  border-collapse: collapse;
  font-size: 13px;
}

.speaker-table th,
.speaker-table td {
  border-bottom: 1px solid #e2e8f0;
  padding: 8px 10px;
  text-align: center;
  vertical-align: middle;
  white-space: nowrap;
}

.speaker-table th {
  color: #64748b;
  font-size: 12px;
  font-weight: 760;
}

.speaker-row {
  background: #f1f5f9;
}

.speaker-success {
  background: #fff;
}

.speaker-running {
  background: #dbeafe;
}

.speaker-failed {
  background: #fecaca;
}

.speaker-ready,
.speaker-pending {
  background: #f1f5f9;
}

.speaker-copy-button {
  max-width: 180px;
  overflow: hidden;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  padding: 0;
  text-overflow: ellipsis;
  cursor: pointer;
}

.speaker-error-cell {
  max-width: 280px;
  overflow: hidden;
  text-align: left;
  text-overflow: ellipsis;
}

.speaker-priority-cell {
  color: #0f172a;
  font-weight: 760;
}

.speaker-empty,
.speaker-page-error {
  color: #64748b;
  text-align: center;
}

.speaker-page-error {
  color: #b91c1c;
  text-align: left;
}

.speaker-pagination {
  justify-content: flex-end;
}

.speaker-copy-toast {
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

@media (max-width: 1100px) {
  .speaker-device-grid,
  .speaker-filter-bar {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 700px) {
  .speaker-header {
    flex-direction: column;
  }

  .speaker-summary,
  .speaker-device-grid,
  .speaker-filter-bar {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
