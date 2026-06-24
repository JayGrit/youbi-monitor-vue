<script setup>
import { MONITOR_PAGE_SIZE, statusText } from '../domain/constants'
import { formatDateTime, formatDuration } from '../utils/format'
import TaskProgressGraph from '../components/monitor/TaskProgressGraph.vue'

const props = defineProps({
  error: { type: String, default: '' },
  loading: { type: Boolean, default: false },
  tasks: { type: Array, default: () => [] },
  serviceHeartbeats: { type: Array, default: () => [] },
  taskStatusFilters: { type: Array, default: () => [] },
  taskStatusFilter: { type: String, default: 'all' },
  taskTypeFilter: { type: String, default: 'all' },
  taskTypeFilters: { type: Array, default: () => [] },
  taskStageFilter: { type: String, default: 'all' },
  taskStageFilters: { type: Array, default: () => [] },
  taskIdFilter: { type: String, default: '' },
  taskSort: { type: String, default: 'created_desc' },
  taskPage: { type: Number, default: 1 },
  taskTotalCount: { type: Number, default: 0 },
  taskPageCount: { type: Number, default: 1 },
  taskActionsExpanded: { type: Boolean, default: false },
  filteredTasks: { type: Array, default: () => [] },
  hasTaskFilter: { type: Boolean, default: false },
  pagedTasks: { type: Array, default: () => [] },
  openFailureKey: { type: String, default: '' },
  progressByTaskId: { type: Object, default: () => ({}) },
  taskDetailsExpanded: { type: Boolean, default: false },
  taskProgressLoading: { type: Boolean, default: false },
  taskProgressError: { type: String, default: '' },
  serviceOnline: { type: Function, required: true },
  onlineDeviceTitle: { type: Function, required: true },
  onlineDeviceText: { type: Function, required: true },
  toggleTaskActions: { type: Function, required: true },
  taskActionsOpen: { type: Function, required: true },
  taskThumbnailUrl: { type: Function, required: true },
  taskSourceUrl: { type: Function, required: true },
  displayTitle: { type: Function, required: true },
  taskCachedThumbnailUrl: { type: Function, required: true },
  markImageBroken: { type: Function, required: true },
  copyTaskId: { type: Function, required: true },
  sourceDurationSeconds: { type: Function, required: true },
  taskTypeText: { type: Function, required: true },
  minioStorageText: { type: Function, required: true },
  stageName: { type: Function, required: true },
  nodeProgress: { type: Function, required: true },
  nodeTitle: { type: Function, required: true },
  openTaskFlow: { type: Function, required: true },
  toggleTaskDetails: { type: Function, required: true },
  isTaskReadyBusy: { type: Function, required: true },
  markTaskReady: { type: Function, required: true },
  isTaskStopBusy: { type: Function, required: true },
  stopTask: { type: Function, required: true },
  isTaskRestartBusy: { type: Function, required: true },
  restartTask: { type: Function, required: true },
  isTaskDeleteBusy: { type: Function, required: true },
  deleteTask: { type: Function, required: true },
  failureKey: { type: Function, required: true },
  failureDetails: { type: Function, required: true },
})

const emit = defineEmits([
  'update:taskStatusFilter',
  'update:taskTypeFilter',
  'update:taskStageFilter',
  'update:taskIdFilter',
  'update:taskSort',
  'applyTaskIdFilter',
  'setTaskPage',
  'clearFailure',
])

function displayTaskCount() {
  return props.taskTotalCount || props.filteredTasks.length
}

function taskStatusSummary(task) {
  const status = statusText[task?.status] || task?.status || '-'
  return task?.status === 'running' && task?.currentStage
    ? `${status} · ${props.stageName(task.currentStage)}`
    : status
}

function onlineDeviceNames(service) {
  return (service?.devices || [])
    .filter(device => device.online)
    .map(device => String(device.deviceName || '').trim())
    .filter(Boolean)
}
</script>

<template>
  <section v-if="error || loading" class="status-line">
    <span v-if="error">接口异常：{{ error }}</span>
    <span v-else-if="loading">正在加载</span>
  </section>

  <section class="heartbeat-panel" aria-label="服务设备在线状态">
    <div class="service-device-row">
      <div
        v-for="service in serviceHeartbeats"
        :key="service.serviceName"
        :class="['service-device-cell', serviceOnline(service) ? 'online' : 'offline']"
        :title="onlineDeviceTitle(service)"
      >
        <strong>{{ service.serviceName }}</strong>
        <span v-if="onlineDeviceNames(service).length" class="service-device-names">
          <span v-for="name in onlineDeviceNames(service)" :key="name" class="service-device-name">
            {{ name }}
          </span>
        </span>
        <span v-else class="service-device-name offline">
          离线
        </span>
      </div>
    </div>
  </section>

  <section class="task-list" aria-label="任务列表">
    <div class="task-filter-bar" aria-label="任务状态筛选">
      <template v-for="filter in taskStatusFilters" :key="filter.key">
        <span
          v-if="filter.key === 'running'"
          :class="['task-running-filter', { active: taskStatusFilter === filter.key }]"
        >
          <button
            type="button"
            :class="['task-filter-button', { active: taskStatusFilter === filter.key }]"
            @click="emit('update:taskStatusFilter', filter.key)"
          >
            <span>{{ filter.label }}</span>
          </button>
          <select
            v-if="taskStatusFilter === filter.key"
            class="task-stage-filter"
            :value="taskStageFilter"
            aria-label="按执行中 stage 筛选"
            title="按执行中 stage 筛选"
            @change="emit('update:taskStageFilter', $event.target.value)"
          >
            <option value="all">全部阶段</option>
            <option v-for="stage in taskStageFilters" :key="stage.key" :value="stage.key">{{ stage.label }}</option>
          </select>
        </span>
        <button
          v-else
          type="button"
          :class="['task-filter-button', { active: taskStatusFilter === filter.key }]"
          @click="emit('update:taskStatusFilter', filter.key)"
        >
          <span>{{ filter.label }}</span>
        </button>
      </template>
      <select
        class="task-type-filter"
        :value="taskTypeFilter"
        aria-label="按任务 type 筛选"
        @change="emit('update:taskTypeFilter', $event.target.value)"
      >
        <option value="all">Type</option>
        <option v-for="type in taskTypeFilters" :key="type" :value="type">{{ type }}</option>
      </select>
      <form class="task-id-filter" @submit.prevent="emit('applyTaskIdFilter')">
        <input
          :value="taskIdFilter"
          type="search"
          placeholder="搜索任务 ID"
          aria-label="按任务 ID 搜索"
          @input="emit('update:taskIdFilter', $event.target.value)"
        />
        <button type="submit">搜索</button>
      </form>
      <button
        type="button"
        :class="['task-filter-button', 'task-details-toggle', { active: taskDetailsExpanded }]"
        :disabled="taskProgressLoading && !taskDetailsExpanded"
        @click="toggleTaskDetails"
      >
        {{ taskDetailsExpanded ? '收起全部详情' : (taskProgressLoading ? '加载详情中' : '展开全部详情') }}
      </button>
      <button
        type="button"
        :class="['task-filter-button', 'task-actions-toggle', { active: taskActionsExpanded }]"
        @click="toggleTaskActions"
      >
        {{ taskActionsExpanded ? '收起操作' : '展开操作' }}
      </button>
      <button
        type="button"
        :class="['task-filter-button', 'task-sort-button', { active: taskSort === 'minio_storage_desc' }]"
        title="按 MinIO 占用体积降序排序"
        @click="emit('update:taskSort', taskSort === 'minio_storage_desc' ? 'created_desc' : 'minio_storage_desc')"
      >
        {{ taskSort === 'minio_storage_desc' ? '体积降序' : '按体积排' }}
      </button>
    </div>

    <div v-if="taskDetailsExpanded && taskProgressError" class="task-progress-global-error">
      详情刷新失败：{{ taskProgressError }}；将在 10 秒后自动重试。
    </div>

    <div v-if="!loading && !hasTaskFilter && tasks.length === 0" class="empty-state">
      暂无任务
    </div>
    <div v-else-if="!loading && filteredTasks.length === 0" class="empty-state">
      当前筛选下暂无任务
    </div>

    <article
      v-for="task in pagedTasks"
      :key="task.taskId"
      :class="['task-row', `status-${task.status}`]"
    >
      <a
        v-if="taskThumbnailUrl(task)"
        class="task-cover"
        :href="taskSourceUrl(task) || taskThumbnailUrl(task)"
        target="_blank"
        rel="noreferrer"
        :title="displayTitle(task)"
      >
        <img
          :src="taskCachedThumbnailUrl(task)"
          :alt="displayTitle(task)"
          loading="lazy"
          @error="markImageBroken(taskThumbnailUrl(task))"
        />
      </a>
      <div v-else class="task-cover task-cover-empty" aria-hidden="true">无封面</div>

      <div class="task-meta">
        <div class="task-title-row">
          <h2>
            <a
              v-if="taskSourceUrl(task)"
              :href="taskSourceUrl(task)"
              target="_blank"
              rel="noreferrer"
              :title="taskSourceUrl(task)"
            >
              {{ displayTitle(task) }}
            </a>
            <template v-else>{{ displayTitle(task) }}</template>
          </h2>
        </div>
        <div class="task-details">
          <span
            role="button"
            tabindex="0"
            title="点击复制任务 ID"
            @click="copyTaskId(task)"
            @keydown.enter.prevent="copyTaskId(task)"
            @keydown.space.prevent="copyTaskId(task)"
          >{{ task.taskId }}</span>
          <span v-if="sourceDurationSeconds(task) !== null">{{ formatDuration(sourceDurationSeconds(task)) }}</span>
          <span class="task-type">{{ taskTypeText(task) }}</span>
          <span
            v-if="minioStorageText(task)"
            class="task-minio-storage"
            :title="task.minioStorageUpdatedAt ? `更新于 ${formatDateTime(task.minioStorageUpdatedAt)}` : '等待 backuper 扫描'"
          >
            {{ minioStorageText(task) }}
          </span>
        </div>
        <p v-if="task.errorMessage" class="task-error">{{ task.errorMessage }}</p>
      </div>

      <div v-if="!taskDetailsExpanded" class="task-progress-summary">
        <strong>{{ taskStatusSummary(task) }}</strong>
      </div>
      <div v-if="taskDetailsExpanded" class="task-progress-detail">
        <div v-if="!progressByTaskId[task.taskId] && taskProgressLoading" class="task-progress-loading">
          正在加载详情
        </div>
        <TaskProgressGraph
          v-else-if="progressByTaskId[task.taskId]"
          :task="task"
          :progress="progressByTaskId[task.taskId]"
          :node-progress="nodeProgress"
          :node-title="nodeTitle"
          :open-task-flow="openTaskFlow"
        />
      </div>
      <div class="task-action-rail" :class="{ open: taskActionsOpen() }">
        <button
          v-if="task.status === 'failed'"
          type="button"
          class="retry-button"
          :disabled="isTaskReadyBusy(task)"
          title="把任务切回排队中"
          @click="markTaskReady(task)"
        >
          {{ isTaskReadyBusy(task) ? '处理中' : '重试' }}
        </button>
        <button
          v-if="task.status === 'running'"
          type="button"
          class="stop-button"
          :disabled="isTaskStopBusy(task)"
          title="停止任务并阻止后续阶段继续排队"
          @click="stopTask(task)"
        >
          {{ isTaskStopBusy(task) ? '处理中' : '停止' }}
        </button>
        <button
          v-if="task.status !== 'running'"
          type="button"
          class="restart-button"
          :disabled="isTaskRestartBusy(task)"
          title="删除已生成结果并从 downloader 重新开始"
          @click="restartTask(task)"
        >
          {{ isTaskRestartBusy(task) ? '处理中' : '从头开始' }}
        </button>
        <button
          v-if="task.status !== 'running'"
          type="button"
          class="delete-button"
          :disabled="isTaskDeleteBusy(task)"
          title="永久删除任务数据库记录和 MinIO 文件"
          @click="deleteTask(task)"
        >
          {{ isTaskDeleteBusy(task) ? '处理中' : '删除' }}
        </button>
      </div>
      <div
        v-for="node in (progressByTaskId[task.taskId]?.nodes || [])"
        v-show="openFailureKey === failureKey(task, node)"
        :key="`${node.key}-failure`"
        class="failure-panel"
      >
        <div class="failure-panel-head">
          <strong>{{ stageName(node) }}失败原因</strong>
          <button type="button" @click="emit('clearFailure')">收起</button>
        </div>
        <pre>{{ failureDetails(node) }}</pre>
      </div>
    </article>

    <nav v-if="!loading && filteredTasks.length > 0" class="task-pagination" aria-label="任务分页">
      <span>共 {{ displayTaskCount() }} 个，一页 {{ MONITOR_PAGE_SIZE }} 个</span>
      <div>
        <button type="button" :disabled="taskPage <= 1" @click="emit('setTaskPage', taskPage - 1)">上一页</button>
        <strong>{{ taskPage }} / {{ taskPageCount }}</strong>
        <button type="button" :disabled="taskPage >= taskPageCount" @click="emit('setTaskPage', taskPage + 1)">下一页</button>
      </div>
    </nav>
  </section>
</template>
