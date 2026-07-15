<script setup>
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue'
import PlatformIcon from '../components/PlatformIcon.vue'
import OperatorDiagnosticScreenshotDialog from '../components/operator-diagnostics/OperatorDiagnosticScreenshotDialog.vue'
import { useCopyToast } from '../composables/useCopyToast'
import { usePageVisibilityPolling } from '../composables/usePageVisibilityPolling'
import { recentTimeRanges, timeRangeParams } from '../composables/useTimeRangeFilter'
import { uploadPlatformText } from '../domain/constants'
import { formatDuration, formatTime, isSameDate, pad2, parseLocalDateTime } from '../utils/format'

const props = defineProps({
  api: { type: Object, required: true },
  platformIconUrls: { type: Object, default: () => ({}) },
})

const filters = reactive({
  platform: '',
  accountKey: '',
  opId: '',
  taskId: '',
  timeRange: 'recent',
})
const queueTasks = ref([])
const queueLoading = ref(false)
const queueError = ref('')
const screenshotDialogTask = ref(null)
let filterTimer = null
let queueRequestToken = 0
const { copyToastVisible, copyText } = useCopyToast()
const { syncPolling, stopPolling } = usePageVisibilityPolling(() => {
  loadQueue({ silent: true })
}, () => hasActiveQueue.value)

const hasActiveQueue = computed(() => queueTasks.value.some(item => ['ready', 'running'].includes(item.status)))
const platformOptions = computed(() => Object.entries(props.platformIconUrls).map(([type, iconUrl]) => ({
  type,
  label: uploadPlatformText[type] || type,
  iconUrl,
})))
const timeRanges = recentTimeRanges

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
  for (const key of Object.keys(filters)) {
    filters[key] = query.get(key) || ''
  }
  if (!timeRanges.some(item => item.value === filters.timeRange)) filters.timeRange = 'recent'
}

function syncQuery() {
  const query = new URLSearchParams(window.location.search)
  query.set('page', 'operator-diagnostics')
  query.delete('status')
  query.delete('operatorPage')
  for (const [key, value] of Object.entries(filters)) {
    if (value) query.set(key, value)
    else query.delete(key)
  }
  window.history.replaceState(null, '', `${window.location.pathname}?${query.toString()}`)
}

async function loadQueue({ silent = false } = {}) {
  const token = ++queueRequestToken
  if (!silent) queueLoading.value = true
  queueError.value = ''
  syncQuery()
  try {
    const response = await loadAllQueuePages(token)
    if (token !== queueRequestToken) return
    queueTasks.value = response
    syncPolling()
  } catch (err) {
    if (token === queueRequestToken) queueError.value = err instanceof Error ? err.message : String(err)
  } finally {
    if (token === queueRequestToken) queueLoading.value = false
  }
}

async function loadAllQueuePages(token) {
  const params = queueParams()
  const firstPage = await props.api.listQueue({ ...params, page: 1 })
  if (token !== queueRequestToken) return []
  const rows = [...(firstPage.items || [])]
  const pageCount = Number(firstPage.pageCount || 1)
  for (let page = 2; page <= pageCount; page += 1) {
    const response = await props.api.listQueue({ ...params, page })
    if (token !== queueRequestToken) return []
    rows.push(...(response.items || []))
  }
  return rows
}

function queueParams() {
  return {
    platform: filters.platform,
    accountKey: filters.accountKey,
    opId: filters.opId,
    taskId: filters.taskId,
    ...timeRangeParams(filters.timeRange),
  }
}

function filterChanged() {
  loadQueue()
}

function filterChangedDebounced() {
  clearFilterTimer()
  filterTimer = window.setTimeout(() => {
    filterChanged()
  }, 300)
}

function clearFilterTimer() {
  if (filterTimer) window.clearTimeout(filterTimer)
  filterTimer = null
}

function setPlatformFilter(platform) {
  filters.platform = filters.platform === platform ? '' : platform
  filterChanged()
}

function queueTaskId(row) {
  return row?.taskId || row?.task_id || ''
}

function queueOpId(row) {
  return row?.opId || row?.op_id || row?.runId || row?.run_id || ''
}

function openScreenshotDialog(task) {
  screenshotDialogTask.value = task
}

function closeScreenshotDialog() {
  screenshotDialogTask.value = null
}

function screenshotDialogTitle(task) {
  return [
    queueTaskType(task),
    task?.accountKey,
  ].filter(Boolean).join(' / ') || '诊断截图'
}

function platformIconUrl(platform) {
  return props.platformIconUrls?.[platform] || ''
}

function queueTaskType(row) {
  const type = row?.taskType || ''
  return row?.taskTypeDisplayName || row?.action || type || '-'
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

function durationText(row) {
  const status = String(row?.status || '').toLowerCase()
  const started = parseLocalDateTime(row?.startedAt || row?.createdAt)
  if (status === 'running') {
    if (!started) return '-'
    return formatDuration((Date.now() - started.getTime()) / 1000)
  }
  if (!['success', 'failed'].includes(status)) return '-'
  const completed = parseLocalDateTime(row?.completedAt)
  if (!completed || !started) return '-'
  return formatDuration((completed.getTime() - started.getTime()) / 1000)
}

function waitingDurationText(row) {
  const created = parseLocalDateTime(row?.createdAt)
  const started = parseLocalDateTime(row?.startedAt)
  if (!created || !started) return '-'
  return formatDuration((started.getTime() - created.getTime()) / 1000)
}

function canOpenScreenshotDialog(task) {
  return Boolean(queueOpId(task))
}
</script>

<template>
  <section class="operator-diagnostics-page">
    <div v-if="copyToastVisible" class="operator-copy-toast" role="status" aria-live="polite">成功复制</div>

    <header class="operator-diagnostics-header">
      <div>
        <h1>诊断</h1>
      </div>
    </header>

    <div class="operator-filter-bar">
      <div class="operator-platform-filter" aria-label="平台筛选">
        <span>平台</span>
        <div class="operator-platform-icons">
          <button
            type="button"
            :class="{ active: !filters.platform }"
            title="全部平台"
            @click="setPlatformFilter('')"
          >
            <span>全部</span>
          </button>
          <button
            v-for="platform in platformOptions"
            :key="platform.type"
            type="button"
            :class="{ active: filters.platform === platform.type }"
            :title="platform.label"
            @click="setPlatformFilter(platform.type)"
          >
            <PlatformIcon :src="platform.iconUrl" :label="platform.label" :platform="platform.type" :size="28" />
          </button>
        </div>
      </div>
      <div class="operator-segment-filter">
        <span>时间</span>
        <div class="operator-segment-row">
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
      <div class="operator-search-row">
        <label>
          account_key
          <input v-model.trim="filters.accountKey" type="search" @input="filterChangedDebounced" />
        </label>
        <label>
          op_id
          <input v-model.trim="filters.opId" type="search" @input="filterChangedDebounced" />
        </label>
        <label>
          task_id
          <input v-model.trim="filters.taskId" type="search" @input="filterChangedDebounced" />
        </label>
      </div>
    </div>

    <section class="operator-queue-panel">
      <header class="operator-queue-head">
        <div>
          <h2>Operator 队列</h2>
        </div>
        <div class="operator-queue-status">
          <span v-if="queueLoading">正在加载</span>
          <button type="button" :disabled="queueLoading" @click="loadQueue">刷新</button>
        </div>
      </header>
      <div v-if="queueError" class="operator-page-error">{{ queueError }}</div>
      <div class="operator-queue-table-wrap">
        <table class="operator-queue-table">
          <thead>
            <tr>
              <th>平台</th>
              <th>任务</th>
              <th>任务类型</th>
              <th>accountkey</th>
              <th>创建时间</th>
              <th>等待时长</th>
              <th>耗时</th>
              <th>priority</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!queueLoading && !queueTasks.length">
              <td colspan="8" class="operator-queue-empty">没有 Operator 任务</td>
            </tr>
            <tr
              v-for="task in queueTasks"
              :key="task.opId || task.runId || task.id"
              :class="[
                'operator-queue-row',
                `operator-queue-${task.status || 'unknown'}`,
                { 'operator-queue-clickable': canOpenScreenshotDialog(task) },
              ]"
              @click="canOpenScreenshotDialog(task) && openScreenshotDialog(task)"
            >
              <td class="operator-queue-platform">
                <button
                  type="button"
                  class="operator-queue-platform-button"
                  @click.stop="copyText(queueOpId(task))"
                >
                  <PlatformIcon
                    :src="platformIconUrl(task.platform)"
                    :label="uploadPlatformText[task.platform] || task.platform"
                    :platform="task.platform"
                    :size="28"
                  />
                </button>
              </td>
              <td>
                <button
                  v-if="queueTaskId(task)"
                  type="button"
                  class="operator-queue-task-id"
                  @click.stop="copyText(queueTaskId(task))"
                >
                  {{ queueTaskId(task) }}
                </button>
                <span v-else>-</span>
              </td>
              <td>{{ queueTaskType(task) }}</td>
              <td>{{ task.accountKey || '-' }}</td>
              <td>{{ relativeTime(task.createdAt) }}</td>
              <td>{{ waitingDurationText(task) }}</td>
              <td>{{ durationText(task) }}</td>
              <td class="operator-queue-priority">{{ task.priority ?? '-' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <OperatorDiagnosticScreenshotDialog
      :api="api"
      :open="Boolean(screenshotDialogTask)"
      :task="screenshotDialogTask"
      :title="screenshotDialogTitle(screenshotDialogTask)"
      @close="closeScreenshotDialog"
    />
  </section>
</template>

<style scoped>
.operator-diagnostics-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.operator-diagnostics-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.operator-diagnostics-header h1 {
  margin: 0 0 4px;
  font-size: 24px;
}

.operator-queue-panel {
  display: grid;
  gap: 10px;
  border: 1px solid #dde6f0;
  border-radius: 8px;
  background: #fff;
  padding: 14px;
}

.operator-queue-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.operator-queue-head h2 {
  margin: 0 0 4px;
  font-size: 16px;
  line-height: 1.35;
}

.operator-queue-status {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #64748b;
  font-size: 13px;
  white-space: nowrap;
}

.operator-queue-status button {
  min-height: 30px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  background: #fff;
  color: #0f172a;
  padding: 0 10px;
  cursor: pointer;
}

.operator-queue-status button:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.operator-queue-table-wrap {
  overflow-x: auto;
}

.operator-queue-table {
  width: 100%;
  min-width: 820px;
  border-collapse: collapse;
  font-size: 13px;
}

.operator-queue-table th,
.operator-queue-table td {
  border-bottom: 1px solid #e2e8f0;
  padding: 8px 10px;
  text-align: center;
  vertical-align: middle;
  white-space: nowrap;
}

.operator-queue-table th {
  color: #64748b;
  font-size: 12px;
  font-weight: 760;
}

.operator-queue-table tbody tr:last-child td {
  border-bottom: 0;
}

.operator-queue-row {
  background: #f1f5f9;
}

.operator-queue-clickable {
  cursor: pointer;
}

.operator-queue-success {
  background: #fff;
}

.operator-queue-failed {
  background: #fecaca;
}

.operator-queue-running {
  background: #dbeafe;
}

.operator-queue-platform {
  width: 48px;
}

.operator-queue-platform-button {
  display: inline-grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  padding: 0;
  cursor: default;
}

.operator-queue-task-id {
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  padding: 0;
  cursor: default;
}

.operator-copy-toast {
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

.operator-queue-priority {
  font-weight: 760;
}

.operator-queue-empty {
  color: #64748b;
  text-align: center;
}

.operator-filter-bar {
  display: grid;
  gap: 12px;
}

.operator-filter-bar label,
.operator-platform-filter,
.operator-segment-filter {
  display: grid;
  gap: 6px;
  color: #64748b;
  font-size: 12px;
}

.operator-segment-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.operator-segment-row button {
  min-height: 34px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  background: #fff;
  color: #334155;
  font-weight: 680;
  padding: 0 12px;
  cursor: pointer;
}

.operator-segment-row button.active {
  border-color: #2563eb;
  background: #2563eb;
  color: #fff;
}

.operator-platform-icons {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  min-height: 34px;
}

.operator-platform-icons button {
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

.operator-platform-icons button.active {
  outline: 2px solid #2563eb;
  outline-offset: 2px;
}

.operator-search-row {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.operator-filter-bar input {
  min-height: 34px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  padding: 0 9px;
  background: #fff;
  color: #0f172a;
}

.operator-page-error {
  color: #b91c1c;
}

@media (max-width: 1100px) {
  .operator-search-row {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (max-width: 700px) {
  .operator-diagnostics-header,
  .operator-queue-head {
    flex-direction: column;
  }
}
</style>
