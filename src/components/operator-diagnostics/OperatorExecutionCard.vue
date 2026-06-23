<script setup>
import { computed } from 'vue'
import DiagnosticScreenshotGrid from '../task-flow/DiagnosticScreenshotGrid.vue'
import { formatTime, isSameDate, parseLocalDateTime } from '../../utils/format'
import OperatorStatusBadge from './OperatorStatusBadge.vue'

const props = defineProps({
  execution: { type: Object, required: true },
  diagnostics: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  error: { type: String, default: '' },
  expanded: { type: Boolean, default: false },
  diagnosticPage: { type: Number, default: 1 },
  diagnosticPageCount: { type: Number, default: 0 },
  diagnosticTotal: { type: Number, default: 0 },
})

const emit = defineEmits(['toggle', 'refresh', 'copy', 'setDiagnosticPage'])

const durationText = computed(() => {
  const created = timestamp(props.execution.createdAt)
  const started = timestamp(props.execution.startedAt)
  const completed = timestamp(props.execution.completedAt)
  if (started && completed) return `执行 ${secondsText(completed - started)}`
  if (created && started) return `排队 ${secondsText(started - created)}`
  if (created && completed) return `总计 ${secondsText(completed - created)}`
  return ''
})

const errorText = computed(() => {
  const error = props.execution.error
  if (!error) return ''
  if (typeof error === 'string') return error
  return [error.code, error.message].filter(Boolean).join(' ')
})

function timestamp(value) {
  const parsed = Date.parse(value || '')
  return Number.isFinite(parsed) ? parsed : 0
}

function secondsText(ms) {
  const seconds = Math.max(0, Math.round(ms / 1000))
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  return `${minutes}m ${seconds % 60}s`
}

function relativeTime(value) {
  const date = parseLocalDateTime(value)
  if (!date) return '-'
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const beforeYesterday = new Date(today)
  beforeYesterday.setDate(beforeYesterday.getDate() - 2)
  if (isSameDate(date, today)) return `今天 ${formatTime(date)}`
  if (isSameDate(date, yesterday)) return `昨天 ${formatTime(date)}`
  if (isSameDate(date, beforeYesterday)) return `前天 ${formatTime(date)}`
  return formatTime(date)
}
</script>

<template>
  <article class="operator-card">
    <header class="operator-card-header">
      <div class="operator-card-title">
        <strong>{{ execution.platform || '-' }} / {{ execution.action || '-' }}</strong>
        <OperatorStatusBadge :status="execution.status" />
      </div>
      <div class="operator-card-actions">
        <button type="button" @click="emit('toggle', execution.opId)">
          {{ expanded ? '收起' : '查看截图' }}
        </button>
      </div>
    </header>

    <dl class="operator-meta-grid">
      <div>
        <dt>账号</dt>
        <dd>{{ execution.accountKey || '-' }}</dd>
      </div>
      <div>
        <dt>诊断</dt>
        <dd>{{ execution.diagnosticCount || 0 }}</dd>
      </div>
      <div>
        <dt>创建</dt>
        <dd>{{ relativeTime(execution.createdAt) }}</dd>
      </div>
      <div>
        <dt>开始</dt>
        <dd>{{ relativeTime(execution.startedAt) }}</dd>
      </div>
      <div>
        <dt>完成</dt>
        <dd>{{ relativeTime(execution.completedAt) }}</dd>
      </div>
      <div>
        <dt>耗时</dt>
        <dd>{{ durationText || '-' }}</dd>
      </div>
    </dl>

    <pre v-if="errorText" class="operator-error">{{ errorText }}</pre>

    <section v-if="expanded" class="operator-diagnostics-panel">
      <p v-if="loading" class="flow-muted">正在加载诊断</p>
      <p v-else-if="error" class="flow-stage-error">{{ error }}</p>
      <DiagnosticScreenshotGrid
        v-else
        :rows="diagnostics"
        empty-text="没有诊断记录"
      />
      <footer v-if="diagnosticPageCount > 1" class="operator-diagnostics-pagination">
        <button
          type="button"
          :disabled="diagnosticPage <= 1 || loading"
          @click="emit('setDiagnosticPage', execution.opId, diagnosticPage - 1)"
        >
          上一页
        </button>
        <span>{{ diagnosticPage }} / {{ diagnosticPageCount }} · {{ diagnosticTotal }}</span>
        <button
          type="button"
          :disabled="diagnosticPage >= diagnosticPageCount || loading"
          @click="emit('setDiagnosticPage', execution.opId, diagnosticPage + 1)"
        >
          下一页
        </button>
      </footer>
    </section>
  </article>
</template>

<style scoped>
.operator-card {
  border: 1px solid #d7dde7;
  border-radius: 8px;
  padding: 14px;
  background: #fff;
}

.operator-card-header,
.operator-card-title,
.operator-card-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.operator-card-header {
  justify-content: space-between;
  margin-bottom: 12px;
}

.operator-card-actions button,
.operator-meta-grid button {
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  background: #fff;
  color: #334155;
  min-height: 28px;
  padding: 0 9px;
  cursor: pointer;
}

.operator-meta-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px 16px;
  margin: 0;
}

.operator-meta-grid dt {
  color: #64748b;
  font-size: 12px;
  margin-bottom: 4px;
}

.operator-meta-grid dd {
  margin: 0;
  min-width: 0;
  color: #0f172a;
  overflow-wrap: anywhere;
}

.operator-meta-grid code {
  font-size: 12px;
}

.operator-error {
  margin: 12px 0 0;
  white-space: pre-wrap;
  color: #b91c1c;
  background: #fef2f2;
  border-radius: 6px;
  padding: 10px;
}

.operator-diagnostics-panel {
  margin-top: 14px;
  border-top: 1px solid #e2e8f0;
  padding-top: 14px;
  min-width: 0;
}

.operator-diagnostics-pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 12px;
  color: #64748b;
  font-size: 13px;
}

.operator-diagnostics-pagination button {
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  background: #fff;
  color: #334155;
  min-height: 30px;
  padding: 0 10px;
  cursor: pointer;
}

.operator-diagnostics-pagination button:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

@media (max-width: 900px) {
  .operator-meta-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .operator-card-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .operator-meta-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
