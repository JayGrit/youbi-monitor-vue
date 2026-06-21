<script setup>
import { computed, ref, watch } from 'vue'
import { formatDateTime } from '../../../utils/format'
import { diagnosticRunId, diagnosticRunOptions } from '../../../utils/uploaderDiagnostics'
import DiagnosticScreenshotGrid from '../DiagnosticScreenshotGrid.vue'

const props = defineProps({
  diagnostics: { type: Array, default: () => [] },
  items: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  error: { type: String, default: '' },
  load: { type: Function, required: true },
  uploadPlatformName: { type: Function, required: true },
})

const requestedKey = ref('')
const selectedRunIds = ref({})
const historyOpenKey = ref('')

function matching(item) {
  return props.diagnostics.filter(row => {
    const jobName = row.publisherJobName || row.publisher_job_name || ''
    const aspectRatio = row.aspectRatio || row.aspect_ratio || ''
    return row.platform === item.platform
      && jobName === item.jobName
      && (!item.ratio || aspectRatio === item.ratio)
  })
}

function options(item) {
  return diagnosticRunOptions(matching(item))
}

function activeRunId(item) {
  const rows = options(item)
  const selected = selectedRunIds.value[item.key]
  return rows.some(option => option.runId === selected) ? selected : rows[0]?.runId || ''
}

function activeOption(item) {
  return options(item).find(option => option.runId === activeRunId(item)) || null
}

function visible(item) {
  const runId = activeRunId(item)
  const rows = runId ? matching(item).filter(row => diagnosticRunId(row) === runId) : matching(item)
  return [...rows].sort((left, right) => {
    return Number(left.stepIndex ?? left.step_index) - Number(right.stepIndex ?? right.step_index)
      || Date.parse(left.createdAt || left.created_at || '') - Date.parse(right.createdAt || right.created_at || '')
      || Number(left.id || 0) - Number(right.id || 0)
  })
}

function request(item) {
  requestedKey.value = item.key
  props.load()
}

function select(item, runId) {
  selectedRunIds.value = { ...selectedRunIds.value, [item.key]: runId }
  historyOpenKey.value = ''
}

function titlePrefix(row) {
  return [props.uploadPlatformName(row.platform), row.accountKey || row.account_key || ''].filter(Boolean).join(' / ')
}

watch(
  () => props.items,
  items => {
    const keys = new Set(items.map(item => item.key))
    selectedRunIds.value = Object.fromEntries(
      Object.entries(selectedRunIds.value).filter(([key]) => keys.has(key)),
    )
  },
)
</script>

<template>
  <section class="flow-section">
    <h4>诊断记录</h4>
    <div class="upload-submission-grid publisher-diagnostic-grid">
      <article v-for="item in items" :key="item.key" class="upload-submission-card">
        <div class="upload-submission-body">
          <div class="upload-submission-head">
            <strong>{{ item.label }}</strong>
            <button
              type="button"
              class="diagnostic-load-button"
              :disabled="loading && requestedKey === item.key"
              @click="request(item)"
            >
              {{ loading && requestedKey === item.key ? '加载中' : '加载诊断截图' }}
            </button>
          </div>
          <div v-if="requestedKey === item.key" class="upload-submission-diagnostics">
            <div v-if="error" class="flow-error diagnostic-error">诊断截图接口错误：{{ error }}</div>
            <div v-if="options(item).length > 1" class="diagnostic-history">
              <button
                type="button"
                class="diagnostic-history-button"
                @click="historyOpenKey = historyOpenKey === item.key ? '' : item.key"
              >
                历史调用
                <span v-if="activeOption(item)">第 {{ activeOption(item).attempt }} 次</span>
              </button>
              <div v-if="historyOpenKey === item.key" class="diagnostic-history-options">
                <button
                  v-for="option in options(item)"
                  :key="option.runId"
                  type="button"
                  :class="{ active: option.runId === activeRunId(item) }"
                  @click="select(item, option.runId)"
                >
                  <strong>第 {{ option.attempt }} 次</strong>
                  <span>{{ formatDateTime(option.createdAt) }}</span>
                </button>
              </div>
            </div>
            <p v-if="loading && !visible(item).length" class="flow-muted">正在加载诊断截图</p>
            <DiagnosticScreenshotGrid
              v-else
              :rows="visible(item)"
              :title-prefix="titlePrefix"
              :empty-text="`没有${item.label}诊断截图`"
            />
          </div>
        </div>
      </article>
    </div>
  </section>
</template>
