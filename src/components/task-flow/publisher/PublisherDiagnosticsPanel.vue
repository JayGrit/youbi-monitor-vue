<script setup>
import { ref, watch } from 'vue'
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

function matching(item) {
  return props.diagnostics.filter(row => item.operatorOpId && (row.opId || row.op_id) === item.operatorOpId)
}

function visible(item) {
  return [...matching(item)].sort((left, right) => {
    return Number(left.stepIndex ?? left.step_index) - Number(right.stepIndex ?? right.step_index)
      || Date.parse(left.createdAt || left.created_at || '') - Date.parse(right.createdAt || right.created_at || '')
      || Number(left.id || 0) - Number(right.id || 0)
  })
}

function request(item) {
  requestedKey.value = item.key
  props.load(item)
}

function titlePrefix(row) {
  return row.opId || row.op_id || ''
}

watch(
  () => props.items,
  items => {
    const keys = new Set(items.map(item => item.key))
    if (!keys.has(requestedKey.value)) requestedKey.value = ''
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
              :disabled="!item.operatorOpId || (loading && requestedKey === item.key)"
              @click="request(item)"
            >
              {{ !item.operatorOpId ? '无 Operator' : loading && requestedKey === item.key ? '加载中' : '加载诊断截图' }}
            </button>
          </div>
          <div v-if="requestedKey === item.key" class="upload-submission-diagnostics">
            <div v-if="error" class="flow-error diagnostic-error">诊断截图接口错误：{{ error }}</div>
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
