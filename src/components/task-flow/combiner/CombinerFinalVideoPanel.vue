<script setup>
import { computed } from 'vue'
import StageMediaGrid from '../StageMediaGrid.vue'
import { formatJson } from '../../../utils/jsonDisplay'
import {
  COMBINER_TABLES,
  assetForField,
  cellText,
  columnsForRows,
  jobsMatching,
  longCell,
  mediaByKind,
  rowKey,
  rowsWithAnyField,
  statusClass,
  tableRows,
  tablesMatching,
} from './combinerUtils'

const props = defineProps({
  flow: { type: Object, default: null },
  stage: { type: Object, default: null },
  jobs: { type: Array, default: () => [] },
  media: { type: Array, default: () => [] },
  logAudioEvent: { type: Function, required: true },
})

const videoMedia = computed(() => mediaByKind(props.media, ['video', 'image']))
const explicitRows = computed(() => tableRows(props.stage, COMBINER_TABLES.finalVideo))
const matchedRows = computed(() => tablesMatching(props.stage, /final|video|publish|metadata|cover|upload/i))
const finalRows = computed(() => {
  const rows = explicitRows.value.length ? explicitRows.value : matchedRows.value
  return rows.length ? rows : rowsWithAnyField(tableRows(props.stage, COMBINER_TABLES.result), /final|video|publish|metadata|cover|upload/i)
})
const columns = computed(() => columnsForRows(finalRows.value))
const finalJobs = computed(() => jobsMatching(props.jobs, /final|video|publish|metadata|cover|upload/i))
const jobColumns = computed(() => columnsForRows(finalJobs.value))
</script>

<template>
  <div class="combiner-panel">
    <StageMediaGrid
      v-if="videoMedia.length"
      :media="videoMedia"
      :log-audio-event="logAudioEvent"
    />

    <section class="flow-section">
      <h4>最终视频与投稿资源</h4>
      <div v-if="finalRows.length" class="combiner-data-table">
        <div class="combiner-data-row combiner-data-head" :style="{ '--combiner-columns': columns.length }">
          <span v-for="column in columns" :key="column">{{ column }}</span>
        </div>
        <div
          v-for="(row, index) in finalRows"
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
      <p v-else class="flow-muted">暂无最终视频或投稿资源表数据。</p>
    </section>

    <section class="flow-section">
      <h4>最终阶段 Jobs</h4>
      <div v-if="finalJobs.length" class="combiner-data-table">
        <div class="combiner-data-row combiner-data-head" :style="{ '--combiner-columns': jobColumns.length }">
          <span v-for="column in jobColumns" :key="column">{{ column }}</span>
        </div>
        <div
          v-for="(job, index) in finalJobs"
          :key="rowKey(job, index)"
          class="combiner-data-row"
          :style="{ '--combiner-columns': jobColumns.length }"
        >
          <span v-for="column in jobColumns" :key="column">
            <span v-if="column === 'status'" :class="['stage-job-status', statusClass(job[column])]">{{ job[column] || '-' }}</span>
            <template v-else>{{ cellText(job[column]) }}</template>
          </span>
        </div>
      </div>
      <p v-else class="flow-muted">暂无最终阶段 job。</p>
    </section>
  </div>
</template>
