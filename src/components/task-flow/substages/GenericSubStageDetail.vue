<script setup>
import { computed } from 'vue'
import StageJobsPanel from '../StageJobsPanel.vue'
import StageMediaGrid from '../StageMediaGrid.vue'
import { formatJson, isLongValue, shortValue } from '../../../utils/jsonDisplay'

const props = defineProps({
  context: { type: Object, required: true },
  title: { type: String, default: '阶段详情' },
  summaryTables: { type: Array, default: () => [] },
  dataTables: { type: Array, default: () => [] },
  jobTables: { type: Array, default: () => [] },
  jobNameField: { type: String, default: 'job_name' },
  jobOrderField: { type: String, default: 'job_order' },
  jobResultField: { type: String, default: 'result_json' },
  jobPattern: { default: null },
  mediaPattern: { default: null },
})

const stageRows = computed(() => props.context.stageRowsBySubStage(
  props.context.stage,
  'distributor_task_stages',
  props.context.subStage,
).filter(row => row.stage_name === props.context.stageKey || !row.stage_name))
const summaryRows = computed(() => rowsForTables(props.summaryTables))
const dataRows = computed(() => rowsForTables(props.dataTables))
const jobRows = computed(() => {
  const rows = rowsForTables(props.jobTables)
  if (!props.jobPattern) return rows
  return rows.filter(row => props.jobPattern.test(rowText(row)))
})
const media = computed(() => {
  if (!props.mediaPattern) return props.context.media
  return props.context.media.filter(item => props.mediaPattern.test(rowText(item)))
})
const visibleDataTables = computed(() => props.dataTables.map(name => ({
  name,
  rows: props.context.stageRowsBySubStage(props.context.stage, name, props.context.subStage),
})).filter(table => table.rows.length))
const hasContent = computed(() => {
  return stageRows.value.length || summaryRows.value.length || dataRows.value.length || jobRows.value.length || media.value.length
})

function rowsForTables(tableNames) {
  return tableNames.flatMap(name => props.context.stageRowsBySubStage(props.context.stage, name, props.context.subStage)
    .map(row => ({ ...row, table_name: name })))
}

function columns(rows) {
  const hidden = new Set(['created_at', 'updated_at', 'table_name'])
  const preferred = ['line_index', 'item_index', 'segment_index', 'job_type', 'job_key', 'job_name', 'status', 'start_time', 'end_time']
  const keys = []
  for (const row of rows) {
    for (const key of Object.keys(row || {})) {
      if (hidden.has(key) || keys.includes(key)) continue
      keys.push(key)
    }
  }
  return keys.sort((left, right) => rank(preferred, left) - rank(preferred, right) || left.localeCompare(right)).slice(0, 10)
}

function rank(preferred, key) {
  const index = preferred.indexOf(key)
  return index === -1 ? 100 : index
}

function rowText(row) {
  return Object.entries(row || {}).map(([key, value]) => `${key} ${String(value || '')}`).join(' ')
}

function fieldRows(row) {
  const preferred = [
    'status',
    'operator',
    'script_prompt_version',
    'source_text_sha256',
    'script_generated_at',
    'blessing_text',
    'prompt',
    'text',
    'activity_description',
    'layout_description',
    'analysis_json',
    'video_generation_prompt',
    'image_url',
    'background_music_url',
    'generated_video_url',
    'video_url',
    'error_message',
  ]
  const keys = [
    ...preferred,
    ...Object.keys(row || {}).filter(key => !preferred.includes(key)),
  ]
  return keys
    .filter(key => row?.[key] !== undefined && row?.[key] !== null && row?.[key] !== '' && !['id', 'task_id', 'created_at', 'updated_at', 'table_name'].includes(key))
    .slice(0, 18)
    .map(key => ({ key, value: row[key] }))
}
</script>

<template>
  <div class="generic-substage-detail">
    <StageMediaGrid
      v-if="media.length"
      :media="media"
      :log-audio-event="context.logAudioEvent"
      compact
    />

    <section class="flow-section">
      <h4>{{ title }}</h4>
      <div v-if="stageRows.length" class="substage-summary-grid">
        <div v-for="row in stageRows" :key="row.id || `${row.stage_name}:${row.sub_stage}`">
          <span>{{ row.sub_stage || context.subStage }}</span>
          <strong>
            <span :class="['stage-job-status', `status-${row.status || 'pending'}`]">{{ row.status || 'pending' }}</span>
          </strong>
          <small>{{ row.operator || row.completed_at || row.started_at || '-' }}</small>
        </div>
      </div>
      <p v-else-if="!hasContent" class="flow-muted">暂无该子阶段详情数据。</p>
      <pre v-for="row in stageRows.filter(item => item.error_message)" :key="`error-${row.id}`" class="flow-stage-error">{{ row.error_message }}</pre>
    </section>

    <section v-if="summaryRows.length" class="flow-section">
      <h4>关键产物</h4>
      <article v-for="(row, index) in summaryRows" :key="`${row.table_name}-${row.id || index}`" class="substage-record-card">
        <header>
          <strong>{{ row.table_name }}</strong>
          <span v-if="row.status" :class="['stage-job-status', `status-${row.status}`]">{{ row.status }}</span>
        </header>
        <dl class="substage-field-grid">
          <template v-for="field in fieldRows(row)" :key="field.key">
            <dt>{{ field.key }}</dt>
            <dd>
              <details v-if="isLongValue(field.value)">
                <summary>{{ shortValue(field.value, 96) }}</summary>
                <pre class="field-long">{{ formatJson(field.value) }}</pre>
              </details>
              <template v-else>{{ shortValue(field.value, 160) }}</template>
            </dd>
          </template>
        </dl>
      </article>
    </section>

    <StageJobsPanel
      v-if="jobRows.length"
      title="执行 Jobs"
      :rows="jobRows"
      :name-field="jobNameField"
      :order-field="jobOrderField"
      :result-field="jobResultField"
    />

    <section v-for="table in visibleDataTables" :key="table.name" class="flow-section">
      <h4>{{ table.name }}</h4>
      <div class="substage-data-table">
        <div class="substage-data-row substage-data-head" :style="{ '--substage-columns': columns(table.rows).length }">
          <span v-for="column in columns(table.rows)" :key="column">{{ column }}</span>
        </div>
        <div
          v-for="(row, index) in table.rows.slice(0, 80)"
          :key="row.id || index"
          class="substage-data-row"
          :style="{ '--substage-columns': columns(table.rows).length }"
        >
          <span v-for="column in columns(table.rows)" :key="column">
            <span v-if="column === 'status'" :class="['stage-job-status', `status-${row[column] || 'pending'}`]">{{ row[column] || '-' }}</span>
            <details v-else-if="isLongValue(row[column])">
              <summary>{{ shortValue(row[column], 72) }}</summary>
              <pre class="field-long">{{ formatJson(row[column]) }}</pre>
            </details>
            <template v-else>{{ shortValue(row[column], 90) }}</template>
          </span>
        </div>
      </div>
    </section>
  </div>
</template>
