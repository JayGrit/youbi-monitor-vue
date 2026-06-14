<script setup>
import { stageNameText } from '../domain/constants'
import { formatDateTime } from '../utils/format'

const props = defineProps({
  rows: { type: Array, default: () => [] },
  filteredRows: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  error: { type: String, default: '' },
  loadedAt: { type: String, default: '' },
  stageFilter: { type: String, default: 'all' },
  typeFilter: { type: String, default: 'all' },
  timeFilter: { type: String, default: 'all' },
  platformFilter: { type: Array, default: () => [] },
  stageOptions: { type: Array, default: () => [] },
  typeOptions: { type: Array, default: () => [] },
  platformOptions: { type: Array, default: () => [] },
  platformIconUrls: { type: Object, default: () => ({}) },
  loadFailureLogs: { type: Function, required: true },
  resetFilters: { type: Function, required: true },
  openTaskFlow: { type: Function, required: true },
  copyTaskId: { type: Function, required: true },
})

const emit = defineEmits([
  'update:stageFilter',
  'update:typeFilter',
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
      <button type="button" :disabled="loading" @click="loadFailureLogs">
        {{ loading ? '加载中' : '刷新' }}
      </button>
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
        <span>Type</span>
        <select :value="typeFilter" @change="emit('update:typeFilter', $event.target.value)">
          <option value="all">全部 Type</option>
          <option v-for="type in typeOptions" :key="type" :value="type">{{ type }}</option>
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

    <div v-if="error" class="failure-log-message error">接口异常：{{ error }}</div>
    <div v-else-if="loading && rows.length === 0" class="failure-log-message">正在加载错误日志</div>
    <div v-else-if="filteredRows.length === 0" class="failure-log-message">没有符合条件的错误日志</div>

    <div v-else class="failure-log-table-wrap">
      <table class="failure-log-table">
        <thead>
          <tr>
            <th>阶段</th>
            <th>Type</th>
            <th>平台</th>
            <th>任务</th>
            <th>失败时间</th>
            <th>错误日志</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in filteredRows" :key="row.id">
            <td><span class="failure-log-stage">{{ stageText(row) }}</span></td>
            <td>{{ row.type || '-' }}</td>
            <td>
              <img
                v-if="row.platform && platformIconUrls[row.platform]"
                class="failure-log-platform-icon"
                :src="platformIconUrls[row.platform]"
                :alt="row.platform"
                :title="row.platform"
              >
              <span v-else>-</span>
            </td>
            <td>
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
            <td class="failure-log-time">{{ formatDateTime(row.failedAt) }}</td>
            <td><pre>{{ row.errorMessage || '未知错误' }}</pre></td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>
