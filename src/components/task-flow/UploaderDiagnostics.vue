<script setup>
import { computed, ref, watch } from 'vue'
import { formatDateTime } from '../../utils/format'

const props = defineProps({
  rows: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  error: { type: String, default: '' },
  uploadPlatformName: { type: Function, required: true },
  loadDiagnostics: { type: Function, required: true },
})

const requested = ref(false)

watch(
  () => props.rows,
  rows => {
    if (rows.length) requested.value = true
  },
  { immediate: true }
)

const latestRows = computed(() => {
  const rows = [...props.rows]
  if (!rows.length) return []
  const latestRunId = latestDiagnosticRunId(rows)
  return rows
    .filter(row => !latestRunId || row.runId === latestRunId)
    .sort(compareDiagnostics)
})

function requestDiagnostics() {
  requested.value = true
  props.loadDiagnostics()
}

function latestDiagnosticRunId(rows) {
  const latest = rows.reduce((best, row) => {
    const value = Date.parse(row.createdAt || '') || 0
    if (!best || value > best.value) {
      return { runId: row.runId || '', value }
    }
    return best
  }, null)
  return latest?.runId || ''
}

function compareDiagnostics(left, right) {
  return diagnosticStep(left) - diagnosticStep(right)
    || diagnosticCreatedAt(left) - diagnosticCreatedAt(right)
    || Number(left.id || 0) - Number(right.id || 0)
}

function diagnosticStep(row) {
  const step = Number(row.stepIndex)
  if (Number.isFinite(step)) return step
  return Number.MAX_SAFE_INTEGER
}

function diagnosticCreatedAt(row) {
  return Date.parse(row.createdAt || '') || 0
}

function imageTitle(row) {
  return [
    props.uploadPlatformName(row.platform),
    row.accountKey,
    row.stepIndex ? `#${row.stepIndex}` : '',
    row.stepName,
  ].filter(Boolean).join(' / ')
}

function imageMeta(row) {
  return [
    row.runId,
    row.source,
    formatDateTime(row.createdAt),
    row.screenshotWidth && row.screenshotHeight ? `${row.screenshotWidth}x${row.screenshotHeight}` : '',
  ].filter(Boolean).join(' · ')
}
</script>

<template>
  <div class="flow-section">
    <h4>诊断截图</h4>
    <button type="button" class="diagnostic-load-button" :disabled="loading" @click="requestDiagnostics">
      {{ loading ? '加载中' : '加载诊断截图' }}
    </button>
    <div v-if="error" class="flow-error diagnostic-error">Uploader diagnostic API error: {{ error }}</div>
    <p v-else-if="requested && loading" class="flow-muted">Loading diagnostics</p>
    <p v-else-if="requested && !latestRows.length" class="flow-muted">No diagnostic screenshots.</p>
    <div v-else-if="requested && latestRows.length" class="diagnostic-grid">
      <article v-for="row in latestRows" :key="row.id || `${row.runId}-${row.stepIndex}-${row.screenshotUrl}`" class="diagnostic-item">
        <div class="media-title">
          <strong>{{ imageTitle(row) }}</strong>
          <span>
            <a v-if="row.screenshotUrl" :href="row.screenshotUrl" target="_blank" rel="noreferrer">打开</a>
          </span>
        </div>
        <a v-if="row.screenshotUrl" :href="row.screenshotUrl" target="_blank" rel="noreferrer" class="diagnostic-image-link">
          <img :src="row.screenshotUrl" loading="lazy" alt="" />
        </a>
        <p>{{ imageMeta(row) }}</p>
        <pre v-if="row.errorMessage" class="flow-stage-error">{{ row.errorMessage }}</pre>
      </article>
    </div>
  </div>
</template>
