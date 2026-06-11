<script setup>
import { computed, ref } from 'vue'
import { statusText } from '../../domain/constants'
import { formatDateTime } from '../../utils/format'
import DiagnosticScreenshotGrid from './DiagnosticScreenshotGrid.vue'

const props = defineProps({
  rows: { type: Array, default: () => [] },
  uploadPlatformName: { type: Function, required: true },
  platformIconUrls: { type: Object, default: () => ({}) },
  diagnostics: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  error: { type: String, default: '' },
  loadDiagnostics: { type: Function, required: true },
})

const requestedKey = ref('')
const requestedSubmission = ref(null)

const visibleDiagnostics = computed(() => {
  if (!requestedSubmission.value) return []
  const rows = props.diagnostics.filter(row => diagnosticMatches(row, requestedSubmission.value))
  if (!rows.length) return []
  const latestRunId = latestDiagnosticRunId(rows)
  return rows
    .filter(row => !latestRunId || diagnosticRunId(row) === latestRunId)
    .sort(compareDiagnostics)
})

function requestDiagnostics(submission) {
  requestedKey.value = submissionKey(submission)
  requestedSubmission.value = submission
  props.loadDiagnostics()
}

function submissionKey(submission) {
  return `${submission.platform || ''}:${submission.account_key || submission.accountKey || ''}`
}

function diagnosticMatches(row, submission) {
  if (!row?.platform || row.platform !== submission?.platform) return false
  const rowAccount = row.accountKey || row.account_key || ''
  const submissionAccount = submission.account_key || submission.accountKey || ''
  return !rowAccount || !submissionAccount || rowAccount === submissionAccount
}

function latestDiagnosticRunId(rows) {
  const latest = rows.reduce((best, row) => {
    const value = Date.parse(row.createdAt || row.created_at || '') || 0
    if (!best || value > best.value) {
      return { runId: diagnosticRunId(row), value }
    }
    return best
  }, null)
  return latest?.runId || ''
}

function diagnosticRunId(row) {
  return row.runId || row.run_id || ''
}

function compareDiagnostics(left, right) {
  return diagnosticStep(left) - diagnosticStep(right)
    || diagnosticCreatedAt(left) - diagnosticCreatedAt(right)
    || Number(left.id || 0) - Number(right.id || 0)
}

function diagnosticStep(row) {
  const step = Number(row.stepIndex ?? row.step_index)
  if (Number.isFinite(step)) return step
  return Number.MAX_SAFE_INTEGER
}

function diagnosticCreatedAt(row) {
  return Date.parse(row.createdAt || row.created_at || '') || 0
}

function diagnosticTitlePrefix(row) {
  return [
    props.uploadPlatformName(row.platform),
    row.accountKey || row.account_key || '',
  ].filter(Boolean).join(' / ')
}
</script>

<template>
  <div class="flow-section">
    <h4>平台发送任务</h4>
    <div class="upload-submission-grid">
      <article
        v-for="submission in rows"
        :key="submission.id || `${submission.platform}-${submission.account_key}`"
        :class="['upload-submission-card', `status-${submission.status}`]"
      >
        <img
          v-if="platformIconUrls[submission.platform]"
          class="upload-submission-icon"
          :src="platformIconUrls[submission.platform]"
          alt=""
        />
        <div class="upload-submission-body">
          <div class="upload-submission-head">
            <strong>{{ uploadPlatformName(submission.platform) }}</strong>
            <span class="upload-submission-actions">
              <button
                type="button"
                class="diagnostic-load-button"
                :disabled="loading && requestedKey === submissionKey(submission)"
                @click="requestDiagnostics(submission)"
              >
                {{ loading && requestedKey === submissionKey(submission) ? '加载中' : '加载诊断截图' }}
              </button>
              <span :class="['task-badge', `status-${submission.status}`]">
                {{ statusText[submission.status] || submission.status }}
              </span>
            </span>
          </div>
          <div class="upload-submission-meta">
            <span v-if="submission.next_upload_allowed_at">
              下次 {{ formatDateTime(submission.next_upload_allowed_at) }}
            </span>
          </div>
          <pre v-if="submission.error_message" class="flow-stage-error">{{ submission.error_message }}</pre>
          <div v-if="requestedKey === submissionKey(submission)" class="upload-submission-diagnostics">
            <div v-if="error" class="flow-error diagnostic-error">诊断截图接口错误：{{ error }}</div>
            <p v-else-if="loading" class="flow-muted">正在加载诊断截图</p>
            <DiagnosticScreenshotGrid v-else :rows="visibleDiagnostics" :title-prefix="diagnosticTitlePrefix" />
          </div>
        </div>
      </article>
    </div>
  </div>
</template>
