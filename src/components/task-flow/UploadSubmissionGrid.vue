<script setup>
import { computed, ref, watch } from 'vue'
import { statusText } from '../../domain/constants'
import { formatDateTime } from '../../utils/format'
import {
  diagnosticRunId,
  diagnosticRunOptions,
} from '../../utils/uploaderDiagnostics'
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
const selectedRunId = ref('')
const historyOpen = ref(false)

const matchingDiagnostics = computed(() => {
  if (!requestedSubmission.value) return []
  return props.diagnostics.filter(row => diagnosticMatches(row, requestedSubmission.value))
})

const runOptions = computed(() => diagnosticRunOptions(matchingDiagnostics.value))
const activeRunId = computed(() => {
  if (!runOptions.value.length) return ''
  return runOptions.value.some(option => option.runId === selectedRunId.value)
    ? selectedRunId.value
    : runOptions.value[0].runId
})
const activeRunOption = computed(() => {
  return runOptions.value.find(option => option.runId === activeRunId.value) || null
})
const visibleDiagnostics = computed(() => {
  const rows = activeRunId.value
    ? matchingDiagnostics.value.filter(row => diagnosticRunId(row) === activeRunId.value)
    : matchingDiagnostics.value
  return [...rows].sort(compareDiagnostics)
})

function requestDiagnostics(submission) {
  if (requestedKey.value !== submissionKey(submission)) {
    selectedRunId.value = ''
    historyOpen.value = false
  }
  requestedKey.value = submissionKey(submission)
  requestedSubmission.value = submission
  props.loadDiagnostics()
}

watch(runOptions, options => {
  if (selectedRunId.value && !options.some(option => option.runId === selectedRunId.value)) {
    selectedRunId.value = ''
  }
})

function submissionKey(submission) {
  return `${submission.platform || ''}:${submission.account_key || submission.accountKey || ''}`
}

function diagnosticMatches(row, submission) {
  if (!row?.platform || row.platform !== submission?.platform) return false
  const rowAccount = row.accountKey || row.account_key || ''
  const submissionAccount = submission.account_key || submission.accountKey || ''
  return !rowAccount || !submissionAccount || rowAccount === submissionAccount
}

function selectRun(runId) {
  selectedRunId.value = runId
  historyOpen.value = false
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
            <div v-if="runOptions.length > 1" class="diagnostic-history">
              <button
                type="button"
                class="diagnostic-history-button"
                @click="historyOpen = !historyOpen"
              >
                历史上传
                <span v-if="activeRunOption">第 {{ activeRunOption.attempt }} 次</span>
              </button>
              <div v-if="historyOpen" class="diagnostic-history-options">
                <button
                  v-for="option in runOptions"
                  :key="option.runId"
                  type="button"
                  :class="{ active: option.runId === activeRunId }"
                  @click="selectRun(option.runId)"
                >
                  <strong>第 {{ option.attempt }} 次</strong>
                  <span>{{ formatDateTime(option.createdAt) }}</span>
                </button>
              </div>
            </div>
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
