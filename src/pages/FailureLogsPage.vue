<script setup>
import { stageNameText, uploadPlatformText } from '../domain/constants'
import { formatDateTime } from '../utils/format'

defineProps({
  rows: { type: Array, default: () => [] },
  filteredRows: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  error: { type: String, default: '' },
  loadedAt: { type: String, default: '' },
  stageFilter: { type: String, default: 'all' },
  typeFilter: { type: String, default: 'all' },
  timeFilter: { type: String, default: 'all' },
  accountFilter: { type: String, default: 'all' },
  stageOptions: { type: Array, default: () => [] },
  typeOptions: { type: Array, default: () => [] },
  accountOptions: { type: Array, default: () => [] },
  loadFailureLogs: { type: Function, required: true },
  resetFilters: { type: Function, required: true },
  openTaskFlow: { type: Function, required: true },
})

const emit = defineEmits([
  'update:stageFilter',
  'update:typeFilter',
  'update:timeFilter',
  'update:accountFilter',
])

function stageText(row) {
  const stage = stageNameText[row.stage] || row.stage || '-'
  const platform = uploadPlatformText[row.platform] || row.platform
  return platform ? `${stage} · ${platform}` : stage
}
</script>

<template>
  <section class="failure-log-page">
    <div class="failure-log-header">
      <div>
        <h1>失败日志</h1>
        <p>
          共 {{ rows.length }} 条，当前显示 {{ filteredRows.length }} 条
          <span v-if="loadedAt"> · 加载于 {{ formatDateTime(loadedAt) }}</span>
        </p>
      </div>
      <button type="button" :disabled="loading" @click="loadFailureLogs">
        {{ loading ? '加载中' : '刷新' }}
      </button>
    </div>

    <div class="failure-log-filters" aria-label="失败日志筛选">
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
      <label>
        <span>Uploader 账号</span>
        <select :value="accountFilter" @change="emit('update:accountFilter', $event.target.value)">
          <option value="all">全部账号</option>
          <option v-for="account in accountOptions" :key="account" :value="account">{{ account }}</option>
        </select>
      </label>
      <button type="button" class="failure-log-reset" @click="resetFilters">重置筛选</button>
    </div>

    <div v-if="error" class="failure-log-message error">接口异常：{{ error }}</div>
    <div v-else-if="loading && rows.length === 0" class="failure-log-message">正在加载失败日志</div>
    <div v-else-if="filteredRows.length === 0" class="failure-log-message">没有符合条件的失败日志</div>

    <div v-else class="failure-log-table-wrap">
      <table class="failure-log-table">
        <thead>
          <tr>
            <th>失败时间</th>
            <th>阶段</th>
            <th>Type</th>
            <th>账号</th>
            <th>任务</th>
            <th>错误日志</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in filteredRows" :key="row.id">
            <td class="failure-log-time">{{ formatDateTime(row.failedAt) }}</td>
            <td><span class="failure-log-stage">{{ stageText(row) }}</span></td>
            <td>{{ row.type || '-' }}</td>
            <td>{{ row.accountKey || '-' }}</td>
            <td>
              <button type="button" class="failure-log-task" @click="openTaskFlow(row.taskId)">
                <strong>{{ row.title || row.taskId }}</strong>
                <span>{{ row.taskId }}</span>
              </button>
            </td>
            <td><pre>{{ row.errorMessage || '未知错误' }}</pre></td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>
