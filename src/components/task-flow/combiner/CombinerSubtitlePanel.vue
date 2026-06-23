<script setup>
import { computed } from 'vue'
import { formatJson } from '../../../utils/jsonDisplay'
import {
  COMBINER_TABLES,
  assetForField,
  cellText,
  columnsForRows,
  jobsMatching,
  longCell,
  rowKey,
  rowsWithAnyField,
  statusClass,
  tableRows,
  tablesMatching,
} from './combinerUtils'

const props = defineProps({
  stage: { type: Object, default: null },
  jobs: { type: Array, default: () => [] },
})

const explicitRows = computed(() => tableRows(props.stage, COMBINER_TABLES.subtitle))
const matchedRows = computed(() => tablesMatching(props.stage, /subtitle|caption|srt|ass|vtt/i))
const subtitleRows = computed(() => {
  const rows = explicitRows.value.length ? explicitRows.value : matchedRows.value
  return rows.length ? rows : rowsWithAnyField(tableRows(props.stage, COMBINER_TABLES.result), /subtitle|caption|srt|ass|vtt/i)
})
const columns = computed(() => columnsForRows(subtitleRows.value))
const subtitleJobs = computed(() => jobsMatching(props.jobs, /subtitle|caption|srt|ass|vtt/i))
</script>

<template>
  <div class="combiner-panel">
    <section class="flow-section">
      <h4>字幕生成结果</h4>
      <div v-if="subtitleRows.length" class="combiner-data-table">
        <div class="combiner-data-row combiner-data-head" :style="{ '--combiner-columns': columns.length }">
          <span v-for="column in columns" :key="column">{{ column }}</span>
        </div>
        <div
          v-for="(row, index) in subtitleRows"
          :key="rowKey(row, index)"
          class="combiner-data-row"
          :style="{ '--combiner-columns': columns.length }"
        >
          <span v-for="column in columns" :key="column">
            <span v-if="column === 'status'" :class="['stage-job-status', statusClass(row[column])]">{{ row[column] || '-' }}</span>
            <a v-else-if="assetForField(column, row[column])" :href="assetForField(column, row[column]).url" target="_blank" rel="noreferrer">
              {{ cellText(row[column]) }}
            </a>
            <template v-else>{{ cellText(row[column]) }}</template>
            <pre v-if="longCell(row[column])" class="field-long">{{ formatJson(row[column]) }}</pre>
          </span>
          <pre v-if="row.error_message" class="flow-stage-error">{{ row.error_message }}</pre>
        </div>
      </div>
      <p v-else class="flow-muted">暂无字幕表数据。</p>
    </section>

    <section class="flow-section">
      <h4>字幕相关 Jobs</h4>
      <div v-if="subtitleJobs.length" class="combiner-data-table combiner-job-table">
        <div class="combiner-data-row combiner-data-head">
          <span>Job</span>
          <span>状态</span>
          <span>结果</span>
          <span>错误</span>
        </div>
        <div v-for="(job, index) in subtitleJobs" :key="rowKey(job, index)" class="combiner-data-row">
          <strong class="combiner-field-name">{{ job.job_name || job.id || '-' }}</strong>
          <span><span :class="['stage-job-status', statusClass(job.status)]">{{ job.status || '-' }}</span></span>
          <span>{{ cellText(job.result_json) }}</span>
          <span>{{ cellText(job.error_message) }}</span>
        </div>
      </div>
      <p v-else class="flow-muted">暂无字幕相关 job。</p>
    </section>
  </div>
</template>
