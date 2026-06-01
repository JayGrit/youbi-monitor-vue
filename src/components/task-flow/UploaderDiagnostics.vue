<script setup>
import { formatDateTime } from '../../utils/format'

const props = defineProps({
  rows: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  error: { type: String, default: '' },
  uploadPlatformName: { type: Function, required: true },
})

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
    <div v-if="error" class="flow-error diagnostic-error">Uploader diagnostic API error: {{ error }}</div>
    <p v-else-if="loading" class="flow-muted">Loading diagnostics</p>
    <p v-else-if="!rows.length" class="flow-muted">No diagnostic screenshots.</p>
    <div v-else class="diagnostic-grid">
      <article v-for="row in rows" :key="row.id || `${row.runId}-${row.stepIndex}-${row.screenshotUrl}`" class="diagnostic-item">
        <div class="media-title">
          <strong>{{ imageTitle(row) }}</strong>
          <span>
            <a v-if="row.htmlUrl" :href="row.htmlUrl" target="_blank" rel="noreferrer">HTML</a>
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
