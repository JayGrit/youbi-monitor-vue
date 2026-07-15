<script setup>
import { computed, ref } from 'vue'
import { statusText } from '../../domain/constants'
import { formatDateTime } from '../../utils/format'
import OperatorDiagnosticScreenshotDialog from '../operator-diagnostics/OperatorDiagnosticScreenshotDialog.vue'

const props = defineProps({
  operatorDiagnosticsApi: { type: Object, required: true },
  rows: { type: Array, default: () => [] },
  uploadPlatformName: { type: Function, required: true },
  platformIconUrls: { type: Object, default: () => ({}) },
  diagnostics: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  error: { type: String, default: '' },
  loadDiagnostics: { type: Function, required: true },
})

const requestedSubmission = ref(null)
const dialogTask = computed(() => {
  if (!operatorOpId(requestedSubmission.value)) return null
  return { opId: operatorOpId(requestedSubmission.value) }
})

function requestDiagnostics(submission) {
  requestedSubmission.value = submission
}

function closeDiagnostics() {
  requestedSubmission.value = null
}

function operatorOpId(row) {
  return String(row?.operatorOpId || row?.operator_op_id || row?.operator_run_id || '').trim()
}

function diagnosticsTitle(submission) {
  if (!submission) return '诊断截图'
  return `${props.uploadPlatformName(submission.platform)}诊断截图`
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
                :disabled="!operatorOpId(submission)"
                @click="requestDiagnostics(submission)"
              >
                {{ !operatorOpId(submission) ? '无 Operator' : '打开诊断截图' }}
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
        </div>
      </article>
    </div>
    <OperatorDiagnosticScreenshotDialog
      :api="operatorDiagnosticsApi"
      :open="Boolean(dialogTask)"
      :task="dialogTask"
      :title="diagnosticsTitle(requestedSubmission)"
      @close="closeDiagnostics"
    />
  </div>
</template>
