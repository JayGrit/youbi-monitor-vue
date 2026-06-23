<script setup>
import { computed } from 'vue'
import StageMediaGrid from '../StageMediaGrid.vue'
import { formatJson } from '../../../utils/jsonDisplay'
import {
  COMBINER_TABLES,
  assetForField,
  cellText,
  fieldEntries,
  longCell,
  mediaByKind,
  rowKey,
  statusClass,
  tableNames,
  tableRows,
} from './combinerUtils'

const props = defineProps({
  flow: { type: Object, default: null },
  stage: { type: Object, default: null },
  jobs: { type: Array, default: () => [] },
  media: { type: Array, default: () => [] },
  logAudioEvent: { type: Function, required: true },
})

const resultRows = computed(() => tableRows(props.stage, COMBINER_TABLES.result))
const summarySource = computed(() => resultRows.value[0] || props.stage || {})
const summaryFields = computed(() => fieldEntries(summarySource.value, [
  'status',
  'final_video_url',
  'output_video_url',
  'subtitle_url',
  'audio_mix_url',
  'metadata_json',
  'error_message',
]))
const finalMedia = computed(() => mediaByKind(props.media, ['video', 'image']).slice(0, 4))
const tableList = computed(() => tableNames(props.stage).join('、') || '-')
</script>

<template>
  <div class="combiner-panel">
    <section class="flow-section">
      <h4>Combiner 总览</h4>
      <div class="combiner-summary-grid">
        <div>
          <span>任务</span>
          <strong>{{ flow?.task?.id || '-' }}</strong>
        </div>
        <div>
          <span>状态</span>
          <strong>
            <span :class="['stage-job-status', statusClass(stage?.status)]">{{ stage?.status || '-' }}</span>
          </strong>
        </div>
        <div>
          <span>表</span>
          <strong>{{ tableList }}</strong>
        </div>
      </div>
    </section>

    <StageMediaGrid
      v-if="finalMedia.length"
      :media="finalMedia"
      :log-audio-event="logAudioEvent"
      compact
    />

    <section class="flow-section">
      <h4>关键输入输出</h4>
      <div v-if="summaryFields.length" class="combiner-data-table combiner-field-table">
        <div class="combiner-data-row combiner-data-head">
          <span>字段</span>
          <span>值</span>
        </div>
        <div v-for="field in summaryFields" :key="field.name" class="combiner-data-row">
          <strong class="combiner-field-name">{{ field.name }}</strong>
          <span>
            <a v-if="field.asset" :href="field.asset.url" target="_blank" rel="noreferrer">{{ cellText(field.value) }}</a>
            <template v-else>{{ cellText(field.value) }}</template>
            <pre v-if="longCell(field.value)" class="field-long">{{ formatJson(field.value) }}</pre>
          </span>
        </div>
      </div>
      <p v-else class="flow-muted">暂无 combiner 关键字段。</p>
    </section>

    <section class="flow-section">
      <h4>Combiner Jobs</h4>
      <div v-if="jobs.length" class="combiner-data-table combiner-job-table">
        <div class="combiner-data-row combiner-data-head">
          <span>Job</span>
          <span>状态</span>
          <span>输入</span>
          <span>结果</span>
        </div>
        <div v-for="(job, index) in jobs" :key="rowKey(job, index)" class="combiner-data-row">
          <strong class="combiner-field-name">{{ job.job_name || job.id || '-' }}</strong>
          <span><span :class="['stage-job-status', statusClass(job.status)]">{{ job.status || '-' }}</span></span>
          <span>{{ cellText(job.input_json) }}</span>
          <span>
            <a v-if="assetForField('result_json', job.result_json)" :href="assetForField('result_json', job.result_json).url" target="_blank" rel="noreferrer">
              {{ cellText(job.result_json) }}
            </a>
            <template v-else>{{ cellText(job.result_json) }}</template>
          </span>
          <pre v-if="longCell(job.error_message)" class="flow-stage-error">{{ job.error_message }}</pre>
        </div>
      </div>
      <p v-else class="flow-muted">暂无 combiner job 数据。</p>
    </section>
  </div>
</template>
