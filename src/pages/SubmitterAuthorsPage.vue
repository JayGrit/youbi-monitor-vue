<script setup>
import { computed, ref, unref } from 'vue'
import PlatformIcon from '../components/PlatformIcon.vue'
import { formatDateTime, formatNumber } from '../utils/format'
import { normalizeResourceUrl } from '../utils/media'

const props = defineProps({
  submitterAuthorTypeError: { type: String, default: '' },
  submitterAuthorTypeRows: { type: Array, default: () => [] },
  submitterTaskTypes: { type: Array, default: () => [] },
  submitterTopics: { type: Array, default: () => [] },
  platformIconUrls: { type: Object, default: () => ({}) },
  submitterAuthorTypeSaving: { type: String, default: '' },
  submitterAuthorDeleting: { type: String, default: '' },
  submitterInput: { type: String, default: '' },
  submitterBusy: { type: Boolean, default: false },
  submitterMonitorState: { type: Object, default: null },
  submitterMonitorLoading: { type: Boolean, default: false },
  submitterMonitorError: { type: String, default: '' },
  submitterMonitorLoadedAt: { type: String, default: '' },
  submitterMonitorContinueBusy: { type: String, default: '' },
  autosaveSubmitterAuthorType: { type: Function, required: true },
  createSubmitterTopic: { type: Function, required: true },
  deleteSubmitterAuthor: { type: Function, required: true },
  submitSubmitterInput: { type: Function, required: true },
  continueSubmitterAuthorScan: { type: Function, required: true },
  fetchSubmitterAuthorNewVideos: { type: Function, required: true },
  loadSubmitterEditingOptions: { type: Function, required: true },
  loadSubmitterAuthorTypes: { type: Function, required: true },
})

const emit = defineEmits(['update:submitterInput'])
const editMode = ref(false)
const newTopicAuthor = ref('')
const newTopicName = ref('')
const newTopicCreating = ref(false)
const newTopicError = ref('')
const selectedScan = ref(null)
const pendingDeleteRow = ref(null)
const expandedTopics = ref(new Set())

const monitorState = computed(() => {
  const raw = unref(props.submitterMonitorState)
  return raw?.data || raw?.item || raw || {}
})
const monitorLoading = computed(() => props.submitterMonitorLoading)
const monitorError = computed(() => props.submitterMonitorError)
const monitorLoadedAt = computed(() => props.submitterMonitorLoadedAt)
const monitorAuthors = computed(() => monitorState.value?.authors || [])
const monitorBatches = computed(() => monitorState.value?.batches || [])

const authorTypeGroups = computed(() => {
  const groups = new Map()
  for (const row of props.submitterAuthorTypeRows) {
    const topic = String(row?.draftTopic || row?.topic || '').trim() || '未设置'
    if (!groups.has(topic)) groups.set(topic, [])
    groups.get(topic).push(row)
  }
  return [...groups.entries()].map(([topic, rows]) => ({ topic, rows }))
})

function isTopicExpanded(topic) {
  return expandedTopics.value.has(topic)
}

function toggleTopic(topic) {
  const next = new Set(expandedTopics.value)
  if (next.has(topic)) next.delete(topic)
  else next.add(topic)
  expandedTopics.value = next
}

async function toggleEditMode() {
  editMode.value = !editMode.value
  if (editMode.value) await props.loadSubmitterEditingOptions()
}

function flushTypeAutosave(row, autosave) {
  autosave(row)
}

const topicOptions = computed(() => props.submitterTopics
  .map(item => String(item?.topic || '').trim())
  .filter(Boolean))

function onTopicSelect(row, event) {
  const topic = String(event.target.value || '')
  if (topic === '__new__') {
    newTopicAuthor.value = row.author
    newTopicName.value = ''
    newTopicError.value = ''
    event.target.value = row.draftTopic
    return
  }
  newTopicAuthor.value = ''
  newTopicName.value = ''
  newTopicError.value = ''
  row.draftTopic = topic
  props.autosaveSubmitterAuthorType(row)
}

async function createTopicForRow(row) {
  const topic = newTopicName.value.trim()
  if (!topic || newTopicCreating.value) return
  newTopicCreating.value = true
  newTopicError.value = ''
  try {
    const created = await props.createSubmitterTopic(topic)
    row.draftTopic = String(created?.topic || topic)
    newTopicAuthor.value = ''
    newTopicName.value = ''
    await props.autosaveSubmitterAuthorType(row)
  } catch (err) {
    newTopicError.value = err instanceof Error ? err.message : String(err)
  } finally {
    newTopicCreating.value = false
  }
}

function onResetCoverChange(row, autosave) {
  if (!row.draftResetCover) {
    row.draftCoverOrientation = ''
  } else if (!row.draftCoverOrientation) {
    row.draftCoverOrientation = 'horizontal'
  }
  autosave(row)
}

function onCoverOrientationChange(row, orientation, autosave) {
  if (!row.draftResetCover) return
  row.draftCoverOrientation = row.draftCoverOrientation === orientation ? '' : orientation
  if (!row.draftCoverOrientation) {
    row.draftCoverOrientation = orientation
  }
  autosave(row)
}

function sourcePlatform(row) {
  const value = String(row?.source || row?.platform || '').trim().toLowerCase()
  if (value.includes('youtube') || value === 'yt') return 'youtube'
  if (value.includes('tiktok')) return 'tiktok'
  if (value.includes('douyin') || value.includes('iesdouyin')) return 'douyin'
  const text = `${row?.authorUrl || ''} ${row?.author || ''}`.toLowerCase()
  if (/youtu\.?be|youtube\.com/.test(text)) return 'youtube'
  if (/tiktok\.com/.test(text)) return 'tiktok'
  if (/douyin\.com|iesdouyin\.com/.test(text)) return 'douyin'
  return ''
}

function sourceLabel(row) {
  const platform = sourcePlatform(row)
  if (platform === 'youtube') return 'YouTube'
  if (platform === 'tiktok') return 'TikTok'
  if (platform === 'douyin') return '抖音'
  return '来源'
}

function sourceIconUrl(row) {
  const platform = sourcePlatform(row)
  if (platform === 'youtube') return props.platformIconUrls.youtube || ''
  if (platform === 'tiktok' || platform === 'douyin') return props.platformIconUrls.douyin || ''
  return ''
}

function authorHref(row) {
  const url = String(row?.authorUrl || '').trim()
  return /^https?:\/\//i.test(url) ? url : ''
}

function authorName(row) {
  return String(row?.displayName || row?.authorHandle || row?.author || '').trim() || '-'
}

function authorAvatar(row) {
  return normalizeResourceUrl(row?.avatarUrl || '')
}

function authorInitial(row) {
  return authorName(row).slice(0, 1).toUpperCase()
}

function taskTypeLabel(value) {
  const option = props.submitterTaskTypes.find(item => item.taskType === value)
  return option?.name || value || '-'
}

function normalizedAuthorKeys(row) {
  return [
    row?.author,
    row?.authorHandle,
    row?.displayName,
    row?.authorUrl,
    row?.sourceUrl,
    row?.channelId,
    row?.platformAuthorId,
  ].flatMap(value => {
    const text = String(value || '').trim().toLowerCase()
    if (!text) return []
    const keys = [text]
    if (/^https?:\/\//.test(text)) {
      try {
        const url = new URL(text)
        url.search = ''
        url.hash = ''
        url.pathname = url.pathname.replace(/\/(?:videos?|video)\/?$/, '').replace(/\/$/, '')
        keys.push(url.toString().replace(/\/$/, ''))
        keys.push(decodeURIComponent(url.toString()).replace(/\/$/, ''))
      } catch {
        // Keep the original value when an author URL cannot be parsed.
      }
    }
    return keys
  }).filter(Boolean)
}

function scanForAuthor(row) {
  const rowKeys = new Set(normalizedAuthorKeys(row))
  return monitorAuthors.value.find(scan => normalizedAuthorKeys(scan).some(key => rowKeys.has(key))) || null
}

function num(value) {
  return formatNumber(Number(value || 0))
}

function scanLimitText(scan) {
  return '前 200 条'
}

function urlWaitingCount(scan) {
  return Number(scan?.pendingImportCount || 0) + Number(scan?.runningImportCount || 0)
}

function urlStatusTotal(scan) {
  return Number(scan?.doneImportCount || 0) + urlWaitingCount(scan) + Number(scan?.failedImportCount || 0)
}

function urlSegmentStyle(scan, key) {
  const total = urlStatusTotal(scan)
  const values = {
    done: Number(scan?.doneImportCount || 0),
    waiting: urlWaitingCount(scan),
    failed: Number(scan?.failedImportCount || 0),
  }
  const width = total > 0 ? Math.max(0, Math.min(100, (values[key] || 0) / total * 100)) : 0
  return { width: `${width}%` }
}

function canContinueScan(scan) {
  return !['queued', 'scanning', 'processing'].includes(String(scan?.lastBatchStatus || '').toLowerCase())
}

function scanBatches(scan) {
  if (!scan) return []
  const keys = new Set(normalizedAuthorKeys(scan))
  return monitorBatches.value.filter(batch => (
    Number(batch?.authorId) === Number(scan?.id)
    || normalizedAuthorKeys(batch).some(key => keys.has(key))
  ))
}

function openScanBatches(scan) {
  selectedScan.value = scan
}

async function confirmDeleteAuthor() {
  const row = pendingDeleteRow.value
  if (!row) return
  pendingDeleteRow.value = null
  await props.deleteSubmitterAuthor(row)
}

function statusLabel(status) {
  return {
    scanning: '扫描中',
    processing: '加载中',
    pending: '等待',
    running: '执行中',
    done: '完成',
    failed: '失败',
    skipped: '跳过',
  }[String(status || '').toLowerCase()] || status || '-'
}

function statusClass(status) {
  const value = String(status || '').toLowerCase()
  if (['scanning', 'processing', 'running'].includes(value)) return 'running'
  if (['done', 'idle'].includes(value)) return 'done'
  return value
}

function batchTotal(batch) {
  return Number(batch?.total || batch?.discovered || 0)
}

function batchSaved(batch) {
  return Number(batch?.saved || batch?.registered || 0)
}

function batchProgressStyle(batch) {
  const total = batchTotal(batch)
  const ratio = total > 0 ? Math.round((batchSaved(batch) / total) * 100) : 0
  return { width: `${Math.max(0, Math.min(100, ratio))}%` }
}

async function refreshMonitor() {
  await props.loadSubmitterAuthorTypes()
}

async function continueAuthorScan(scan) {
  await props.continueSubmitterAuthorScan(scan)
}

async function fetchAuthorNewVideos(row) {
  await props.fetchSubmitterAuthorNewVideos(row)
}
</script>

<template>
  <section class="submitter-author-page" aria-label="作者管理">
    <section class="submitter-actions-panel">
      <form class="submitter-submit-row" @submit.prevent="submitSubmitterInput">
        <label>
          <span>视频或作者</span>
          <input
            :value="submitterInput"
            type="text"
            placeholder="粘贴 YouTube / TikTok / 抖音视频链接或作者主页"
            required
            @input="emit('update:submitterInput', $event.target.value)"
          />
        </label>
        <button type="submit" :disabled="submitterBusy">{{ submitterBusy ? '处理中' : '提交' }}</button>
      </form>
    </section>

    <section class="submitter-author-page-panel">
      <header class="submitter-author-panel-header">
        <div>
          <h1>作者管理</h1>
          <span>共 {{ submitterAuthorTypeRows.length }} 位作者</span>
        </div>
        <div class="submitter-author-header-actions">
          <span v-if="monitorLoadedAt">扫描更新 {{ formatDateTime(monitorLoadedAt) }}</span>
          <button type="button" class="submitter-author-refresh" :disabled="monitorLoading" @click="refreshMonitor">
            {{ monitorLoading ? '刷新中' : '刷新扫描' }}
          </button>
          <button type="button" class="submitter-author-edit" @click="toggleEditMode">
            {{ editMode ? '完成' : '编辑' }}
          </button>
        </div>
        <p v-if="submitterAuthorTypeError" class="inline-error">{{ submitterAuthorTypeError }}</p>
        <p v-if="monitorError" class="inline-error">{{ monitorError }}</p>
      </header>
      <div class="submitter-author-type-body" :class="{ editing: editMode }">
        <p v-if="submitterAuthorTypeRows.length === 0" class="submitter-empty">暂无作者</p>
        <section
          v-for="group in authorTypeGroups"
          :key="group.topic"
          class="submitter-author-type-group"
          :class="{ expanded: isTopicExpanded(group.topic) }"
        >
          <button
            type="button"
            class="submitter-author-type-title"
            :aria-expanded="isTopicExpanded(group.topic)"
            @click="toggleTopic(group.topic)"
          >
            <strong>{{ group.topic }}</strong>
            <span>
              {{ group.rows.length }} 位作者
              <i aria-hidden="true">{{ isTopicExpanded(group.topic) ? '−' : '+' }}</i>
            </span>
          </button>
          <template v-if="isTopicExpanded(group.topic)">
            <div class="submitter-author-type-head" aria-hidden="true">
              <span>来源</span>
              <span>作者</span>
              <span>任务类型</span>
              <span v-if="editMode">配置</span>
              <span v-if="editMode">语言</span>
              <span>扫描上限</span>
              <span>URL 总数</span>
              <span>采集进度</span>
              <span>操作</span>
            </div>
            <article v-for="row in group.rows" :key="row.author" class="submitter-author-type-row">
            <div class="submitter-author-source-cell">
              <PlatformIcon :src="sourceIconUrl(row)" :label="sourceLabel(row)" :platform="sourcePlatform(row)" :size="24" />
            </div>
            <div class="submitter-author-main-cell">
              <div class="submitter-author-profile">
                <img v-if="authorAvatar(row)" :src="authorAvatar(row)" :alt="authorName(row)" loading="lazy" />
                <span v-else class="submitter-author-avatar-fallback">{{ authorInitial(row) }}</span>
                <div>
                  <a
                    v-if="authorHref(row)"
                    class="submitter-author-link"
                    :href="authorHref(row)"
                    target="_blank"
                    rel="noreferrer"
                  >
                    {{ authorName(row) }}
                  </a>
                  <span v-else class="submitter-author-name">{{ authorName(row) }}</span>
                </div>
              </div>
              <div v-if="editMode" class="submitter-author-type-edit">
                <select
                  :value="row.draftTopic"
                  :disabled="submitterAuthorTypeSaving === row.author"
                  @change="onTopicSelect(row, $event)"
                >
                  <option value="__new__">新建 Topic</option>
                  <option v-for="topic in topicOptions" :key="topic" :value="topic">{{ topic }}</option>
                </select>
                <div v-if="newTopicAuthor === row.author" class="submitter-new-topic">
                  <input
                    v-model="newTopicName"
                    type="text"
                    placeholder="输入新 Topic"
                    :disabled="newTopicCreating"
                    @keydown.enter.prevent="createTopicForRow(row)"
                  />
                  <button type="button" :disabled="!newTopicName.trim() || newTopicCreating" @click="createTopicForRow(row)">
                    {{ newTopicCreating ? '新建中…' : '新建' }}
                  </button>
                  <small v-if="newTopicError" class="submitter-new-topic-error">{{ newTopicError }}</small>
                </div>
              </div>
            </div>
            <div class="submitter-author-task-cell">
                <select
                  v-if="editMode"
                  v-model="row.draftTaskType"
                  :disabled="submitterAuthorTypeSaving === row.author"
                  @change="autosaveSubmitterAuthorType(row)"
                >
                  <option
                    v-for="taskType in submitterTaskTypes"
                    :key="taskType.taskType"
                    :value="taskType.taskType"
                  >
                    {{ taskType.name || taskType.taskType }}
                  </option>
                </select>
                <span v-else>{{ taskTypeLabel(row.draftTaskType) }}</span>
            </div>
            <div v-if="editMode" class="submitter-author-settings-cell">
              <div class="submitter-author-check-grid">
                <label v-if="editMode" class="submitter-author-type-check">
                  <input
                    v-model="row.draftHasBackgroundAudio"
                    type="checkbox"
                    :disabled="submitterAuthorTypeSaving === row.author"
                    @change="autosaveSubmitterAuthorType(row)"
                  />
                  <span>有背景音</span>
                </label>
                <label v-if="editMode" class="submitter-author-type-check">
                  <input
                    v-model="row.draftResetCover"
                    type="checkbox"
                    :disabled="submitterAuthorTypeSaving === row.author"
                    @change="onResetCoverChange(row, autosaveSubmitterAuthorType)"
                  />
                  <span>重制封面</span>
                </label>
                <label v-if="editMode" class="submitter-author-type-check">
                  <input
                    :checked="row.draftCoverOrientation === 'horizontal'"
                    type="checkbox"
                    :disabled="submitterAuthorTypeSaving === row.author || !row.draftResetCover"
                    @change="onCoverOrientationChange(row, 'horizontal', autosaveSubmitterAuthorType)"
                  />
                  <span>横向封面</span>
                </label>
                <label v-if="editMode" class="submitter-author-type-check">
                  <input
                    :checked="row.draftCoverOrientation === 'vertical'"
                    type="checkbox"
                    :disabled="submitterAuthorTypeSaving === row.author || !row.draftResetCover"
                    @change="onCoverOrientationChange(row, 'vertical', autosaveSubmitterAuthorType)"
                  />
                  <span>竖向封面</span>
                </label>
                <label v-if="editMode" class="submitter-author-type-check">
                  <input
                    v-model="row.draftFetchNewVideos"
                    type="checkbox"
                    :disabled="submitterAuthorTypeSaving === row.author"
                    @change="autosaveSubmitterAuthorType(row)"
                  />
                  <span>拉取新视频</span>
                </label>
                <label v-if="editMode" class="submitter-author-type-check">
                  <input
                    v-model="row.draftBilibiliExists"
                    type="checkbox"
                    :disabled="submitterAuthorTypeSaving === row.author"
                    @change="autosaveSubmitterAuthorType(row)"
                  />
                  <span>B站已有人发</span>
                </label>
              </div>
            </div>
            <div v-if="editMode" class="submitter-author-language-cell">
                <input
                  v-model="row.draftSourceLanguage"
                  type="text"
                  placeholder="英文"
                  :disabled="submitterAuthorTypeSaving === row.author || submitterAuthorDeleting === row.author"
                  @change="autosaveSubmitterAuthorType(row)"
                  @blur="autosaveSubmitterAuthorType(row)"
                />
                <input
                  v-model="row.draftTargetLanguage"
                  type="text"
                  placeholder="中文"
                  :disabled="submitterAuthorTypeSaving === row.author || submitterAuthorDeleting === row.author"
                  @change="autosaveSubmitterAuthorType(row)"
                  @blur="autosaveSubmitterAuthorType(row)"
                />
            </div>
            <div class="submitter-author-scan">
              <div v-if="!scanForAuthor(row)" class="submitter-author-scan-empty">
                <small>{{ monitorLoading ? '正在加载扫描数据' : '暂无扫描数据' }}</small>
                <span class="submitter-monitor-url-bar" aria-hidden="true"></span>
              </div>
              <template v-else>
                <button type="button" class="submitter-author-scan-summary" @click="openScanBatches(scanForAuthor(row))">
                  <span class="submitter-author-scan-number">
                    <strong>{{ scanLimitText(scanForAuthor(row)) }}</strong>
                  </span>
                  <span class="submitter-author-scan-number">
                    <strong>{{ num(scanForAuthor(row).candidateCount) }}</strong>
                  </span>
                  <span class="submitter-author-scan-progress">
                    <span class="submitter-author-progress-track">
                      <i class="done" :style="urlSegmentStyle(scanForAuthor(row), 'done')"></i>
                      <i class="waiting" :style="urlSegmentStyle(scanForAuthor(row), 'waiting')"></i>
                      <i class="failed" :style="urlSegmentStyle(scanForAuthor(row), 'failed')"></i>
                    </span>
                  </span>
                </button>
              </template>
            </div>
            <div class="submitter-author-action-cell">
              <template v-if="scanForAuthor(row)">
                  <button
                    type="button"
                    class="submitter-monitor-row-action"
                    :disabled="!canContinueScan(scanForAuthor(row)) || submitterMonitorContinueBusy === scanForAuthor(row).author"
                    @click="continueAuthorScan(scanForAuthor(row))"
                  >
                    {{ submitterMonitorContinueBusy === scanForAuthor(row).author ? '提交中' : (canContinueScan(scanForAuthor(row)) ? '全量加载' : '已完成') }}
                  </button>
                  <button
                    type="button"
                    class="submitter-monitor-row-action submitter-monitor-row-action-incremental"
                    :disabled="!canContinueScan(scanForAuthor(row)) || submitterMonitorContinueBusy === scanForAuthor(row).author"
                    @click="fetchAuthorNewVideos(row)"
                  >
                    {{ submitterMonitorContinueBusy === scanForAuthor(row).author ? '提交中' : '增量拉取' }}
                  </button>
              </template>
              <button
                type="button"
                class="submitter-author-delete"
                :disabled="submitterAuthorDeleting === row.author || Boolean(submitterAuthorTypeSaving)"
                @click="pendingDeleteRow = row"
              >
                {{ submitterAuthorDeleting === row.author ? '删除中' : '删除' }}
              </button>
            </div>
          </article>
          </template>
        </section>
      </div>
    </section>

    <div v-if="selectedScan" class="submitter-monitor-modal-backdrop" @click.self="selectedScan = null">
      <section class="submitter-monitor-modal" role="dialog" aria-modal="true" aria-labelledby="submitter-author-batches-title">
        <header>
          <div>
            <h2 id="submitter-author-batches-title">{{ authorName(selectedScan) }}</h2>
            <span>{{ num(scanBatches(selectedScan).length) }} 个批次 · 候选 {{ num(selectedScan.candidateCount) }} · 已加载 {{ num(selectedScan.doneImportCount) }}</span>
          </div>
          <button type="button" @click="selectedScan = null">关闭</button>
        </header>
        <div class="submitter-monitor-batch-list">
          <article v-for="batch in scanBatches(selectedScan)" :key="batch.batch" class="submitter-monitor-batch-row">
            <div class="submitter-monitor-batch-top">
              <span class="submitter-monitor-badge" :class="statusClass(batch.status)">{{ statusLabel(batch.status) }}</span>
              <strong>{{ num(batchSaved(batch)) }}/{{ num(batchTotal(batch)) }}</strong>
              <small>{{ formatDateTime(batch.updatedAt || batch.createdAt) }}</small>
            </div>
            <div class="submitter-monitor-progress"><span :style="batchProgressStyle(batch)"></span></div>
            <p>
              <span>跳过 {{ num(batch.skipped) }}</span>
              <span>失败 {{ num(batch.failed) }}</span>
            </p>
            <em v-if="batch.error" class="submitter-monitor-error">{{ batch.error }}</em>
          </article>
          <p v-if="scanBatches(selectedScan).length === 0" class="submitter-empty">暂无导入批次</p>
        </div>
      </section>
    </div>

    <div v-if="pendingDeleteRow" class="submitter-monitor-modal-backdrop" @click.self="pendingDeleteRow = null">
      <section class="submitter-author-delete-modal" role="dialog" aria-modal="true" aria-labelledby="submitter-author-delete-title">
        <h2 id="submitter-author-delete-title">删除作者</h2>
        <p>
          确定删除作者“<strong>{{ authorName(pendingDeleteRow) }}</strong>”吗？
          该作者名下的所有视频和导入记录也会一并删除，此操作无法撤销。
        </p>
        <div>
          <button type="button" class="submitter-author-delete-cancel" @click="pendingDeleteRow = null">取消</button>
          <button type="button" class="submitter-author-delete-confirm" @click="confirmDeleteAuthor">确认删除</button>
        </div>
      </section>
    </div>
  </section>
</template>
