<script setup>
import { computed, onUnmounted, ref, watch } from 'vue'
import { statusText } from '../../domain/constants'
import { formatDateTime } from '../../utils/format'

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
const screenshotObjectUrls = ref({})
const screenshotLoadingUrls = ref({})
const screenshotErrors = ref({})

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

watch(
  visibleDiagnostics,
  rows => {
    for (const row of rows) {
      downloadScreenshot(row)
    }
  },
  { immediate: true }
)

onUnmounted(() => {
  for (const url of Object.values(screenshotObjectUrls.value)) {
    URL.revokeObjectURL(url)
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

function diagnosticTitle(row) {
  return row.stepName || row.step_name || '诊断截图'
}

function diagnosticMeta(row) {
  return [
    diagnosticRunId(row),
    row.source,
    formatDateTime(row.createdAt || row.created_at),
    (row.screenshotWidth || row.screenshot_width) && (row.screenshotHeight || row.screenshot_height)
      ? `${row.screenshotWidth || row.screenshot_width}x${row.screenshotHeight || row.screenshot_height}`
      : '',
  ].filter(Boolean).join(' · ')
}

function screenshotUrl(row) {
  return row.screenshotUrl || row.screenshot_url || ''
}

function diagnosticError(row) {
  return row.errorMessage || row.error_message || ''
}

function screenshotKey(row) {
  return String(row.id || screenshotUrl(row))
}

function renderedScreenshotUrl(row) {
  return screenshotObjectUrls.value[screenshotKey(row)] || ''
}

function screenshotLoading(row) {
  return Boolean(screenshotLoadingUrls.value[screenshotKey(row)])
}

function screenshotError(row) {
  return screenshotErrors.value[screenshotKey(row)] || ''
}

async function downloadScreenshot(row) {
  const url = screenshotUrl(row)
  const key = screenshotKey(row)
  if (!url || screenshotObjectUrls.value[key] || screenshotLoadingUrls.value[key]) return
  screenshotLoadingUrls.value = { ...screenshotLoadingUrls.value, [key]: true }
  screenshotErrors.value = { ...screenshotErrors.value, [key]: '' }
  try {
    const response = await fetch(url, { mode: 'cors', cache: 'no-store' })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const blob = await response.blob()
    if (!blob.size) throw new Error('empty image')
    const oldUrl = screenshotObjectUrls.value[key]
    if (oldUrl) URL.revokeObjectURL(oldUrl)
    screenshotObjectUrls.value = { ...screenshotObjectUrls.value, [key]: URL.createObjectURL(blob) }
  } catch (err) {
    screenshotErrors.value = {
      ...screenshotErrors.value,
      [key]: err instanceof Error ? err.message : String(err),
    }
  } finally {
    const next = { ...screenshotLoadingUrls.value }
    delete next[key]
    screenshotLoadingUrls.value = next
  }
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
            <p v-else-if="!visibleDiagnostics.length" class="flow-muted">没有诊断截图</p>
            <div v-else class="diagnostic-grid">
              <article
                v-for="row in visibleDiagnostics"
                :key="row.id || `${row.runId || row.run_id}-${row.stepIndex || row.step_index}-${screenshotUrl(row)}`"
                class="diagnostic-item"
              >
                <div class="media-title">
                  <strong>{{ diagnosticTitle(row) }}</strong>
                </div>
                <p v-if="screenshotLoading(row)" class="flow-muted">正在下载图片</p>
                <div v-else-if="renderedScreenshotUrl(row)" class="diagnostic-image-link">
                  <img :src="renderedScreenshotUrl(row)" loading="lazy" alt="" />
                </div>
                <p v-else-if="screenshotError(row)" class="flow-muted">图片下载失败：{{ screenshotError(row) }}</p>
                <p>{{ diagnosticMeta(row) }}</p>
                <pre v-if="diagnosticError(row)" class="flow-stage-error">{{ diagnosticError(row) }}</pre>
              </article>
            </div>
          </div>
        </div>
      </article>
    </div>
  </div>
</template>
