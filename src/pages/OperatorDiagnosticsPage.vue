<script setup>
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue'
import PlatformIcon from '../components/PlatformIcon.vue'
import OperatorDiagnosticScreenshotDialog from '../components/operator-diagnostics/OperatorDiagnosticScreenshotDialog.vue'
import OperatorExecutionCard from '../components/operator-diagnostics/OperatorExecutionCard.vue'
import { uploadPlatformText } from '../domain/constants'
import { formatDuration, formatTime, isSameDate, pad2, parseLocalDateTime } from '../utils/format'

const props = defineProps({
  api: { type: Object, required: true },
  platformIconUrls: { type: Object, default: () => ({}) },
})

const statuses = [
  { value: '', label: '全部' },
  { value: 'ready', label: '排队' },
  { value: 'running', label: '执行中' },
  { value: 'success', label: '成功' },
  { value: 'failed', label: '失败' },
]

const taskTypeText = {
  'xiaohongshu-upload-video': '小红书上传',
  'bilibili-upload-video': 'B站上传',
  'douyin-upload-video': '抖音上传',
  'shipinhao-upload-video': '视频号上传',
  'kuaishou-upload-video': '快手上传',
  'jinritoutiao-upload-video': '今日头条上传',
  'youtube-upload-video': 'YouTube上传',
  'x-post': 'X发帖',
  'x-post-text': 'X发文本',
  'notebooklm-create-note': 'NotebookLM创建笔记',
  'notebooklm-download-assets': 'NotebookLM下载素材',
  'doubao-generate-cover': '豆包生成封面',
  'doubao-generate-image': '豆包生图',
  'doubao-generate-video-submit': '豆包提交视频生成',
  'doubao-generate-video-query': '豆包查询视频生成',
  'chatgpt-chat': 'ChatGPT对话',
  'chatgpt-generate-image-submit': 'ChatGPT提交生图',
  'chatgpt-generate-image-query': 'ChatGPT查询生图',
}

const filters = reactive({
  status: '',
  platform: '',
  accountKey: '',
  opId: '',
  taskId: '',
  timeRange: 'recent',
})
const page = ref(1)
const limit = 10
const diagnosticLimit = 12
const queueLimit = 50
const queueTasks = ref([])
const queueTotal = ref(0)
const queueLoading = ref(false)
const queueError = ref('')
const screenshotDialogTask = ref(null)
const executions = ref([])
const total = ref(0)
const pageCount = ref(0)
const loading = ref(false)
const error = ref('')
const loadedAt = ref('')
const expanded = ref({})
const diagnostics = ref({})
const diagnosticPages = ref({})
const diagnosticTotals = ref({})
const diagnosticPageCounts = ref({})
const diagnosticLoading = ref({})
const diagnosticErrors = ref({})
const pageVisible = ref(typeof document === 'undefined' || document.visibilityState === 'visible')
let pollTimer = null
let filterTimer = null
let requestToken = 0
let queueRequestToken = 0

const hasRunning = computed(() => executions.value.some(item => ['ready', 'running'].includes(item.status)))
const hasActiveQueue = computed(() => queueTasks.value.some(item => ['ready', 'running'].includes(item.status)))
const platformOptions = computed(() => Object.entries(props.platformIconUrls).map(([type, iconUrl]) => ({
  type,
  label: uploadPlatformText[type] || type,
  iconUrl,
})))
const timeRanges = [
  { value: 'recent', label: '近3小时' },
  { value: 'today', label: '今天' },
  { value: 'yesterday', label: '昨天' },
  { value: 'beforeYesterday', label: '前天' },
]

onMounted(() => {
  restoreQuery()
  loadQueue()
  loadExecutions()
  document.addEventListener('visibilitychange', handleVisibility)
})

onUnmounted(() => {
  stopPolling()
  clearFilterTimer()
  document.removeEventListener('visibilitychange', handleVisibility)
})

function restoreQuery() {
  const query = new URLSearchParams(window.location.search)
  page.value = positiveNumber(query.get('operatorPage'), 1)
  for (const key of Object.keys(filters)) {
    filters[key] = query.get(key) || ''
  }
  if (!timeRanges.some(item => item.value === filters.timeRange)) filters.timeRange = 'recent'
}

function syncQuery() {
  const query = new URLSearchParams(window.location.search)
  query.set('page', 'operator-diagnostics')
  query.set('operatorPage', String(page.value))
  for (const [key, value] of Object.entries(filters)) {
    if (value) query.set(key, value)
    else query.delete(key)
  }
  window.history.replaceState(null, '', `${window.location.pathname}?${query.toString()}`)
}

async function loadExecutions({ silent = false } = {}) {
  const token = ++requestToken
  if (!silent) loading.value = true
  error.value = ''
  syncQuery()
  try {
    const response = await props.api.listTasks({
      page: page.value,
      limit,
      status: filters.status,
      platform: filters.platform,
      accountKey: filters.accountKey,
      opId: filters.opId,
      taskId: filters.taskId,
      ...timeRangeParams(filters.timeRange),
      sort: 'created_desc',
    })
    if (token !== requestToken) return
    executions.value = response.items || []
    total.value = Number(response.total || 0)
    pageCount.value = Number(response.pageCount || 0)
    loadedAt.value = new Date().toLocaleTimeString()
    if (pageCount.value && page.value > pageCount.value) {
      page.value = pageCount.value
      await loadExecutions({ silent })
      return
    }
    ensureDefaultExpanded()
    refreshExpandedDiagnostics({ onlyActive: true })
    syncPolling()
  } catch (err) {
    if (token === requestToken) error.value = err instanceof Error ? err.message : String(err)
  } finally {
    if (token === requestToken) loading.value = false
  }
}

async function loadQueue({ silent = false } = {}) {
  const token = ++queueRequestToken
  if (!silent) queueLoading.value = true
  queueError.value = ''
  try {
    const response = await props.api.listQueue({
      page: 1,
      limit: queueLimit,
      ...timeRangeParams('recent'),
    })
    if (token !== queueRequestToken) return
    queueTasks.value = response.items || []
    queueTotal.value = Number(response.total || 0)
    syncPolling()
  } catch (err) {
    if (token === queueRequestToken) queueError.value = err instanceof Error ? err.message : String(err)
  } finally {
    if (token === queueRequestToken) queueLoading.value = false
  }
}

function ensureDefaultExpanded() {
  if (Object.keys(expanded.value).some(key => expanded.value[key])) return
  const target = executions.value.find(item => ['running', 'failed'].includes(item.status))
  if (target?.opId) {
    expanded.value = { ...expanded.value, [target.opId]: true }
  }
}

function filterChanged() {
  page.value = 1
  loadExecutions()
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

function setPage(nextPage) {
  const maxPage = pageCount.value || 1
  page.value = Math.min(maxPage, Math.max(1, nextPage))
  loadExecutions()
}

function toggle(opId) {
  expanded.value = { ...expanded.value, [opId]: !expanded.value[opId] }
  if (expanded.value[opId]) loadDiagnostics(opId)
}

async function refreshExecution(opId) {
  try {
    const row = await props.api.getTask(opId)
    executions.value = executions.value.map(item => item.opId === opId ? { ...item, ...row } : item)
    await loadDiagnostics(opId, { page: diagnosticPages.value[opId] || 1, force: true })
  } catch (err) {
    diagnosticErrors.value = { ...diagnosticErrors.value, [opId]: err instanceof Error ? err.message : String(err) }
  }
}

async function loadDiagnostics(opId, { page: nextPage = diagnosticPages.value[opId] || 1, force = false } = {}) {
  if (!opId || diagnosticLoading.value[opId]) return
  if (!force && diagnostics.value[opId] && diagnosticPages.value[opId] === nextPage) return
  diagnosticPages.value = { ...diagnosticPages.value, [opId]: nextPage }
  diagnosticLoading.value = { ...diagnosticLoading.value, [opId]: true }
  diagnosticErrors.value = { ...diagnosticErrors.value, [opId]: '' }
  try {
    const response = await props.api.getDiagnostics(opId, { page: nextPage, limit: diagnosticLimit })
    diagnostics.value = { ...diagnostics.value, [opId]: response.items || [] }
    diagnosticTotals.value = { ...diagnosticTotals.value, [opId]: Number(response.total || 0) }
    diagnosticPageCounts.value = { ...diagnosticPageCounts.value, [opId]: Number(response.pageCount || 0) }
  } catch (err) {
    diagnosticErrors.value = { ...diagnosticErrors.value, [opId]: err instanceof Error ? err.message : String(err) }
  } finally {
    const next = { ...diagnosticLoading.value }
    delete next[opId]
    diagnosticLoading.value = next
  }
}

function setDiagnosticPage(opId, nextPage) {
  const maxPage = diagnosticPageCounts.value[opId] || 1
  const normalized = Math.min(maxPage, Math.max(1, nextPage))
  loadDiagnostics(opId, { page: normalized, force: true })
}

function refreshExpandedDiagnostics({ onlyActive = false } = {}) {
  executions.value
    .filter(item => expanded.value[item.opId])
    .filter(item => !onlyActive || ['ready', 'running'].includes(item.status))
    .forEach(item => {
      refreshExecution(item.opId)
    })
}

function handleVisibility() {
  pageVisible.value = document.visibilityState === 'visible'
  syncPolling()
}

function syncPolling() {
  stopPolling()
  if (!pageVisible.value || (!hasRunning.value && !hasActiveQueue.value)) return
  pollTimer = window.setInterval(() => {
    loadQueue({ silent: true })
    loadExecutions({ silent: true })
  }, 10000)
}

function stopPolling() {
  if (pollTimer) window.clearInterval(pollTimer)
  pollTimer = null
}

async function copyText(text) {
  await navigator.clipboard?.writeText(String(text || ''))
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

function timeRangeParams(range) {
  const now = new Date()
  if (range === 'today') return dayRange(now)
  if (range === 'yesterday') return dayRange(addDays(now, -1))
  if (range === 'beforeYesterday') return dayRange(addDays(now, -2))
  const from = new Date(now.getTime() - 3 * 60 * 60 * 1000)
  return {
    createdFrom: localDateTime(from),
    createdTo: localDateTime(now),
  }
}

function dayRange(date) {
  const from = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const to = new Date(from)
  to.setDate(to.getDate() + 1)
  return {
    createdFrom: localDateTime(from),
    createdTo: localDateTime(to),
  }
}

function addDays(date, days) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

function localDateTime(date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())} ${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}`
}

function platformIconUrl(platform) {
  return props.platformIconUrls?.[platform] || ''
}

function queueTaskType(row) {
  const type = row?.taskType || ''
  return row?.taskTypeDisplayName || taskTypeText[type] || row?.action || type || '-'
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

function positiveNumber(value, fallback) {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? Math.trunc(parsed) : fallback
}
</script>

<template>
  <section class="operator-diagnostics-page">
    <header class="operator-diagnostics-header">
      <div>
        <h1>诊断</h1>
        <p>每页 10 条 Operator 执行，展开后分页查看截图和 HTML。</p>
      </div>
    </header>

    <section class="operator-queue-panel">
      <header class="operator-queue-head">
        <div>
          <h2>Operator 队列</h2>
          <p>近 3 小时 operator_task，排队任务按 priority 排序，其余任务按创建时间排序。</p>
        </div>
        <div class="operator-queue-status">
          <span v-if="queueLoading">正在加载</span>
          <span v-else>共 {{ queueTotal }} 条</span>
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
              <td colspan="8" class="operator-queue-empty">没有近 3 小时 Operator 任务</td>
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
                  :disabled="!queueOpId(task)"
                  :title="queueOpId(task) ? `复制 opid：${queueOpId(task)}` : '无 opid'"
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
                  :title="`复制 taskid：${queueTaskId(task)}`"
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

    <div class="operator-filter-bar">
      <div class="operator-segment-filter">
        <span>状态</span>
        <div class="operator-segment-row">
          <button
            v-for="item in statuses"
            :key="item.value || 'all'"
            type="button"
            :class="{ active: filters.status === item.value }"
            @click="filters.status = item.value; filterChanged()"
          >
            {{ item.label }}
          </button>
        </div>
      </div>
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

    <div class="operator-page-status">
      <span v-if="loading">正在加载</span>
      <span v-else>共 {{ total }} 条<span v-if="loadedAt"> · {{ loadedAt }}</span></span>
      <span v-if="error" class="operator-page-error">{{ error }}</span>
    </div>

    <div class="operator-card-list">
      <p v-if="!loading && !executions.length" class="flow-muted">没有 Operator 执行</p>
      <OperatorExecutionCard
        v-for="execution in executions"
        :key="execution.opId"
        :execution="execution"
        :platform-icon-urls="platformIconUrls"
        :expanded="Boolean(expanded[execution.opId])"
        :diagnostics="diagnostics[execution.opId] || []"
        :diagnostic-page="diagnosticPages[execution.opId] || 1"
        :diagnostic-page-count="diagnosticPageCounts[execution.opId] || 0"
        :diagnostic-total="diagnosticTotals[execution.opId] || 0"
        :loading="Boolean(diagnosticLoading[execution.opId])"
        :error="diagnosticErrors[execution.opId] || ''"
        @toggle="toggle"
        @refresh="refreshExecution"
        @set-diagnostic-page="setDiagnosticPage"
        @copy="copyText"
      />
    </div>

    <footer class="operator-pagination">
      <button type="button" :disabled="page <= 1" @click="setPage(1)">首页</button>
      <button type="button" :disabled="page <= 1" @click="setPage(page - 1)">上一页</button>
      <span>{{ page }} / {{ pageCount || 1 }}</span>
      <button type="button" :disabled="page >= (pageCount || 1)" @click="setPage(page + 1)">下一页</button>
      <button type="button" :disabled="page >= (pageCount || 1)" @click="setPage(pageCount || 1)">末页</button>
    </footer>

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

.operator-diagnostics-header p {
  margin: 0;
  color: #64748b;
}

.operator-pagination button {
  min-height: 34px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  background: #fff;
  color: #0f172a;
  padding: 0 12px;
  cursor: pointer;
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

.operator-queue-head p {
  margin: 0;
  color: #64748b;
  font-size: 13px;
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
  cursor: pointer;
}

.operator-queue-platform-button:disabled {
  cursor: default;
}

.operator-queue-task-id {
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  padding: 0;
  cursor: copy;
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

.operator-page-status {
  min-height: 24px;
  color: #64748b;
}

.operator-page-error {
  margin-left: 12px;
  color: #b91c1c;
}

.operator-card-list {
  display: grid;
  gap: 12px;
}

.operator-pagination {
  display: flex;
  align-items: center;
  gap: 8px;
  justify-content: center;
}

.operator-pagination button:disabled {
  cursor: not-allowed;
  opacity: 0.5;
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
