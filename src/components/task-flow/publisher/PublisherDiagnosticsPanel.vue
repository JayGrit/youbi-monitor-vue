<script setup>
import { computed, ref, watch } from 'vue'
import { formatDateTime } from '../../../utils/format'
import { diagnosticRunId } from '../../../utils/uploaderDiagnostics'
import DiagnosticScreenshotGrid from '../DiagnosticScreenshotGrid.vue'

const props = defineProps({
  diagnostics: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  error: { type: String, default: '' },
  load: { type: Function, required: true },
  uploadPlatformName: { type: Function, required: true },
})

const requested = ref(false)
const selectedRunId = ref('')
const historyOpen = ref(false)
const matching = computed(() => props.diagnostics.filter(row => {
  const source = String(row?.source || '').toLowerCase()
  return row?.platform === 'doubao' && !source.includes('upload')
}))
const options = computed(() => {
  const byRunId = new Map()
  for (const row of matching.value) {
    const runId = diagnosticRunId(row)
    if (!runId) continue
    const sortTime = createdAt(row)
    const current = byRunId.get(runId)
    if (!current || sortTime > current.sortTime) {
      byRunId.set(runId, { runId, createdAt: row.createdAt || row.created_at || '', sortTime })
    }
  }
  const chronological = [...byRunId.values()].sort((left, right) => left.sortTime - right.sortTime || left.runId.localeCompare(right.runId))
  return chronological.map((option, index) => ({ ...option, attempt: index + 1 })).reverse()
})
const activeRunId = computed(() => {
  if (!options.value.length) return ''
  return options.value.some(option => option.runId === selectedRunId.value) ? selectedRunId.value : options.value[0].runId
})
const activeOption = computed(() => options.value.find(option => option.runId === activeRunId.value) || null)
const visible = computed(() => {
  const rows = activeRunId.value ? matching.value.filter(row => diagnosticRunId(row) === activeRunId.value) : matching.value
  return [...rows].sort((left, right) => step(left) - step(right) || createdAt(left) - createdAt(right) || Number(left.id || 0) - Number(right.id || 0))
})

watch(options, value => {
  if (selectedRunId.value && !value.some(option => option.runId === selectedRunId.value)) selectedRunId.value = ''
})

function createdAt(row) {
  return Date.parse(row.createdAt || row.created_at || '') || 0
}

function step(row) {
  const value = Number(row.stepIndex ?? row.step_index)
  return Number.isFinite(value) ? value : Number.MAX_SAFE_INTEGER
}

function request() {
  requested.value = true
  props.load()
}

function select(runId) {
  selectedRunId.value = runId
  historyOpen.value = false
}

function titlePrefix(row) {
  return [props.uploadPlatformName(row.platform), row.accountKey || row.account_key || ''].filter(Boolean).join(' / ')
}
</script>

<template>
  <section class="flow-section publisher-diagnostics">
    <div class="publisher-diagnostics-head">
      <h4>诊断截图</h4>
      <button type="button" class="diagnostic-load-button" :disabled="loading" @click="request">
        {{ loading ? '加载中' : '加载诊断截图' }}
      </button>
    </div>
    <div v-if="error" class="flow-error diagnostic-error">诊断截图接口错误：{{ error }}</div>
    <template v-if="requested">
      <div v-if="options.length > 1" class="diagnostic-history">
        <button type="button" class="diagnostic-history-button" @click="historyOpen = !historyOpen">
          历史版本 <span v-if="activeOption">第 {{ activeOption.attempt }} 版</span>
        </button>
        <div v-if="historyOpen" class="diagnostic-history-options">
          <button
            v-for="option in options"
            :key="option.runId"
            type="button"
            :class="{ active: option.runId === activeRunId }"
            @click="select(option.runId)"
          >
            <strong>第 {{ option.attempt }} 版</strong>
            <span>{{ formatDateTime(option.createdAt) }}</span>
          </button>
        </div>
      </div>
      <p v-if="loading && !visible.length" class="flow-muted">正在加载诊断截图</p>
      <p v-else-if="loading" class="flow-muted diagnostic-refreshing">正在自动更新诊断截图</p>
      <DiagnosticScreenshotGrid v-if="visible.length || !loading" :rows="visible" :title-prefix="titlePrefix" />
    </template>
  </section>
</template>
