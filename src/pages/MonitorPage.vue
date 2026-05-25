<script setup>
import { formatDuration } from '../utils/format'

defineProps({
  error: { type: String, default: '' },
  loading: { type: Boolean, default: false },
  tasks: { type: Array, default: () => [] },
  serviceHeartbeats: { type: Array, default: () => [] },
  taskStatusFilters: { type: Array, default: () => [] },
  taskStatusFilter: { type: String, default: 'all' },
  taskFilterCounts: { type: Object, default: () => ({}) },
  taskTypeFilter: { type: String, default: 'all' },
  taskTypeFilters: { type: Array, default: () => [] },
  taskActionsExpanded: { type: Boolean, default: false },
  filteredTasks: { type: Array, default: () => [] },
  openFailureKey: { type: String, default: '' },
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
  stageName: { type: Function, required: true },
  nodeProgress: { type: Function, required: true },
  nodeTitle: { type: Function, required: true },
  openTaskFlow: { type: Function, required: true },
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
  'clearFailure',
])
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
        <span :class="['service-device-name', { offline: onlineDeviceText(service) === '离线' }]">
          {{ onlineDeviceText(service) }}
        </span>
      </div>
    </div>
  </section>

  <section class="task-list" aria-label="任务列表">
    <div class="task-filter-bar" aria-label="任务状态筛选">
      <button
        v-for="filter in taskStatusFilters"
        :key="filter.key"
        type="button"
        :class="['task-filter-button', { active: taskStatusFilter === filter.key }]"
        @click="emit('update:taskStatusFilter', filter.key)"
      >
        <span>{{ filter.label }}</span>
        <strong>{{ taskFilterCounts[filter.key] || 0 }}</strong>
      </button>
      <select
        class="task-type-filter"
        :value="taskTypeFilter"
        aria-label="按任务 type 筛选"
        @change="emit('update:taskTypeFilter', $event.target.value)"
      >
        <option value="all">全部 type</option>
        <option v-for="type in taskTypeFilters" :key="type" :value="type">{{ type }}</option>
      </select>
      <button
        type="button"
        :class="['task-filter-button', 'task-actions-toggle', { active: taskActionsExpanded }]"
        @click="toggleTaskActions"
      >
        {{ taskActionsExpanded ? '收起操作' : '展开操作' }}
      </button>
    </div>

    <div v-if="!loading && tasks.length === 0" class="empty-state">
      暂无任务
    </div>
    <div v-else-if="!loading && filteredTasks.length === 0" class="empty-state">
      当前筛选下暂无任务
    </div>

    <article v-for="task in filteredTasks" :key="task.taskId" :class="['task-row', `status-${task.status}`]">
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
        </div>
        <p v-if="task.errorMessage" class="task-error">{{ task.errorMessage }}</p>
      </div>

      <div class="stage-chain" aria-label="阶段链路">
        <template v-for="(node, index) in task.nodes" :key="node.key">
          <button
            type="button"
            :class="['stage-node', 'stage-node-button', `status-${node.status}`]"
            :title="`${nodeTitle(node)}\n点击查看任务流详情`"
            @click="openTaskFlow(task, node.key)"
          >
            <span class="stage-label">{{ stageName(node) }}</span>
            <span v-if="nodeProgress(node)" class="stage-progress">{{ nodeProgress(node) }}</span>
            <span class="stage-time">{{ formatDuration(node.elapsedSeconds) }}</span>
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
  </section>
</template>
