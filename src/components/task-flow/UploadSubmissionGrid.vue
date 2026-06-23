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

const matchingDiagnostics = computed(() => {
  if (!requestedSubmission.value) return []
  return props.diagnostics.filter(row => diagnosticMatches(row, requestedSubmission.value))
})
const visibleDiagnostics = computed(() => {
  return [...matchingDiagnostics.value].sort(compareDiagnostics)
})

function requestDiagnostics(submission) {
  requestedKey.value = submissionKey(submission)
  requestedSubmission.value = submission
  props.loadDiagnostics(submission)
}

function submissionKey(submission) {
  return `${submission.id || ''}:${submission.platform || ''}:${operatorOpId(submission)}`
}

function diagnosticMatches(row, submission) {
  const opId = operatorOpId(submission)
  return Boolean(opId) && (row.opId || row.op_id) === opId
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
  return row.opId || row.op_id || ''
}

function operatorOpId(row) {
  return String(row?.operatorOpId || row?.operator_op_id || row?.operator_run_id || '').trim()
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
                :disabled="!operatorOpId(submission) || (loading && requestedKey === submissionKey(submission))"
                @click="requestDiagnostics(submission)"
              >
                {{ !operatorOpId(submission) ? '无 Operator' : loading && requestedKey === submissionKey(submission) ? '加载中' : '加载诊断截图' }}
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
            <p v-if="loading && !visibleDiagnostics.length" class="flow-muted">正在加载诊断截图</p>
            <p v-else-if="loading" class="flow-muted diagnostic-refreshing">正在自动更新诊断截图</p>
            <DiagnosticScreenshotGrid
              v-if="visibleDiagnostics.length || !loading"
              :rows="visibleDiagnostics"
              :title-prefix="diagnosticTitlePrefix"
            />
          </div>
        </div>
      </article>
    </div>
  </div>
</template>
