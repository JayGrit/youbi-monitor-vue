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
  uploadPlatformName: { type: Function, required: true },
  submitSegments: { type: Function, required: true },
  uploadImage: { type: Function, required: true },
})

const diagnosticsRequested = ref(false)
const selectedRunId = ref('')
const historyOpen = ref(false)
const expandedDescriptions = ref(new Set())
const segmentResponse = ref('')
const segmentBusy = ref(false)
const segmentMessage = ref('')
const segmentError = ref('')
const imageFiles = ref({ cover: null, background: null, vertical: null, horizontal: null })
const imageBusy = ref('')
const imageMessage = ref('')
const imageError = ref('')
const copiedKey = ref('')

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
const jobByName = computed(() => Object.fromEntries(props.jobs.map(job => [job.job_name, job])))
const segmentRequest = computed(() => {
  const input = parseJsonObject(jobByName.value.generate_segment_plan?.input_json)
  return input.request ? JSON.stringify(input.request, null, 2) : ''
})

function promptWithRatio(prompt, ratio) {
  const value = String(prompt || '').trim()
  if (!value) return ''
  if (value.includes(ratio)) return value
  return `${value.replace(/[。\s]+$/, '')}。严格使用 ${ratio} 比例构图。`
}

function imageJobPrompt(jobName, fallbackPrompt, ratio) {
  const input = parseJsonObject(jobByName.value[jobName]?.input_json)
  return String(input.prompt || '').trim() || promptWithRatio(fallbackPrompt, ratio)
}

const manualImages = computed(() => [
  {
    kind: 'cover',
    label: '封面图',
    ratio: '1:1',
    prompt: imageJobPrompt('generate_cover_image', narration.value.cover_prompt, '1:1'),
    url: narration.value.cover_image_url || '',
  },
  {
    kind: 'background',
    label: '背景图',
    ratio: '4:3',
    prompt: imageJobPrompt('generate_background_image', narration.value.background_prompt, '4:3'),
    url: narration.value.background_image_url || '',
  },
])
const publishMetadataImages = computed(() => [
  {
    kind: 'vertical',
    label: '竖版封面',
    ratio: '3:4',
    prompt: imageJobPrompt('generate_narration_vertical_cover', '', '3:4'),
    url: videoInfo.value.vertical_cover_url || '',
  },
  {
    kind: 'horizontal',
    label: '横版封面',
    ratio: '4:3',
    prompt: imageJobPrompt('generate_narration_horizontal_cover', '', '4:3'),
    url: videoInfo.value.horizontal_cover_url || '',
  },
])
const showPublishMetadataImages = computed(() => {
  return publishMetadataImages.value.some(item => item.prompt || item.url)
})

const matchingDiagnostics = computed(() => {
  return props.diagnostics.filter(row => {
    const source = String(row?.source || '').toLowerCase()
    return ['doubao', 'chatgpt'].includes(row?.platform) && !source.includes('upload')
  })
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

function parseJsonObject(value) {
  if (!value) return {}
  if (typeof value === 'object' && !Array.isArray(value)) return value
  try {
    const parsed = JSON.parse(value)
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
  } catch {
    return {}
  }
}

async function copyText(key, value) {
  if (!value) return
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value)
  } else {
    const textarea = document.createElement('textarea')
    textarea.value = value
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.select()
    document.execCommand('copy')
    textarea.remove()
  }
  copiedKey.value = key
  window.setTimeout(() => {
    if (copiedKey.value === key) copiedKey.value = ''
  }, 1600)
}

async function submitManualSegments() {
  if (!segmentResponse.value.trim() || segmentBusy.value) return
  segmentBusy.value = true
  segmentMessage.value = ''
  segmentError.value = ''
  try {
    const result = await props.submitSegments(segmentResponse.value)
    segmentResponse.value = ''
    segmentMessage.value = `已写入 ${result.sentenceCount} 句、${result.segmentCount} 个片段`
  } catch (err) {
    segmentError.value = err instanceof Error ? err.message : String(err)
  } finally {
    segmentBusy.value = false
  }
}

function selectImage(kind, event) {
  imageFiles.value = {
    ...imageFiles.value,
    [kind]: event.target.files?.[0] || null,
  }
  imageMessage.value = ''
  imageError.value = ''
}

async function uploadManualImage(item) {
  const file = imageFiles.value[item.kind]
  if (!file || imageBusy.value) return
  imageBusy.value = item.kind
  imageMessage.value = ''
  imageError.value = ''
  try {
    const result = await props.uploadImage(item.kind, file)
    imageFiles.value = { ...imageFiles.value, [item.kind]: null }
    imageMessage.value = `${item.label}已上传：${result.width}x${result.height}`
  } catch (err) {
    imageError.value = err instanceof Error ? err.message : String(err)
  } finally {
    imageBusy.value = ''
  }
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
    props.uploadPlatformName(row.platform),
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
      <section class="narration-manual-card">
        <div class="narration-manual-head">
          <div>
            <strong>人工分段</strong>
            <span>复制完整大模型请求，提交模型原始返回值</span>
          </div>
          <button
            type="button"
            :disabled="!segmentRequest"
            @click="copyText('segments', segmentRequest)"
          >
            {{ copiedKey === 'segments' ? '已复制' : '复制完整请求' }}
          </button>
        </div>
        <p v-if="!segmentRequest" class="flow-muted">暂无完整请求；请先让 publisher 执行一次分段任务。</p>
        <textarea
          v-model="segmentResponse"
          rows="5"
          placeholder='粘贴大模型返回值，例如 {"end_line_ids":[8,17,25]}'
        ></textarea>
        <div class="narration-manual-actions">
          <button type="button" :disabled="segmentBusy || !segmentResponse.trim()" @click="submitManualSegments">
            {{ segmentBusy ? '校验并提交中' : '校验并提交分段' }}
          </button>
          <span v-if="segmentMessage" class="narration-manual-success">{{ segmentMessage }}</span>
        </div>
        <p v-if="segmentError" class="inline-error">{{ segmentError }}</p>
      </section>
      <div class="narration-manual-image-grid">
        <section v-for="item in manualImages" :key="item.kind" class="narration-manual-card">
          <div class="narration-manual-head">
            <div>
              <strong>人工生成{{ item.label }}</strong>
              <span>要求精确 {{ item.ratio }}</span>
            </div>
            <button
              type="button"
              :disabled="!item.prompt"
              @click="copyText(`image-${item.kind}`, item.prompt)"
            >
              {{ copiedKey === `image-${item.kind}` ? '已复制' : '复制绘图提示词' }}
            </button>
          </div>
          <p v-if="item.prompt" class="narration-manual-prompt">{{ item.prompt }}</p>
          <p v-else class="flow-muted">提示词尚未生成</p>
          <input type="file" accept="image/*" @change="selectImage(item.kind, $event)" />
          <div class="narration-manual-actions">
            <button
              type="button"
              :disabled="Boolean(imageBusy) || !imageFiles[item.kind] || !item.prompt"
              @click="uploadManualImage(item)"
            >
              {{ imageBusy === item.kind ? '校验并上传中' : `上传${item.label}` }}
            </button>
            <span v-if="item.url" class="narration-manual-complete">已入库</span>
          </div>
        </section>
      </div>
      <p v-if="imageMessage" class="narration-manual-success">{{ imageMessage }}</p>
      <p v-if="imageError" class="inline-error">{{ imageError }}</p>
      <template v-if="showPublishMetadataImages">
        <h4>投稿封面人工补交</h4>
        <div class="narration-manual-image-grid">
          <section v-for="item in publishMetadataImages" :key="item.kind" class="narration-manual-card">
            <div class="narration-manual-head">
              <div>
                <strong>人工生成{{ item.label }}</strong>
                <span>要求精确 {{ item.ratio }}</span>
              </div>
              <button
                type="button"
                :disabled="!item.prompt"
                @click="copyText(`image-${item.kind}`, item.prompt)"
              >
                {{ copiedKey === `image-${item.kind}` ? '已复制' : '复制完整绘图提示词' }}
              </button>
            </div>
            <p v-if="item.prompt" class="narration-manual-prompt">{{ item.prompt }}</p>
            <p v-else class="flow-muted">请先让 publisher 执行一次投稿元数据阶段，以保存实际发送的提示词。</p>
            <input type="file" accept="image/*" @change="selectImage(item.kind, $event)" />
            <div class="narration-manual-actions">
              <button
                type="button"
                :disabled="Boolean(imageBusy) || !imageFiles[item.kind] || !item.prompt"
                @click="uploadManualImage(item)"
              >
                {{ imageBusy === item.kind ? '校验并上传中' : `上传${item.label}` }}
              </button>
              <span v-if="item.url" class="narration-manual-complete">已入库</span>
            </div>
          </section>
        </div>
      </template>
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

    <section class="flow-section publisher-diagnostics">
      <div class="publisher-diagnostics-head">
        <h4>诊断截图</h4>
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
