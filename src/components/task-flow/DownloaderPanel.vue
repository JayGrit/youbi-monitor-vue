<script setup>
import { computed, ref, watch } from 'vue'
import { formatDuration } from '../../utils/format'
import { normalizeResourceUrl } from '../../utils/media'

const props = defineProps({
  flow: { type: Object, default: null },
  stage: { type: Object, default: null },
  media: { type: Array, default: () => [] },
  coverUrl: { type: String, default: '' },
  logAudioEvent: { type: Function, required: true },
})

const videoInfo = computed(() => props.flow?.videoInfo || {})
const subtitleManifest = ref([])

watch(
  () => videoInfo.value.source_subtitles_url,
  async value => {
    subtitleManifest.value = []
    const url = normalizeResourceUrl(value || '')
    if (!url) return
    try {
      const response = await fetch(url)
      if (!response.ok) return
      const rows = await response.json()
      subtitleManifest.value = Array.isArray(rows) ? rows : []
    } catch {
      // Direct subtitle links remain available when the manifest cannot be loaded.
    }
  },
  { immediate: true },
)

const detailRows = computed(() => {
  const table = props.stage?.tables?.find(item => item.name === 'downloader_detail')
  return Array.isArray(table?.rows) ? table.rows : []
})

const taskRows = computed(() => {
  const rows = [...detailRows.value]
  for (const kind of ['metadata', 'audio', 'video']) {
    if (!rows.some(row => row?.kind === kind)) {
      rows.push({ kind, status: 'pending', progress_percent: 0 })
    }
  }
  return rows.sort((left, right) => taskOrder(left.kind) - taskOrder(right.kind))
})

const audioAsset = computed(() => {
  const url = normalizeResourceUrl(videoInfo.value.audio_source_url || '')
  if (url) {
    return { name: 'audio_source_url', kind: 'audio', url }
  }
  return props.media.find(item => item.kind === 'audio' && /audio_source|source_audio|audio/i.test(assetText(item))) || null
})

const videoAsset = computed(() => {
  const url = normalizeResourceUrl(videoInfo.value.video_source_url || '')
  if (url) {
    return { name: 'video_source_url', kind: 'video', url }
  }
  return props.media.find(item => item.kind === 'video' && /video_source|source_video|video/i.test(assetText(item))) || null
})

const subtitleLinks = computed(() => {
  const links = []
  addSubtitleLink(links, 'SRT', videoInfo.value.source_subtitle_srt_url)
  addSubtitleLink(links, 'TXT', videoInfo.value.source_subtitle_txt_url)
  for (const row of subtitleManifest.value) {
    const label = [row.kind, row.role, row.language].filter(Boolean).join(' / ') || '字幕'
    addSubtitleLink(links, `${label} SRT`, row.srt_url)
    addSubtitleLink(links, `${label} TXT`, row.txt_url)
  }
  const seen = new Set()
  return links.filter(item => {
    if (!item.url || seen.has(item.url)) return false
    seen.add(item.url)
    return true
  })
})

const tagList = computed(() => {
  try {
    const tags = JSON.parse(videoInfo.value.source_tags_json || '[]')
    return Array.isArray(tags) ? tags.filter(Boolean).map(String) : []
  } catch {
    return []
  }
})

function addSubtitleLink(links, label, value) {
  const url = normalizeResourceUrl(value || '')
  if (url) links.push({ label, url })
}

function taskOrder(kind) {
  return { metadata: 1, audio: 2, video: 3 }[kind] || 99
}

function progressPercent(row) {
  const value = Number(row?.progress_percent ?? row?.progressPercent ?? 0)
  if (!Number.isFinite(value)) return 0
  if (row?.status === 'success' || row?.status === 'skipped') return 100
  return Math.max(0, Math.min(100, value))
}

function progressText(row) {
  const percent = progressPercent(row)
  if (row?.status === 'success' || row?.status === 'skipped') return '100%'
  return percent > 0 ? `${percent.toFixed(percent >= 10 ? 0 : 1)}%` : '-'
}

function bytesText(value) {
  const bytes = Number(value || 0)
  if (!Number.isFinite(bytes) || bytes <= 0) return ''
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${bytes} B`
}

function taskTitle(kind) {
  return {
    metadata: '视频信息',
    audio: '音频文件',
    video: '视频文件',
  }[kind] || kind || '子任务'
}

function assetText(asset) {
  return [asset?.name, asset?.objectName, asset?.url, ...(asset?.names || [])].filter(Boolean).join(' ')
}
</script>

<template>
  <div class="downloader-panel">
    <section class="flow-section downloader-info">
      <h4>视频信息</h4>
      <div class="downloader-info-layout">
        <a v-if="coverUrl" class="downloader-cover" :href="coverUrl" target="_blank" rel="noreferrer">
          <img :src="coverUrl" alt="" />
        </a>
        <div v-else class="downloader-cover downloader-cover-empty">无封面</div>

        <div class="downloader-info-main">
          <h3>{{ videoInfo.title || flow?.task?.title || flow?.task?.id || '-' }}</h3>
          <dl class="downloader-meta-list">
            <div>
              <dt>作者</dt>
              <dd>{{ videoInfo.source_uploader || '-' }}</dd>
            </div>
            <div>
              <dt>视频时长</dt>
              <dd>{{ formatDuration(videoInfo.source_duration_seconds) }}</dd>
            </div>
            <div>
              <dt>字幕文本</dt>
              <dd>
                <span v-if="!subtitleLinks.length">-</span>
                <span v-else class="downloader-link-list">
                  <a v-for="item in subtitleLinks" :key="item.url" :href="item.url" target="_blank" rel="noreferrer">
                    {{ item.label }}
                  </a>
                </span>
              </dd>
            </div>
            <div class="downloader-description">
              <dt>简介</dt>
              <dd>{{ videoInfo.source_description || '-' }}</dd>
            </div>
            <div>
              <dt>Tags</dt>
              <dd>
                <span v-if="!tagList.length">-</span>
                <span v-else class="downloader-tags">
                  <span v-for="tag in tagList" :key="tag">{{ tag }}</span>
                </span>
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </section>

    <section class="flow-section downloader-subtasks">
      <h4>子任务下载进度</h4>
      <div class="downloader-task-list">
        <article v-for="row in taskRows" :key="row.kind" :class="['downloader-task', `status-${row.status || 'pending'}`]">
          <div class="downloader-task-head">
            <strong>{{ taskTitle(row.kind) }}</strong>
            <span>{{ row.status || 'pending' }}</span>
          </div>
          <div class="downloader-progress" aria-hidden="true">
            <span :style="{ width: `${progressPercent(row)}%` }"></span>
          </div>
          <div class="downloader-task-meta">
            <span>{{ progressText(row) }}</span>
            <span>{{ bytesText(row.downloaded_bytes) || bytesText(row.total_bytes) || row.operator || '-' }}</span>
          </div>
          <pre v-if="row.error_message" class="downloader-task-error">{{ row.error_message }}</pre>
        </article>
      </div>
      <div v-if="audioAsset?.url" class="downloader-audio">
        <div class="media-title">
          <strong>源音频</strong>
          <a :href="audioAsset.url" target="_blank" rel="noreferrer">MinIO</a>
        </div>
        <audio
          :src="audioAsset.url"
          controls
          preload="none"
          @loadstart="event => logAudioEvent('loadstart', audioAsset, event)"
          @play="event => logAudioEvent('play', audioAsset, event)"
          @playing="event => logAudioEvent('playing', audioAsset, event)"
          @waiting="event => logAudioEvent('waiting', audioAsset, event)"
          @error="event => logAudioEvent('error', audioAsset, event)"
        ></audio>
      </div>
    </section>

    <section class="flow-section downloader-video-section">
      <h4>视频</h4>
      <article v-if="videoAsset?.url" class="downloader-video">
        <video :src="videoAsset.url" controls preload="metadata"></video>
        <a :href="videoAsset.url" target="_blank" rel="noreferrer">MinIO</a>
      </article>
      <p v-else class="flow-muted">暂无源视频文件。</p>
    </section>
  </div>
</template>
