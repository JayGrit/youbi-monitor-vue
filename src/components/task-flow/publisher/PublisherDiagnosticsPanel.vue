<script setup>
import { computed, ref } from 'vue'
import OperatorDiagnosticScreenshotDialog from '../../operator-diagnostics/OperatorDiagnosticScreenshotDialog.vue'

const props = defineProps({
  api: { type: Object, required: true },
  diagnostics: { type: Array, default: () => [] },
  items: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  error: { type: String, default: '' },
  load: { type: Function, required: true },
  uploadPlatformName: { type: Function, required: true },
})

const dialogItem = ref(null)
const dialogTask = computed(() => {
  if (!dialogItem.value?.operatorOpId) return null
  return { opId: dialogItem.value.operatorOpId }
})

function request(item) {
  dialogItem.value = item
}

function closeDialog() {
  dialogItem.value = null
}

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
              :disabled="!item.operatorOpId"
              @click="request(item)"
            >
              {{ !item.operatorOpId ? '无 Operator' : '打开诊断截图' }}
            </button>
          </div>
        </div>
      </article>
    </div>
    <OperatorDiagnosticScreenshotDialog
      :api="api"
      :open="Boolean(dialogTask)"
      :task="dialogTask"
      :title="dialogItem ? `${dialogItem.label}诊断截图` : '诊断截图'"
      @close="closeDialog"
    />
  </section>
</template>
