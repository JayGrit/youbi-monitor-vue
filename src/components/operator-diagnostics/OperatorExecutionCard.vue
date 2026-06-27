<script setup>
import { computed } from 'vue'
import PlatformIcon from '../PlatformIcon.vue'
import DiagnosticScreenshotGrid from '../task-flow/DiagnosticScreenshotGrid.vue'
import { uploadPlatformText } from '../../domain/constants'
import { formatTime, isSameDate, parseLocalDateTime } from '../../utils/format'
import OperatorStatusBadge from './OperatorStatusBadge.vue'

const props = defineProps({
  execution: { type: Object, required: true },
  platformIconUrls: { type: Object, default: () => ({}) },
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
  if (started && completed) return secondsText(completed - started)
  if (created && started) return secondsText(started - created)
  if (created && completed) return secondsText(completed - created)
  return ''
})

const errorText = computed(() => {
  const error = props.execution.error
  if (!error) return ''
  if (typeof error === 'string') return error
  return [error.code, error.message].filter(Boolean).join(' ')
})

const platformKey = computed(() => normalizePlatform(props.execution.platform))
const platformLabel = computed(() => uploadPlatformText[platformKey.value] || props.execution.platform || '-')
const platformIconUrl = computed(() => props.platformIconUrls[platformKey.value] || '')
const actionLabel = computed(() => readableAction(props.execution.action, platformKey.value))
const timeSummary = computed(() => {
  return `(${relativeTime(props.execution.createdAt)} - ${relativeTime(props.execution.startedAt)} - ${relativeTime(props.execution.completedAt)})(${durationText.value || '-'})`
})

function normalizePlatform(value) {
  const text = String(value || '').trim().toLowerCase()
  if (!text) return ''
  if (props.platformIconUrls[text]) return text
  return Object.keys(props.platformIconUrls).find(key => text === key || text.startsWith(`${key}-`)) || text
}

function readableAction(value, platform) {
  const raw = String(value || '').trim()
  if (!raw) return '-'
  const normalized = raw
    .toLowerCase()
    .replace(new RegExp(`^${escapeRegExp(platform)}[-_/]*`), '')
  if (/(^|[-_/])upload($|[-_/])/.test(normalized)) return '上传'
  if (/(^|[-_/])login($|[-_/])/.test(normalized)) return '登录'
  if (/(^|[-_/])renew($|[-_/])/.test(normalized)) return '续期'
  if (/(^|[-_/])open($|[-_/])/.test(normalized)) return '打开账号'
  if (/(^|[-_/])new($|[-_/])/.test(normalized)) return '新增账号'
  if (/generate.*image|image.*generate/.test(normalized)) return '生成图片'
  return normalized
    .split(/[-_/]+/)
    .filter(part => part && part !== 'playwright' && part !== 'cloakbrowser')
    .join(' ')
    || raw
}

function escapeRegExp(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

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
        <div class="operator-title-platform">
          <PlatformIcon :src="platformIconUrl" :label="platformLabel" :platform="platformKey" :size="30" />
          <strong>{{ platformLabel }}</strong>
        </div>
        <span v-if="actionLabel" class="operator-action-label" :title="execution.action || ''">{{ actionLabel }}</span>
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
        <dt>时间</dt>
        <dd>{{ timeSummary }}</dd>
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

.operator-title-platform {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.operator-action-label {
  display: inline-flex;
  align-items: center;
  min-height: 26px;
  border-radius: 999px;
  background: #f1f5f9;
  color: #334155;
  font-size: 13px;
  font-weight: 680;
  padding: 0 10px;
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
  grid-template-columns: minmax(120px, 0.9fr) minmax(80px, 0.4fr) minmax(260px, 2fr);
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
