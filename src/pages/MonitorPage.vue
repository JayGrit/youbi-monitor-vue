<script setup>
import { createPlatformIconUrls, MONITOR_PAGE_SIZE, uploadPlatformText } from '../domain/constants'
import { formatDateTime, formatDuration } from '../utils/format'

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
  uploadRetryPlatform: { type: String, default: '' },
  uploadRetryPlatformOptions: { type: Array, default: () => [] },
  uploadRetryRows: { type: Array, default: () => [] },
  uploadRetryLoading: { type: Boolean, default: false },
  uploadRetryBusy: { type: Boolean, default: false },
  uploadRetrySelectedIds: { type: Array, default: () => [] },
  uploadRetrySelectedSet: { type: Object, required: true },
  uploadRetryAllSelected: { type: Boolean, default: false },
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
  isTaskReadyBusy: { type: Function, required: true },
  markTaskReady: { type: Function, required: true },
  setUploadRetryPlatform: { type: Function, required: true },
  loadUploadRetryRows: { type: Function, required: true },
  toggleUploadRetryRow: { type: Function, required: true },
  toggleUploadRetryAll: { type: Function, required: true },
  retrySelectedUploadSubmissions: { type: Function, required: true },
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

const PLATFORM_ICON_URLS = createPlatformIconUrls(import.meta.env.BASE_URL)

function hasUploaderPlatformStatuses(node) {
  return node.key === 'uploader' && Array.isArray(node.platformStatuses) && node.platformStatuses.length > 0
}

function stageNodeStatusClass(node) {
  if (node.key === 'uploader' && node.status === 'running' && hasUploaderPlatformStatuses(node)) {
    return 'status-success'
  }
  return `status-${node.status}`
}

function platformIconUrl(platform) {
  return PLATFORM_ICON_URLS[platform] || ''
}

function platformTitle(platformStatus) {
  const platform = uploadPlatformText[platformStatus.platform] || platformStatus.platform
  return `${platform} · ${platformStatus.status}`
}

function displayTaskCount() {
  return props.taskTotalCount || props.filteredTasks.length
}

function showStageTime(node) {
  return !['translator', 'speaker', 'uploader'].includes(node?.key)
}

function showStageProgress(node) {
  return node?.key !== 'uploader'
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
      <select
        class="upload-retry-platform-select"
        :value="uploadRetryPlatform"
        aria-label="按平台选择失败上传任务"
        @change="setUploadRetryPlatform($event.target.value)"
      >
        <option value="">上传重试</option>
        <option v-for="platform in uploadRetryPlatformOptions" :key="platform.value" :value="platform.value">
          {{ platform.label }}
        </option>
      </select>
    </div>

    <div v-if="uploadRetryPlatform" class="upload-retry-panel">
      <div class="upload-retry-head">
        <strong>{{ uploadRetryLoading ? '正在加载失败上传任务' : `失败上传任务 ${uploadRetryRows.length} 个` }}</strong>
        <div class="upload-retry-actions">
          <button type="button" :disabled="uploadRetryLoading || uploadRetryRows.length === 0" @click="toggleUploadRetryAll">
            {{ uploadRetryAllSelected ? '取消全选' : '全选' }}
          </button>
          <button type="button" :disabled="uploadRetryLoading || uploadRetryBusy" @click="loadUploadRetryRows">
            刷新
          </button>
          <button
            type="button"
            class="primary"
            :disabled="uploadRetryBusy || uploadRetrySelectedIds.length === 0"
            @click="retrySelectedUploadSubmissions"
          >
            {{ uploadRetryBusy ? '提交中' : `重试选中 ${uploadRetrySelectedIds.length}` }}
          </button>
        </div>
      </div>
      <div v-if="!uploadRetryLoading && uploadRetryRows.length === 0" class="upload-retry-empty">
        当前平台暂无失败上传任务
      </div>
      <div v-else class="upload-retry-list">
        <label
          v-for="row in uploadRetryRows"
          :key="row.id"
          :class="['upload-retry-row', { blocked: row.retryBlockedReason }]"
        >
          <input
            type="checkbox"
            :checked="uploadRetrySelectedSet.has(row.id)"
            :disabled="Boolean(row.retryBlockedReason)"
            @change="toggleUploadRetryRow(row)"
          />
          <span class="upload-retry-main">
            <span class="upload-retry-title">{{ row.title || row.taskId }}</span>
            <span class="upload-retry-meta">
              {{ row.taskId }} · {{ row.accountKey }} · {{ formatDateTime(row.completedAt || row.updatedAt) }}
            </span>
            <span v-if="row.retryBlockedReason" class="upload-retry-error">{{ row.retryBlockedReason }}</span>
            <span v-else class="upload-retry-error">{{ row.errorMessage || '无失败原因' }}</span>
          </span>
        </label>
      </div>
    </div>

    <div v-if="!loading && !hasTaskFilter && tasks.length === 0" class="empty-state">
      暂无任务
    </div>
    <div v-else-if="!loading && filteredTasks.length === 0" class="empty-state">
      当前筛选下暂无任务
    </div>

    <article v-for="task in pagedTasks" :key="task.taskId" :class="['task-row', `status-${task.status}`]">
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
            class="task-minio-storage"
            :title="task.minioStorageUpdatedAt ? `更新于 ${formatDateTime(task.minioStorageUpdatedAt)}` : '等待 backuper 扫描'"
          >
            MinIO {{ minioStorageText(task) }}
          </span>
        </div>
        <p v-if="task.errorMessage" class="task-error">{{ task.errorMessage }}</p>
      </div>

      <div class="stage-chain" aria-label="阶段链路">
        <template v-for="(node, index) in task.nodes" :key="node.key">
          <button
            type="button"
            :class="['stage-node', 'stage-node-button', stageNodeStatusClass(node), { 'with-uploader-platforms': hasUploaderPlatformStatuses(node) }]"
            :title="`${nodeTitle(node)}\n点击查看任务流详情`"
            @click="openTaskFlow(task, node.key)"
          >
            <span class="stage-label">{{ stageName(node) }}</span>
            <span v-if="showStageProgress(node) && nodeProgress(node)" class="stage-progress">{{ nodeProgress(node) }}</span>
            <span v-if="hasUploaderPlatformStatuses(node)" class="uploader-platform-icons" aria-label="上传平台状态">
              <span
                v-for="platformStatus in node.platformStatuses"
                :key="platformStatus.platform"
                :class="['uploader-platform-icon', `upload-status-${platformStatus.status}`]"
                :title="platformTitle(platformStatus)"
              >
                <img
                  v-if="platformIconUrl(platformStatus.platform)"
                  :src="platformIconUrl(platformStatus.platform)"
                  :alt="uploadPlatformText[platformStatus.platform] || platformStatus.platform"
                  loading="lazy"
                />
              </span>
            </span>
            <span v-if="showStageTime(node)" class="stage-time">{{ formatDuration(node.elapsedSeconds) }}</span>
          </button>
          <div
            v-if="index < task.nodes.length - 1"
            :class="['stage-link', `status-${node.status}`]"
            aria-hidden="true"
          ></div>
        </template>
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
        v-for="node in task.nodes"
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
