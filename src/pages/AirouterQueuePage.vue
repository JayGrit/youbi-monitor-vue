<script setup>
import QueueMonitorPage from './QueueMonitorPage.vue'

defineProps({
  api: { type: Object, required: true },
})

const textFilters = [
  { key: 'upstreamTaskId', label: 'upstream_task_id' },
  { key: 'taskType', label: 'task_type' },
  { key: 'requestKey', label: 'request_key' },
  { key: 'operator', label: 'operator' },
]

const sourceFilter = {
  label: '调用方',
  paramKey: 'caller',
  options: [
    { value: 'translator', label: 'Translator', icon: '译', tone: 'translator' },
    { value: 'publisher', label: 'Publisher', icon: '发', tone: 'publisher' },
    { value: 'uploader', label: 'Uploader', icon: '传', tone: 'uploader' },
  ],
}

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
  { key: 'detail', label: '详情', format: 'detail' },
]

const detailFields = [
  { key: 'promptVersion', label: '提示词版本' },
  { key: 'renderedMessagesJson', label: '提示词（渲染 messages）', format: 'promptTemplate' },
  { key: 'requestJson', label: 'API 请求参数', format: 'promptTemplate' },
  { key: 'responseJson', label: 'API 响应参数', format: 'json' },
  { key: 'rawResponseJson', label: 'API 原始响应', format: 'json' },
]
</script>

<template>
  <QueueMonitorPage
    :api="api"
    page-key="airouter"
    title="中转"
    waiting-status="pending"
    :source-filter="sourceFilter"
    :text-filters="textFilters"
    :columns="columns"
    :detail-fields="detailFields"
  />
</template>
