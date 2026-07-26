<script setup>
import { computed, onMounted, ref, unref } from 'vue'
import { postJson, requestJson } from '../api/http'
import { formatDateTime, formatNumber } from '../utils/format'

const props = defineProps({
  submitterMonitorState: { type: Object, default: null },
  submitterMonitorLoading: { type: Boolean, default: false },
  submitterMonitorError: { type: String, default: '' },
  submitterMonitorLoadedAt: { type: String, default: '' },
  submitterMonitorContinueBusy: { type: String, default: '' },
  loadSubmitterMonitor: { type: Function, default: null },
  continueSubmitterAuthorScan: { type: Function, default: null },
})

const submitterApiBase = `${import.meta.env.BASE_URL}submitter-api`
const localMonitorState = ref(null)
const localMonitorLoading = ref(false)
const localMonitorError = ref('')
const localMonitorLoadedAt = ref('')
const localContinueBusy = ref('')
const selectedAuthor = ref(null)

const monitorState = computed(() => {
  const raw = localMonitorState.value || unref(props.submitterMonitorState)
  return raw?.data || raw?.item || raw || {}
})
const monitorLoading = computed(() => localMonitorLoading.value || props.submitterMonitorLoading)
const monitorError = computed(() => localMonitorError.value || props.submitterMonitorError)
const monitorLoadedAt = computed(() => localMonitorLoadedAt.value || props.submitterMonitorLoadedAt)
const monitorContinueBusy = computed(() => localContinueBusy.value || props.submitterMonitorContinueBusy)
const summary = computed(() => monitorState.value?.summary || {})
const authors = computed(() => monitorState.value?.authors || [])
const batches = computed(() => monitorState.value?.batches || [])
const selectedAuthorBatches = computed(() => {
  const author = selectedAuthor.value
  if (!author) return []
  const authorName = String(author.author || '').trim()
  const sourceUrl = String(author.sourceUrl || '').trim()
  const scanBatch = String(author.scanBatch || '').trim()
  return batches.value.filter((batch) => {
    const batchAuthor = String(batch?.author || '').trim()
    const batchSourceUrl = String(batch?.sourceUrl || '').trim()
    const batchId = String(batch?.batch || '').trim()
    return (
      (authorName && batchAuthor === authorName)
      || (sourceUrl && batchSourceUrl === sourceUrl)
      || (scanBatch && batchId === scanBatch)
    )
  })
})

const summaryCards = computed(() => [
  { key: 'authors', label: '作者', value: summary.value.totalAuthors, detail: `自动拉新 ${num(summary.value.autoFetchAuthors)}` },
  { key: 'scanning', label: '扫描中', value: summary.value.scanningAuthors, detail: `异常作者 ${num(summary.value.errorAuthors)}`, tone: Number(summary.value.scanningAuthors || 0) > 0 ? 'active' : '' },
  { key: 'imports', label: 'URL 加载', value: summary.value.pendingImports, detail: `运行 ${num(summary.value.runningImports)} · 失败 ${num(summary.value.failedImports)}`, tone: Number(summary.value.failedImports || 0) > 0 ? 'danger' : '' },
  { key: 'videos', label: '候选视频', value: summary.value.totalVideos, detail: `已加载 ${num(summary.value.doneImports)} · 未投稿 ${num(summary.value.unuploadedVideos)}` },
])

function num(value) {
  return formatNumber(Number(value || 0))
}

function statusLabel(status) {
  const labels = {
    scanning: '扫描中',
    processing: '加载中',
    pending: '等待',
    running: '执行中',
    done: '完成',
    failed: '失败',
    skipped: '跳过',
    idle: '空闲',
    unuploaded: '未投稿',
    uploaded: '已投稿',
  }
  return labels[status] || status || '-'
}

function statusClass(status) {
  const text = String(status || '').toLowerCase()
  return {
    running: ['scanning', 'processing', 'running'].includes(text),
    failed: text === 'failed',
    pending: text === 'pending',
    done: ['done', 'idle', 'uploaded'].includes(text),
  }
}

function progressText(batch) {
  const total = batchTotal(batch)
  const saved = batchSaved(batch)
  const failed = Number(batch?.failed || 0)
  const skipped = Number(batch?.skipped || 0)
  if (!total && !saved && !failed && !skipped) return '-'
  return `${num(saved)}/${num(total)} · 跳过 ${num(skipped)} · 失败 ${num(failed)}`
}

function batchTotal(batch) {
  return Number(batch?.total || batch?.discovered || 0)
}

function batchSaved(batch) {
  return Number(batch?.saved || batch?.registered || 0)
}

function batchProgressRatio(batch) {
  const total = batchTotal(batch)
  if (!Number.isFinite(total) || total <= 0) return 0
  return Math.max(0, Math.min(100, Math.round((batchSaved(batch) / total) * 100)))
}

function batchProgressStyle(batch) {
  return { width: `${batchProgressRatio(batch)}%` }
}

function parseTime(value) {
  const time = Date.parse(value || '')
  return Number.isFinite(time) ? time : 0
}

function elapsedText(batch) {
  const started = parseTime(batch?.createdAt)
  if (!started) return '-'
  const status = String(batch?.status || '').toLowerCase()
  const finished = parseTime(batch?.updatedAt)
  const ended = ['running', 'processing', 'scanning', 'pending'].includes(status) ? Date.now() : finished
  const seconds = Math.max(0, Math.round(((ended || finished || Date.now()) - started) / 1000))
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  const restSeconds = seconds % 60
  if (minutes < 60) return restSeconds ? `${minutes}m ${restSeconds}s` : `${minutes}m`
  const hours = Math.floor(minutes / 60)
  const restMinutes = minutes % 60
  return restMinutes ? `${hours}h ${restMinutes}m` : `${hours}h`
}

function authorBatchText(author) {
  const total = Number(author?.lastBatchTotal || author?.lastBatchDiscovered || 0)
  const saved = Number(author?.lastBatchSaved || 0)
  const failed = Number(author?.lastBatchFailed || 0)
  if (!author?.lastBatchStatus) return '-'
  return `${statusLabel(author.lastBatchStatus)} ${num(saved)}/${num(total)} · 失败 ${num(failed)}`
}

function continueMaxText(author) {
  return `继续到 ${num(Number(author?.scanMaxCount || 100) + 100)}`
}

function openAuthorBatches(author) {
  selectedAuthor.value = author
}

function closeAuthorBatches() {
  selectedAuthor.value = null
}

async function refreshMonitor() {
  localMonitorLoading.value = true
  localMonitorError.value = ''
  try {
    localMonitorState.value = await requestJson(
      `${submitterApiBase}/monitor`,
      undefined,
      { service: 'submitter', summary: '查询Submitter采集监控' },
    )
    localMonitorLoadedAt.value = new Date().toISOString()
  } catch (err) {
    localMonitorError.value = err instanceof Error ? err.message : String(err)
  } finally {
    localMonitorLoading.value = false
  }
}

async function continueAuthorScan(authorRow) {
  const author = String(authorRow?.author || '').trim()
  if (!author || localContinueBusy.value) return
  const platform = String(authorRow?.platform || 'youtube').trim() || 'youtube'
  const currentMax = Number(authorRow?.scanMaxCount || 100)
  const maxCount = (Number.isFinite(currentMax) && currentMax > 0 ? currentMax : 100) + 100
  localContinueBusy.value = author
  localMonitorError.value = ''
  try {
    await postJson(
      `${submitterApiBase}/authors/import/continue`,
      {
        author,
        platform,
        maxCount,
        topic: authorRow?.topic || undefined,
        taskType: authorRow?.taskType || undefined,
      },
      { service: 'submitter', summary: '继续导入作者视频' },
    )
    await refreshMonitor()
  } catch (err) {
    localMonitorError.value = err instanceof Error ? err.message : String(err)
  } finally {
    localContinueBusy.value = ''
  }
}

onMounted(refreshMonitor)
</script>

<template>
  <section class="submitter-monitor-page" aria-label="采集监控">
    <header class="submitter-monitor-header">
      <div>
        <h1>采集监控</h1>
        <span>作者扫描、URL 加载、候选视频入库状态</span>
      </div>
      <div class="submitter-monitor-actions">
        <span v-if="monitorLoadedAt">更新 {{ formatDateTime(monitorLoadedAt) }}</span>
        <button type="button" :disabled="monitorLoading" @click="refreshMonitor">
          {{ monitorLoading ? '刷新中' : '刷新' }}
        </button>
      </div>
    </header>

    <p v-if="monitorError" class="inline-error">{{ monitorError }}</p>

    <section class="submitter-monitor-summary">
      <article
        v-for="card in summaryCards"
        :key="card.key"
        class="submitter-monitor-card"
        :class="card.tone"
      >
        <span>{{ card.label }}</span>
        <strong>{{ num(card.value) }}</strong>
        <em>{{ card.detail }}</em>
      </article>
    </section>

    <section class="submitter-monitor-grid">
      <section class="submitter-monitor-panel submitter-monitor-authors">
        <header>
          <h2>作者扫描</h2>
          <span>{{ num(authors.length) }} 位作者，成功完成也会显示</span>
        </header>
        <div class="submitter-monitor-table-wrap">
          <table class="submitter-monitor-table">
            <thead>
              <tr>
                <th>作者</th>
                <th>状态</th>
                <th>上限</th>
                <th>候选</th>
                <th>URL 加载</th>
                <th>投稿</th>
                <th>最近动作</th>
                <th>错误</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="authors.length === 0">
                <td colspan="9" class="submitter-empty">暂无作者扫描数据</td>
              </tr>
              <tr
                v-for="author in authors"
                :key="author.id || author.author"
                class="submitter-monitor-author-row"
                tabindex="0"
                @click="openAuthorBatches(author)"
                @keydown.enter.prevent="openAuthorBatches(author)"
                @keydown.space.prevent="openAuthorBatches(author)"
              >
                <td>
                  <strong class="submitter-monitor-title">{{ author.displayName || author.author }}</strong>
                  <span>{{ author.platform }} · {{ author.topic || '未配置 topic' }}</span>
                  <a v-if="author.sourceUrl" :href="author.sourceUrl" target="_blank" rel="noreferrer">{{ author.sourceUrl }}</a>
                </td>
                <td>
                  <span class="submitter-monitor-badge" :class="statusClass(author.scanState)">
                    {{ statusLabel(author.scanState) }}
                  </span>
                  <small v-if="author.fetchNewVideos">自动拉新</small>
                  <small v-if="author.lastBatchStatus">{{ authorBatchText(author) }}</small>
                </td>
                <td>
                  <span>{{ num(author.scanMaxCount) }}</span>
                  <small v-if="author.scanLimitReached" class="submitter-monitor-limit">已拉满上限</small>
                </td>
                <td>{{ num(author.candidateCount) }}</td>
                <td>
                  <span>待 {{ num(author.pendingImportCount) }}</span>
                  <span>跑 {{ num(author.runningImportCount) }}</span>
                  <span>错 {{ num(author.failedImportCount) }}</span>
                </td>
                <td>
                  <span>未 {{ num(author.unuploadedCount) }}</span>
                  <span>待 {{ num(author.pendingSubmissionCount) }}</span>
                  <span>成 {{ num(author.uploadedCount) }}</span>
                </td>
                <td>
                  <span>{{ formatDateTime(author.scanStartedAt || author.lastFetchNewVideosAt || author.latestVideoUpdatedAt || author.updatedAt) }}</span>
                  <small>{{ num(author.doneImportCount) }} 条已加载</small>
                </td>
                <td>
                  <span class="submitter-monitor-error">{{ author.scanError || '-' }}</span>
                </td>
                <td>
                  <button
                    type="button"
                    class="submitter-monitor-row-action"
                    :disabled="!author.scanFinished || monitorContinueBusy === author.author"
                    @click.stop="continueAuthorScan(author)"
                  >
                    {{ monitorContinueBusy === author.author ? '提交中' : continueMaxText(author) }}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </section>

    <div v-if="selectedAuthor" class="submitter-monitor-modal-backdrop" @click.self="closeAuthorBatches">
      <section class="submitter-monitor-modal" role="dialog" aria-modal="true" aria-labelledby="submitter-monitor-modal-title">
        <header>
          <div>
            <h2 id="submitter-monitor-modal-title">{{ selectedAuthor.displayName || selectedAuthor.author }}</h2>
            <span>{{ num(selectedAuthorBatches.length) }} 个批次 · 候选 {{ num(selectedAuthor.candidateCount) }} · 已加载 {{ num(selectedAuthor.doneImportCount) }}</span>
          </div>
          <button type="button" @click="closeAuthorBatches">关闭</button>
        </header>

        <div class="submitter-monitor-batch-list">
          <article v-for="batch in selectedAuthorBatches" :key="batch.batch" class="submitter-monitor-batch-row">
            <div class="submitter-monitor-batch-top">
              <span class="submitter-monitor-badge" :class="statusClass(batch.status)">
                {{ statusLabel(batch.status) }}
              </span>
              <strong>{{ num(batchSaved(batch)) }}/{{ num(batchTotal(batch)) }}</strong>
              <small>耗时 {{ elapsedText(batch) }}</small>
            </div>
            <div class="submitter-monitor-progress" :aria-label="progressText(batch)">
              <span :style="batchProgressStyle(batch)"></span>
            </div>
            <p>
              <span>跳过 {{ num(batch.skipped) }}</span>
              <span>失败 {{ num(batch.failed) }}</span>
              <span>{{ formatDateTime(batch.updatedAt || batch.createdAt) }}</span>
            </p>
            <em v-if="batch.currentTitle">{{ batch.currentTitle }}</em>
            <em v-if="batch.error" class="submitter-monitor-error">{{ batch.error }}</em>
          </article>
          <p v-if="selectedAuthorBatches.length === 0" class="submitter-empty">暂无导入批次</p>
        </div>
      </section>
    </div>
  </section>
</template>
