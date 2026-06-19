<script setup>
import { computed } from 'vue'
import { formatDateTime } from '../../utils/format'
import { normalizeResourceUrl } from '../../utils/media'

const props = defineProps({
  title: { type: String, required: true },
  rows: { type: Array, default: () => [] },
  nameField: { type: String, default: 'job_name' },
  orderField: { type: String, default: 'job_order' },
  resultField: { type: String, default: 'result_json' },
})

const orderedRows = computed(() => [...props.rows].sort((left, right) => {
  return Number(left?.[props.orderField] ?? left?.id ?? 0) - Number(right?.[props.orderField] ?? right?.id ?? 0)
}))

function parsedJson(value) {
  if (!value) return null
  if (typeof value === 'object') return value
  try {
    return JSON.parse(value)
  } catch {
    return value
  }
}

function pretty(value) {
  const parsed = parsedJson(value)
  if (parsed == null || parsed === '') return ''
  return typeof parsed === 'string' ? parsed : JSON.stringify(parsed, null, 2)
}

function outputUrl(row) {
  const direct = row.output_url
  if (direct) return normalizeResourceUrl(direct)
  const result = parsedJson(row?.[props.resultField])
  if (!result || typeof result !== 'object') return ''
  const entry = Object.entries(result).find(([key, value]) => /(_url|_path)$/i.test(key) && typeof value === 'string')
  return entry ? normalizeResourceUrl(entry[1]) : ''
}
</script>

<template>
  <section class="flow-section stage-jobs-panel">
    <h4>{{ title }}</h4>
    <p v-if="!orderedRows.length" class="flow-muted">暂无执行步骤</p>
    <div v-else class="stage-job-list">
      <article v-for="(row, index) in orderedRows" :key="row.id || index" class="stage-job-card">
        <header>
          <span class="stage-job-order">{{ row[orderField] ?? index + 1 }}</span>
          <strong>{{ row[nameField] || `步骤 ${index + 1}` }}</strong>
          <span :class="['stage-job-status', `status-${row.status || 'pending'}`]">{{ row.status || 'pending' }}</span>
          <time>{{ formatDateTime(row.completed_at || row.started_at) }}</time>
        </header>
        <a v-if="outputUrl(row)" :href="outputUrl(row)" target="_blank" rel="noreferrer">查看输出文件</a>
        <details v-if="pretty(row.input_json)">
          <summary>输入参数</summary>
          <pre>{{ pretty(row.input_json) }}</pre>
        </details>
        <details v-if="pretty(row[resultField])">
          <summary>执行结果</summary>
          <pre>{{ pretty(row[resultField]) }}</pre>
        </details>
        <pre v-if="row.error_message" class="flow-stage-error">{{ row.error_message }}</pre>
      </article>
    </div>
  </section>
</template>
