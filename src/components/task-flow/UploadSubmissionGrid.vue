<script setup>
import { statusText } from '../../domain/constants'
import { formatDateTime } from '../../utils/format'

defineProps({
  rows: { type: Array, default: () => [] },
  uploadPlatformName: { type: Function, required: true },
})
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
        <div class="upload-submission-head">
          <strong>{{ uploadPlatformName(submission.platform) }}</strong>
          <span :class="['task-badge', `status-${submission.status}`]">
            {{ statusText[submission.status] || submission.status }}
          </span>
        </div>
        <div class="upload-submission-meta">
          <span>{{ submission.account_key || 'default' }}</span>
          <span v-if="submission.next_upload_allowed_at">
            下次 {{ formatDateTime(submission.next_upload_allowed_at) }}
          </span>
        </div>
        <p v-if="submission.title">{{ submission.title }}</p>
        <pre v-if="submission.error_message" class="flow-stage-error">{{ submission.error_message }}</pre>
      </article>
    </div>
  </div>
</template>
