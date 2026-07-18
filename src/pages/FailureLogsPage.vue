<script setup>
import { ref } from 'vue'
import { stageNameText } from '../domain/constants'
import { formatDateTime } from '../utils/format'
import { normalizeUploadPlatform } from '../utils/uploadPlatform'

const props = defineProps({
  rows: { type: Array, default: () => [] },
  filteredRows: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  error: { type: String, default: '' },
  actionError: { type: String, default: '' },
  actionBusy: { type: Boolean, default: false },
  loadedAt: { type: String, default: '' },
  stageFilter: { type: String, default: 'all' },
  topicFilter: { type: String, default: 'all' },
  timeFilter: { type: String, default: 'all' },
  platformFilter: { type: Array, default: () => [] },
  stageOptions: { type: Array, default: () => [] },
  topicOptions: { type: Array, default: () => [] },
  platformOptions: { type: Array, default: () => [] },
  platformIconUrls: { type: Object, default: () => ({}) },
  selectedIds: { type: Array, default: () => [] },
  selectedSet: { type: Object, required: true },
  allSelected: { type: Boolean, default: false },
  actualPublishedSelectedRows: { type: Array, default: () => [] },
  retryUploadSelectedRows: { type: Array, default: () => [] },
  abandonUploadSelectedRows: { type: Array, default: () => [] },
  deferSelectedRows: { type: Array, default: () => [] },
  loadFailureLogs: { type: Function, required: true },
  markSelectedActualPublished: { type: Function, required: true },
  retrySelectedUploads: { type: Function, required: true },
  abandonSelectedUploads: { type: Function, required: true },
  deferSelectedTasks: { type: Function, required: true },
  toggleRow: { type: Function, required: true },
  toggleAll: { type: Function, required: true },
  clearSelection: { type: Function, required: true },
  resetFilters: { type: Function, required: true },
  openTaskFlow: { type: Function, required: true },
  copyTaskId: { type: Function, required: true },
})

const actionsExpanded = ref(false)
const actionMode = ref('')

const emit = defineEmits([
  'update:stageFilter',
  'update:topicFilter',
  'update:timeFilter',
  'update:platformFilter',
])

function stageText(row) {
  return stageNameText[row.stage] || row.stage || '-'
}

function platformFilterText() {
  if (props.platformFilter.length === 0) return '全部平台'
  return props.platformFilter.join(', ')
}

function togglePlatform(platform) {
  const selected = new Set(props.platformFilter)
  if (selected.has(platform)) {
    selected.delete(platform)
  } else {
    selected.add(platform)
  }
  emit('update:platformFilter', [...selected])
}

function openTask(row) {
  props.openTaskFlow({ taskId: row.taskId }, row.stage)
}

function canMarkActualPublished(row) {
  return row.stage === 'uploader' && Boolean(row.platform) && Boolean(parseUploadLogId(row.id))
}

function canRetryUpload(row) {
  return canMarkActualPublished(row)
}

function canAbandonUpload(row) {
  return canMarkActualPublished(row)
}

function canDeferTask(row) {
  return Boolean(row.taskId)
}

function canSelectRow(row) {
  if (actionMode.value === 'actual-published') return canMarkActualPublished(row)
  if (actionMode.value === 'retry-upload') return canRetryUpload(row)
  if (actionMode.value === 'abandon-upload') return canAbandonUpload(row)
  if (actionMode.value === 'defer') return canDeferTask(row)
  return canMarkActualPublished(row) || canRetryUpload(row) || canAbandonUpload(row) || canDeferTask(row)
}

function openActionMode(mode) {
  actionsExpanded.value = true
  actionMode.value = mode
}

function closeActions() {
  actionsExpanded.value = false
  actionMode.value = ''
  props.clearSelection()
}

function submitSelectedAction() {
  if (actionMode.value === 'actual-published') {
    props.markSelectedActualPublished()
    return
  }
  if (actionMode.value === 'retry-upload') {
    props.retrySelectedUploads()
    return
  }
  if (actionMode.value === 'abandon-upload') {
    props.abandonSelectedUploads()
    return
  }
  if (actionMode.value === 'defer') {
    props.deferSelectedTasks()
  }
}

function selectedActionCount() {
  if (actionMode.value === 'actual-published') return props.actualPublishedSelectedRows.length
  if (actionMode.value === 'retry-upload') return props.retryUploadSelectedRows.length
  if (actionMode.value === 'abandon-upload') return props.abandonUploadSelectedRows.length
  if (actionMode.value === 'defer') return props.deferSelectedRows.length
  return 0
}

function actionModeText() {
  if (actionMode.value === 'actual-published') return '实际发布'
  if (actionMode.value === 'retry-upload') return '重试上传'
  if (actionMode.value === 'abandon-upload') return '放弃发布'
  if (actionMode.value === 'defer') return '稍后执行'
  return '批量操作'
}

function parseUploadLogId(logId) {
  const parts = String(logId || '').split(':')
  if (parts.length !== 3 || parts[0] !== 'uploader' || !parts[1]) return null
  const id = Number(parts[2])
  if (!Number.isSafeInteger(id) || id <= 0) return null
  const platform = normalizeUploadPlatform(parts[1])
  if (!platform) return null
  return { platform, id }
}
</script>

<template>
  <section class="failure-log-page">
    <div class="failure-log-header">
      <div>
        <h1>错误日志</h1>
        <p>
          共 {{ rows.length }} 条，当前显示 {{ filteredRows.length }} 条
          <span v-if="loadedAt"> · 加载于 {{ formatDateTime(loadedAt) }}</span>
        </p>
      </div>
      <div class="failure-log-header-actions">
        <button type="button" :class="{ active: actionMode === 'actual-published' }" @click="openActionMode('actual-published')">
          实际发布
        </button>
        <button type="button" :class="{ active: actionMode === 'retry-upload' }" @click="openActionMode('retry-upload')">
          重试上传
        </button>
        <button type="button" :class="{ active: actionMode === 'abandon-upload' }" @click="openActionMode('abandon-upload')">
          放弃发布
        </button>
        <button type="button" :class="{ active: actionMode === 'defer' }" @click="openActionMode('defer')">
          稍后执行
        </button>
        <button v-if="actionsExpanded" type="button" @click="closeActions">
          收起操作
        </button>
        <button type="button" :disabled="loading" @click="loadFailureLogs">
          {{ loading ? '加载中' : '刷新' }}
        </button>
      </div>
    </div>

    <div class="failure-log-filters" aria-label="错误日志筛选">
      <label>
        <span>失败阶段</span>
        <select :value="stageFilter" @change="emit('update:stageFilter', $event.target.value)">
          <option value="all">全部阶段</option>
          <option v-for="stage in stageOptions" :key="stage" :value="stage">
            {{ stageNameText[stage] || stage }}
          </option>
        </select>
      </label>
      <label>
        <span>Topic</span>
        <select :value="topicFilter" @change="emit('update:topicFilter', $event.target.value)">
          <option value="all">全部 Topic</option>
          <option v-for="topic in topicOptions" :key="topic" :value="topic">{{ topic }}</option>
        </select>
      </label>
      <label>
        <span>失败时间</span>
        <select :value="timeFilter" @change="emit('update:timeFilter', $event.target.value)">
          <option value="all">全部时间</option>
          <option value="today">今天</option>
          <option value="yesterday">昨天</option>
          <option value="before">之前</option>
        </select>
      </label>
      <label class="failure-log-platform-filter">
        <span>平台</span>
        <details class="failure-log-platform-menu">
          <summary>{{ platformFilterText() }}</summary>
          <div class="failure-log-platform-options">
            <label v-for="platform in platformOptions" :key="platform">
              <input
                type="checkbox"
                :checked="platformFilter.includes(platform)"
                @change="togglePlatform(platform)"
              >
              <span>{{ platform }}</span>
            </label>
          </div>
        </details>
      </label>
      <button type="button" class="failure-log-reset" @click="resetFilters">重置筛选</button>
    </div>

    <div v-if="actionsExpanded" class="failure-log-bulk-panel">
      <div>
        <strong>{{ actionModeText() }}</strong>
        <p>
          已选 {{ selectedIds.length }} 条，当前操作可执行 {{ selectedActionCount() }} 条。
          当前模式只会处理可执行的行。
        </p>
      </div>
      <div class="failure-log-bulk-actions">
        <button type="button" :disabled="filteredRows.length === 0 || actionBusy" @click="toggleAll">
          {{ allSelected ? '取消全选' : '全选可操作' }}
        </button>
        <button type="button" :disabled="selectedIds.length === 0 || actionBusy" @click="clearSelection">
          清空
        </button>
        <button
          type="button"
          class="primary"
          :disabled="!actionMode || selectedActionCount() === 0 || actionBusy"
          @click="submitSelectedAction"
        >
          {{ actionBusy ? '处理中' : `执行${actionModeText()} ${selectedActionCount()}` }}
        </button>
      </div>
    </div>

    <div v-if="error" class="failure-log-message error">接口异常：{{ error }}</div>
    <div v-else-if="actionError" class="failure-log-message error">操作失败：{{ actionError }}</div>
    <div v-else-if="loading && rows.length === 0" class="failure-log-message">正在加载错误日志</div>
    <div v-else-if="filteredRows.length === 0" class="failure-log-message">没有符合条件的错误日志</div>

    <div v-else class="failure-log-table-wrap">
      <table class="failure-log-table">
        <thead>
          <tr>
            <th v-if="actionsExpanded" class="failure-log-select-column">选择</th>
            <th>阶段</th>
            <th>Topic</th>
            <th class="failure-log-platform-column">平台</th>
            <th class="failure-log-task-column">任务</th>
            <th class="failure-log-time-column">失败时间</th>
            <th>错误日志</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in filteredRows" :key="row.id">
            <td v-if="actionsExpanded" class="failure-log-select-column">
              <input
                v-if="canSelectRow(row)"
                type="checkbox"
                :checked="selectedSet.has(row.id)"
                :disabled="actionBusy"
                :title="actionModeText()"
                @change="toggleRow(row)"
              >
              <span v-else>-</span>
            </td>
            <td><span class="failure-log-stage">{{ stageText(row) }}</span></td>
            <td>{{ row.topic || '-' }}</td>
            <td class="failure-log-platform-column">
              <img
                v-if="row.platform && platformIconUrls[row.platform]"
                class="failure-log-platform-icon"
                :src="platformIconUrls[row.platform]"
                :alt="row.platform"
                :title="row.platform"
              >
              <span v-else>-</span>
            </td>
            <td class="failure-log-task-column">
              <div class="failure-log-task">
                <button type="button" class="failure-log-task-title" @click="openTask(row)">
                  {{ row.title || row.taskId }}
                </button>
                <button
                  type="button"
                  class="failure-log-task-id"
                  title="复制 Task ID"
                  @click="copyTaskId({ taskId: row.taskId })"
                >
                  {{ row.taskId }}
                </button>
              </div>
            </td>
            <td class="failure-log-time-column failure-log-time">{{ formatDateTime(row.failedAt) }}</td>
            <td><pre>{{ row.errorMessage || '未知错误' }}</pre></td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>
