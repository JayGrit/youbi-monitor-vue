<script setup>
import { computed, ref, watch } from 'vue'
import { formatDateTime } from '../../utils/format'
import { normalizeResourceUrl } from '../../utils/media'
import { diagnosticRunId } from '../../utils/uploaderDiagnostics'
import DiagnosticScreenshotGrid from './DiagnosticScreenshotGrid.vue'
import StageJobsPanel from './StageJobsPanel.vue'

const props = defineProps({
  flow: { type: Object, default: null },
  rows: { type: Array, default: () => [] },
  jobs: { type: Array, default: () => [] },
  narrations: { type: Array, default: () => [] },
  sentences: { type: Array, default: () => [] },
  diagnostics: { type: Array, default: () => [] },
  diagnosticsLoading: { type: Boolean, default: false },
  diagnosticsError: { type: String, default: '' },
  loadDiagnostics: { type: Function, required: true },
})

const diagnosticsRequested = ref(false)
const selectedRunId = ref('')
const historyOpen = ref(false)
const expandedDescriptions = ref(new Set())

const result = computed(() => props.rows[0] || {})
const narration = computed(() => props.narrations[0] || {})
const isNarration = computed(() => props.narrations.length > 0)
const videoInfo = computed(() => props.flow?.videoInfo || {})

const comparisonRows = computed(() => [
  {
    key: 'title',
    label: '标题',
    original: videoInfo.value.title || props.flow?.task?.title || '-',
    generated: result.value.upload_title || '-',
  },
  {
    key: 'description',
    label: '简介',
    original: videoInfo.value.source_description || '-',
    generated: result.value.upload_description || '-',
    collapsible: true,
  },
  {
    key: 'tags',
    label: '标签',
    original: formatTags(videoInfo.value.source_tags_json),
    generated: formatTags(result.value.upload_tags),
  },
])

const coverImages = computed(() => [
  normalizeResourceUrl(result.value.source_cover_url || videoInfo.value.source_thumbnail_url || ''),
  normalizeResourceUrl(result.value.clean_cover_url || ''),
  normalizeResourceUrl(result.value.final_cover_url || ''),
])
const showCoverSection = computed(() => {
  return boolValue(videoInfo.value.reset_cover ?? result.value.reset_cover)
    || Boolean(result.value.clean_cover_url || result.value.final_cover_url)
})

const narrationImages = computed(() => [
  ['封面图', narration.value.cover_image_url],
  ['背景图', narration.value.background_image_url],
  ['牛皮纸背景', narration.value.kraft_background_image_url],
  ['标题文字', narration.value.title_text_image_url],
].map(([label, url]) => ({ label, url: normalizeResourceUrl(url || '') })).filter(item => item.url))

const orderedSentences = computed(() => [...props.sentences].sort((left, right) => {
  return Number(left.line_index ?? left.id ?? 0) - Number(right.line_index ?? right.id ?? 0)
}))

const matchingDiagnostics = computed(() => {
  return props.diagnostics.filter(row => row?.platform === 'doubao')
})
const runOptions = computed(() => publisherRunOptions(matchingDiagnostics.value))
const activeRunId = computed(() => {
  if (!runOptions.value.length) return ''
  return runOptions.value.some(option => option.runId === selectedRunId.value)
    ? selectedRunId.value
    : runOptions.value[0].runId
})
const activeRunOption = computed(() => {
  return runOptions.value.find(option => option.runId === activeRunId.value) || null
})
const visibleDiagnostics = computed(() => {
  const rows = activeRunId.value
    ? matchingDiagnostics.value.filter(row => diagnosticRunId(row) === activeRunId.value)
    : matchingDiagnostics.value
  return [...rows].sort(compareDiagnostics)
})

watch(runOptions, options => {
  if (selectedRunId.value && !options.some(option => option.runId === selectedRunId.value)) {
    selectedRunId.value = ''
  }
})

function formatTags(value) {
  if (Array.isArray(value)) return value.filter(Boolean).join('、') || '-'
  if (!value) return '-'
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed.filter(Boolean).join('、') || '-' : String(parsed)
  } catch {
    return String(value)
  }
}

function boolValue(value) {
  if (value === true) return true
  if (value === false || value == null) return false
  if (typeof value === 'number') return value !== 0
  return !['', '0', 'false', 'no', 'off'].includes(String(value).trim().toLowerCase())
}

function isDescriptionExpanded(side) {
  return expandedDescriptions.value.has(side)
}

function toggleDescription(side) {
  const next = new Set(expandedDescriptions.value)
  next.has(side) ? next.delete(side) : next.add(side)
  expandedDescriptions.value = next
}

function requestDiagnostics() {
  diagnosticsRequested.value = true
  props.loadDiagnostics()
}

function publisherRunOptions(rows) {
  const byRunId = new Map()
  for (const row of rows) {
    const runId = diagnosticRunId(row)
    if (!runId) continue
    const sortTime = diagnosticCreatedAt(row)
    const current = byRunId.get(runId)
    if (!current || sortTime > current.sortTime) {
      byRunId.set(runId, {
        runId,
        createdAt: row.createdAt || row.created_at || '',
        sortTime,
      })
    }
  }
  const chronological = [...byRunId.values()].sort((left, right) => {
    return left.sortTime - right.sortTime || left.runId.localeCompare(right.runId)
  })
  return chronological
    .map((option, index) => ({ ...option, attempt: index + 1 }))
    .reverse()
}

function selectRun(runId) {
  selectedRunId.value = runId
  historyOpen.value = false
}

function compareDiagnostics(left, right) {
  return diagnosticStep(left) - diagnosticStep(right)
    || diagnosticCreatedAt(left) - diagnosticCreatedAt(right)
    || Number(left.id || 0) - Number(right.id || 0)
}

function diagnosticStep(row) {
  const step = Number(row.stepIndex ?? row.step_index)
  return Number.isFinite(step) ? step : Number.MAX_SAFE_INTEGER
}

function diagnosticCreatedAt(row) {
  return Date.parse(row.createdAt || row.created_at || '') || 0
}

function diagnosticTitlePrefix(row) {
  return [
    '豆包封面',
    row.accountKey || row.account_key || '',
  ].filter(Boolean).join(' / ')
}
</script>

<template>
  <div class="publisher-panel">
    <section v-if="isNarration" class="flow-section narration-section">
      <h4>Narration 主流程</h4>
      <div class="narration-status-line">
        <span :class="['stage-job-status', `status-${narration.status || 'pending'}`]">{{ narration.status || 'pending' }}</span>
        <span>{{ orderedSentences.length }} 句</span>
        <span v-if="narration.operator">{{ narration.operator }}</span>
      </div>
      <p class="narration-text">{{ narration.text || '暂无旁白文本' }}</p>
      <div v-if="narrationImages.length" class="narration-image-grid">
        <figure v-for="item in narrationImages" :key="item.label">
          <a :href="item.url" target="_blank" rel="noreferrer"><img :src="item.url" :alt="item.label" loading="lazy" /></a>
          <figcaption>{{ item.label }}</figcaption>
        </figure>
      </div>
      <details v-if="narration.cover_prompt"><summary>封面提示词</summary><p>{{ narration.cover_prompt }}</p></details>
      <details v-if="narration.background_prompt"><summary>背景提示词</summary><p>{{ narration.background_prompt }}</p></details>
      <details v-if="orderedSentences.length">
        <summary>旁白分句（{{ orderedSentences.length }}）</summary>
        <ol class="narration-sentence-list">
          <li v-for="row in orderedSentences" :key="row.id">
            <span>片段 {{ row.segment_index ?? '-' }}</span>{{ row.sentence_text }}
          </li>
        </ol>
      </details>
      <pre v-if="narration.error_message" class="flow-stage-error">{{ narration.error_message }}</pre>
    </section>

    <section class="flow-section">
      <h4>投稿信息</h4>
      <div v-if="!rows.length" class="flow-muted">还没有 publisher 结果</div>
      <template v-else>
        <div class="publisher-comparison-table">
          <div class="publisher-comparison-row publisher-comparison-head">
            <strong>字段</strong>
            <strong>原始值</strong>
            <strong>Publisher 生成值</strong>
          </div>
          <div v-for="item in comparisonRows" :key="item.key" class="publisher-comparison-row">
            <strong class="publisher-field-name">{{ item.label }}</strong>
            <div>
              <p :class="{ 'publisher-description-collapsed': item.collapsible && !isDescriptionExpanded(`${item.key}-original`) }">
                {{ item.original }}
              </p>
              <button
                v-if="item.collapsible && item.original !== '-'"
                type="button"
                class="publisher-expand-button"
                @click="toggleDescription(`${item.key}-original`)"
              >
                {{ isDescriptionExpanded(`${item.key}-original`) ? '收起' : '展开' }}
              </button>
            </div>
            <div>
              <p :class="{ 'publisher-description-collapsed': item.collapsible && !isDescriptionExpanded(`${item.key}-generated`) }">
                {{ item.generated }}
              </p>
              <button
                v-if="item.collapsible && item.generated !== '-'"
                type="button"
                class="publisher-expand-button"
                @click="toggleDescription(`${item.key}-generated`)"
              >
                {{ isDescriptionExpanded(`${item.key}-generated`) ? '收起' : '展开' }}
              </button>
            </div>
          </div>
        </div>
        <pre v-if="result.error_message" class="flow-stage-error">{{ result.error_message }}</pre>
      </template>
    </section>

    <StageJobsPanel v-if="jobs.length" title="Publisher 执行步骤" :rows="jobs" />

    <section v-if="rows.length && showCoverSection" class="flow-section publisher-cover-section">
      <h4>封面</h4>
      <p class="publisher-cover-text"><strong>封面文字</strong>{{ result.cover_text || '-' }}</p>
      <div class="publisher-cover-flow">
        <template v-for="(image, index) in coverImages" :key="index">
          <article class="publisher-cover-card">
            <a v-if="image" :href="image" target="_blank" rel="noreferrer">
              <img :src="image" alt="" loading="lazy" />
            </a>
            <div v-else class="publisher-cover-empty">暂无封面</div>
          </article>
          <span v-if="index < coverImages.length - 1" class="publisher-cover-arrow" aria-hidden="true">→</span>
        </template>
      </div>
    </section>

    <section v-if="rows.length" class="flow-section publisher-diagnostics">
      <div class="publisher-diagnostics-head">
        <h4>Publisher 诊断截图</h4>
        <button type="button" class="diagnostic-load-button" :disabled="diagnosticsLoading" @click="requestDiagnostics">
          {{ diagnosticsLoading ? '加载中' : '加载诊断截图' }}
        </button>
      </div>
      <div v-if="diagnosticsError" class="flow-error diagnostic-error">诊断截图接口错误：{{ diagnosticsError }}</div>
      <template v-if="diagnosticsRequested">
        <div v-if="runOptions.length > 1" class="diagnostic-history">
          <button type="button" class="diagnostic-history-button" @click="historyOpen = !historyOpen">
            历史版本
            <span v-if="activeRunOption">第 {{ activeRunOption.attempt }} 版</span>
          </button>
          <div v-if="historyOpen" class="diagnostic-history-options">
            <button
              v-for="option in runOptions"
              :key="option.runId"
              type="button"
              :class="{ active: option.runId === activeRunId }"
              @click="selectRun(option.runId)"
            >
              <strong>第 {{ option.attempt }} 版</strong>
              <span>{{ formatDateTime(option.createdAt) }}</span>
            </button>
          </div>
        </div>
        <p v-if="diagnosticsLoading && !visibleDiagnostics.length" class="flow-muted">正在加载诊断截图</p>
        <p v-else-if="diagnosticsLoading" class="flow-muted diagnostic-refreshing">正在自动更新诊断截图</p>
        <DiagnosticScreenshotGrid
          v-if="visibleDiagnostics.length || !diagnosticsLoading"
          :rows="visibleDiagnostics"
          :title-prefix="diagnosticTitlePrefix"
        />
      </template>
    </section>
  </div>
</template>
