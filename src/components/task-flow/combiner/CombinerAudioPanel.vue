<script setup>
import { computed } from 'vue'
import StageMediaGrid from '../StageMediaGrid.vue'
import { formatJson } from '../../../utils/jsonDisplay'
import {
  COMBINER_TABLES,
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
  stage: { type: Object, default: null },
  jobs: { type: Array, default: () => [] },
  media: { type: Array, default: () => [] },
  logAudioEvent: { type: Function, required: true },
})

const audioMedia = computed(() => mediaByKind(props.media, ['audio']))
const explicitRows = computed(() => tableRows(props.stage, COMBINER_TABLES.audio))
const matchedRows = computed(() => tablesMatching(props.stage, /audio|mix|tts|bgm|wav|vocal/i))
const audioRows = computed(() => explicitRows.value.length ? explicitRows.value : matchedRows.value)
const columns = computed(() => columnsForRows(audioRows.value))
const audioJobs = computed(() => jobsMatching(props.jobs, /audio|mix|tts|bgm|wav|vocal/i))
const jobColumns = computed(() => columnsForRows(audioJobs.value))
</script>

<template>
  <div class="combiner-panel">
    <StageMediaGrid
      v-if="audioMedia.length"
      :media="audioMedia"
      :log-audio-event="logAudioEvent"
    />

    <section class="flow-section">
      <h4>音频混合数据</h4>
      <div v-if="audioRows.length" class="combiner-data-table">
        <div class="combiner-data-row combiner-data-head" :style="{ '--combiner-columns': columns.length }">
          <span v-for="column in columns" :key="column">{{ column }}</span>
        </div>
        <div
          v-for="(row, index) in audioRows"
          :key="rowKey(row, index)"
          class="combiner-data-row"
          :style="{ '--combiner-columns': columns.length }"
        >
          <span v-for="column in columns" :key="column">
            <span v-if="column === 'status'" :class="['stage-job-status', statusClass(row[column])]">{{ row[column] || '-' }}</span>
            <template v-else>{{ cellText(row[column]) }}</template>
            <pre v-if="longCell(row[column])" class="field-long">{{ formatJson(row[column]) }}</pre>
          </span>
        </div>
      </div>
      <p v-else class="flow-muted">暂无音频混合表数据。</p>
    </section>

    <section class="flow-section">
      <h4>音频相关 Jobs</h4>
      <div v-if="audioJobs.length" class="combiner-data-table">
        <div class="combiner-data-row combiner-data-head" :style="{ '--combiner-columns': jobColumns.length }">
          <span v-for="column in jobColumns" :key="column">{{ column }}</span>
        </div>
        <div
          v-for="(job, index) in audioJobs"
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
      <p v-else class="flow-muted">暂无音频相关 job。</p>
    </section>
  </div>
</template>
