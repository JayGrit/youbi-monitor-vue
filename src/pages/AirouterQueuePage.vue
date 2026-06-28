<script setup>
import QueueMonitorPage from './QueueMonitorPage.vue'

defineProps({
  api: { type: Object, required: true },
})

const textFilters = [
  { key: 'caller', label: 'caller' },
  { key: 'upstreamTaskId', label: 'upstream_task_id' },
  { key: 'taskType', label: 'task_type' },
  { key: 'requestKey', label: 'request_key' },
  { key: 'operator', label: 'operator' },
]

const columns = [
  { key: 'caller', label: '调用方' },
  { key: 'upstreamTaskId', label: '上游任务', copy: 'upstreamTaskId' },
  { key: 'taskType', label: '任务类型', format: 'taskType' },
  { key: 'status', label: '状态', format: 'status' },
  { key: 'model', label: '模型' },
  { key: 'createdAt', label: '创建时间', format: 'time' },
  { key: 'nextRunAt', label: '等待/下次运行', format: 'wait', nextRunKey: 'nextRunAt' },
  { key: 'completedAt', label: '耗时', format: 'duration' },
  { key: 'attemptCount', label: 'attempt', format: 'attempt' },
  { key: 'operator', label: 'operator', copy: 'operator' },
  { key: 'inputChars', label: '字符量', format: 'chars' },
  { key: 'errorMessage', label: '错误', format: 'error' },
]
</script>

<template>
  <QueueMonitorPage
    :api="api"
    page-key="airouter"
    title="AIRouter"
    waiting-status="pending"
    :text-filters="textFilters"
    :columns="columns"
  />
</template>
