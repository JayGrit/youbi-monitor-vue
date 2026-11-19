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
  topic: '',
  opId: '',
  taskId: '',
  taskIdMatch: '',
  timeRange: 'recent',
})
const page = ref(1)
const pageCount = ref(0)
const total = ref(0)
const limit = 50
const queueTasks = ref([])
const queueLoading = ref(false)
const queueError = ref('')
const editMode = ref('')
const selectedForDeletion = ref([])
const priorityEdits = ref({})
const editSaving = ref(false)
const editMessage = ref('')
const editError = ref('')
const priorityChanges = computed(() => queueTasks.value.flatMap(task => {
  const opId = queueOpId(task)
  const priority = priorityEdits.value[opId]
  return priority !== undefined && priority !== String(task.priority ?? '')
    ? [{ opId, priority: priority.trim() }]
    : []
}))
const screenshotDialogTask = ref(null)
let filterTimer = null
let queueRequestToken = 0
const { copyToastVisible, copyText } = useCopyToast()
const { syncPolling, stopPolling } = usePageVisibilityPolling(() => {
  loadQueue({ silent: true })
}, () => hasActiveQueue.value && !editMode.value)

const hasActiveQueue = ref(false)
const platformOptions = computed(() => Object.entries(props.platformIconUrls).map(([type, iconUrl]) => ({
  type,
  label: uploadPlatformText[type] || type,
  iconUrl,
})))
const timeRanges = [...recentTimeRanges, { value: 'all', label: '全部' }]

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
  const savedPage = Number(query.get('operatorPage'))
  if (Number.isSafeInteger(savedPage) && savedPage > 0) page.value = savedPage
  if (!timeRanges.some(item => item.value === filters.timeRange)) filters.timeRange = 'recent'
}

function syncQuery() {
  const query = new URLSearchParams(window.location.search)
  query.set('page', 'operator-diagnostics')
  query.delete('status')
  query.set('operatorPage', String(page.value))
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
    const response = await props.api.listQueue(queueParams())
    if (token !== queueRequestToken) return
    queueTasks.value = response.items || []
    total.value = response.total ?? queueTasks.value.length
    page.value = response.page ?? 1
    pageCount.value = response.pageCount ?? 0
    hasActiveQueue.value = response.hasActive ?? queueTasks.value.some(item => ['ready', 'running'].includes(item.status))
    syncQuery()
    syncPolling()
  } catch (err) {
    if (token === queueRequestToken) queueError.value = err instanceof Error ? err.message : String(err)
  } finally {
    if (token === queueRequestToken) queueLoading.value = false
  }
}

function queueParams() {
  return {
    platform: filters.platform,
    topic: filters.topic,
    opId: filters.opId,
    taskId: filters.taskId,
    exactTaskId: filters.taskIdMatch === 'exact' ? filters.taskId : '',
    page: page.value,
    limit,
    ...(filters.timeRange === 'all' ? {} : timeRangeParams(filters.timeRange)),
  }
}

function filterChanged() {
  clearFilterTimer()
  if (editMode.value) return
  page.value = 1
  loadQueue()
}

function setPage(nextPage) {
  page.value = nextPage
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

function setEditMode(mode) {
  editMode.value = mode
  selectedForDeletion.value = []
  priorityEdits.value = {}
  editError.value = ''
  editMessage.value = ''
  syncPolling()
}

async function saveQueueEdits() {
  if (editSaving.value) return
  const deleting = editMode.value === 'delete'
  const tasks = deleting
    ? selectedForDeletion.value.map(opId => ({ opId }))
    : priorityChanges.value
  if (!tasks.length) return
  if (!deleting && tasks.some(task => !/^[+-]?[0-9]+$/.test(task.priority))) {
    editError.value = '优先级请输入整数。'
    return
  }
  if (deleting && !window.confirm(`删除选中的 ${tasks.length} 个未开始任务？`)) return

  editSaving.value = true
  editError.value = ''
  try {
    const result = deleting
      ? await props.api.deleteQueueTasks(tasks)
      : await props.api.updateQueuePriorities(tasks)
    setEditMode('')
    const skipped = result.skipped || []
    const details = skipped.map(task => `${task.opId}（${task.reason === 'already_started' ? '已开始' : '已不存在'}）`)
    editMessage.value = `已${deleting ? '删除' : '调整'} ${result.applied.length} 个任务`
    if (details.length) editMessage.value += `。跳过 ${details.length} 个任务：${details.join('、')}`
    await loadQueue()
  } catch (err) {
    editError.value = err instanceof Error ? err.message : String(err)
  } finally {
    editSaving.value = false
  }
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
    task?.topic,
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

    <fieldset class="operator-filter-bar" :disabled="Boolean(editMode)">
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
          topic
          <input v-model.trim="filters.topic" type="search" @input="filterChangedDebounced" />
        </label>
        <label>
          op_id
          <input v-model.trim="filters.opId" type="search" @input="filterChangedDebounced" />
        </label>
        <label>
          task_id
          <input v-model.trim="filters.taskId" type="search" @input="filterChangedDebounced" />
        </label>
        <label class="operator-exact-filter">
          <input v-model="filters.taskIdMatch" type="checkbox" true-value="exact" false-value="" @change="filterChanged" />
          精确匹配 task_id
        </label>
      </div>
    </fieldset>

    <section class="operator-queue-panel">
      <header class="operator-queue-head">
        <div>
          <h2>Operator 队列</h2>
        </div>
        <div class="operator-queue-status">
          <span v-if="queueLoading">正在加载</span>
          <button type="button" :disabled="queueLoading || editSaving || Boolean(editMode)" @click="loadQueue">刷新</button>
          <template v-if="!editMode">
            <button type="button" :disabled="queueLoading || !queueTasks.some(task => task.deletable)" @click="setEditMode('delete')">删除</button>
            <button type="button" :disabled="queueLoading || !queueTasks.length" @click="setEditMode('priority')">调整</button>
          </template>
          <template v-else>
            <button
              type="button"
              :disabled="editSaving || (editMode === 'delete' ? !selectedForDeletion.length : !priorityChanges.length)"
              @click="saveQueueEdits"
            >
              {{ editMode === 'delete' ? `删除所选（${selectedForDeletion.length}）` : '保存优先级' }}
            </button>
            <button type="button" :disabled="editSaving" @click="setEditMode('')">取消</button>
          </template>
        </div>
      </header>
      <div v-if="queueError || editError" class="operator-page-error" role="alert">{{ editError || queueError }}</div>
      <div v-if="editMessage" class="operator-queue-message" role="status">{{ editMessage }}</div>
      <div class="operator-queue-table-wrap">
        <table class="operator-queue-table">
          <thead>
            <tr>
              <th v-if="editMode === 'delete'">选择</th>
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
              <td :colspan="editMode === 'delete' ? 10 : 9" class="operator-queue-empty">没有 Operator 任务</td>
            </tr>
            <tr
              v-for="task in queueTasks"
              :key="task.opId || task.runId || task.id"
              :class="[
                'operator-queue-row',
                `operator-queue-${task.status || 'unknown'}`,
                { 'operator-queue-clickable': !editMode && canOpenScreenshotDialog(task) },
              ]"
              @click="!editMode && canOpenScreenshotDialog(task) && openScreenshotDialog(task)"
            >
              <td v-if="editMode === 'delete'">
                <input
                  v-if="task.deletable"
                  v-model="selectedForDeletion"
                  type="checkbox"
                  :value="queueOpId(task)"
                  :disabled="editSaving"
                  :aria-label="`选择任务 ${queueOpId(task)}`"
                />
              </td>
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
              <td>{{ task.topic || '-' }}</td>
              <td>{{ relativeTime(task.createdAt) }}</td>
              <td>{{ waitingDurationText(task) }}</td>
              <td>{{ durationText(task) }}</td>
              <td class="operator-queue-priority">
                <input
                  v-if="editMode === 'priority'"
                  class="operator-priority-input"
                  type="text"
                  :aria-label="`任务 ${queueOpId(task)} 的优先级`"
                  :value="priorityEdits[queueOpId(task)] ?? task.priority"
                  :disabled="editSaving"
                  @input="priorityEdits[queueOpId(task)] = $event.target.value"
                />
                <span v-else>{{ task.priority ?? '-' }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <nav v-if="pageCount > 1" class="operator-queue-status operator-queue-pagination" aria-label="Operator 队列分页">
        <span>共 {{ total }} 条 · 第 {{ page }} / {{ pageCount }} 页</span>
        <button type="button" :disabled="queueLoading || Boolean(editMode) || page <= 1" @click="setPage(page - 1)">上一页</button>
        <button type="button" :disabled="queueLoading || Boolean(editMode) || page >= pageCount" @click="setPage(page + 1)">下一页</button>
      </nav>
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
.operator-filter-bar {
  min-width: 0;
  margin: 0;
  border: 0;
}

.operator-priority-input {
  width: 7rem;
  font: inherit;
  color: inherit;
}

.operator-search-row .operator-exact-filter {
  display: flex;
  flex-direction: row;
  align-items: center;
}

.operator-exact-filter input {
  width: auto;
}

.operator-queue-pagination {
  justify-content: flex-end;
  padding: 0.75rem;
}

.operator-queue-message {
  padding: 0.5rem 0;
  overflow-wrap: anywhere;
}

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
