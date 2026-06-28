<script setup>
import QueueMonitorPage from './QueueMonitorPage.vue'

defineProps({
  api: { type: Object, required: true },
})

const textFilters = [
  { key: 'taskId', label: 'task_id' },
  { key: 'taskType', label: 'task_type' },
  { key: 'opId', label: 'op_id' },
  { key: 'workerId', label: 'worker_id' },
]

const columns = [
  { key: 'taskId', label: '任务', copy: 'taskId' },
  { key: 'taskType', label: '任务类型', format: 'taskType' },
  { key: 'status', label: '状态', format: 'status' },
  { key: 'createdAt', label: '创建时间', format: 'time' },
  { key: 'createdAt', label: '等待时长', format: 'wait' },
  { key: 'completedAt', label: '耗时', format: 'duration' },
  { key: 'workerId', label: 'worker', copy: 'workerId' },
  { key: 'attemptCount', label: 'attempt', format: 'attempt' },
  { key: 'priority', label: 'priority', format: 'number' },
  { key: 'errorMessage', label: '错误', format: 'error' },
]
</script>

<template>
  <QueueMonitorPage
    :api="api"
    page-key="ffmpeger"
    title="FFmpeger"
    waiting-status="ready"
    :text-filters="textFilters"
    :columns="columns"
  />
</template>
