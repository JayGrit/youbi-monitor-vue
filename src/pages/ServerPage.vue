<script setup>
import { computed, ref } from 'vue'
import ServerDiskStatusPanel from '../components/ServerDiskStatusPanel.vue'
import { uploadPlatformText } from '../domain/constants'

const props = defineProps({
  backupperDiskStatus: { type: Object, default: null },
  backupperDiskStatusText: { type: String, default: '' },
  loading: { type: Boolean, default: false },
  error: { type: String, default: '' },
  actionBusy: { type: String, default: '' },
  actionMessage: { type: String, default: '' },
  uploadIncompleteReport: { type: Object, default: null },
  uploadIncompleteReportError: { type: String, default: '' },
  platformIconUrls: { type: Object, default: () => ({}) },
  loadServerStatus: { type: Function, required: true },
  refreshServerStatus: { type: Function, required: true },
  runMinioCleanup: { type: Function, required: true },
  clearBuildCache: { type: Function, required: true },
  clearMysqlBinlog: { type: Function, required: true },
  clearDiagnostics: { type: Function, required: true },
  generateUploadIncompleteReport: { type: Function, required: true },
})

const uploadReportSort = ref('type')
const backupperStatusSummary = computed(() => {
  if (props.backupperDiskStatusText) return `硬盘占用 ${props.backupperDiskStatusText}`
  if (props.loading) return '加载中'
  return '暂无服务器状态'
})

const backupperStatTimeText = computed(() => {
  const value = props.backupperDiskStatus?.createdAt
  if (!value) return ''
  const textDateTime = String(value).match(/(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2})/)
  if (textDateTime) {
    return `${textDateTime[1]}-${textDateTime[2]}-${textDateTime[3]} ${textDateTime[4]}:${textDateTime[5]}`
  }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date).replace(/\//g, '-')
})

const uploadReportRows = computed(() => {
  const rows = [...(props.uploadIncompleteReport?.rows || [])]
  if (uploadReportSort.value === 'size') {
    return rows.sort((a, b) => Number(b?.remainingBytes || 0) - Number(a?.remainingBytes || 0))
  }
  return rows.sort((a, b) => {
    const left = `${a?.type || ''}/${a?.taskId || ''}`
    const right = `${b?.type || ''}/${b?.taskId || ''}`
    return left.localeCompare(right)
  })
})

const uploadReportSummary = computed(() => props.uploadIncompleteReport?.summary || {})
const uploadReportStatusCounts = computed(() => uploadReportSummary.value.statusCounts || [])
const uploadReportGeneratedText = computed(() => {
  const value = props.uploadIncompleteReport?.generatedAt
  if (!value) return ''
  const match = String(value).match(/(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/)
  if (match) return `${match[1]}-${match[2]}-${match[3]} ${match[4]}:${match[5]}`
  return backupperStatTimeText.value
})

function reportTaskState(row) {
  return `${row?.taskStatus || '-'}/${row?.currentStage || '-'}`
}

function platformStatuses(row) {
  const order = { success: 0, running: 1, ready: 2, pending: 3, failed: 9 }
  return Object.entries(row?.platforms || {})
    .filter(([, status]) => status && !['no_need', 'skipped'].includes(status))
    .map(([platform, status]) => ({ platform, status }))
    .sort((a, b) => (order[a.status] ?? 5) - (order[b.status] ?? 5) || a.platform.localeCompare(b.platform))
}

function platformTitle(platformStatus) {
  const platform = uploadPlatformText[platformStatus.platform] || platformStatus.platform
  return `${platform} · ${platformStatus.status}`
}

function stageValue(row, stage) {
  const value = row?.backupper?.[stage]
  if (!value) return {}
  if (typeof value === 'string') return { status: value, cleanedAt: '' }
  return value
}

function stageCleanedText(row, stage) {
  const value = stageValue(row, stage)
  if (value.status !== 'success') return ''
  return shortDateTime(value.cleanedAt)
}

function shortDateTime(value) {
  const text = String(value || '').trim()
  const match = text.match(/(?:\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2}):(\d{2})/)
  if (match) return `${match[1]}-${match[2]} ${match[3]}:${match[4]}:${match[5]}`
  const date = new Date(text)
  if (Number.isNaN(date.getTime())) return ''
  const pad = value => String(value).padStart(2, '0')
  return `${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

function uploadReportRowUrl(row) {
  const taskId = String(row?.taskId || '').trim()
  if (!taskId) return ''
  return `${minioConsoleUrl}browser/ydbi/${encodeURIComponent(`${taskId}/`)}`
}

function openUploadReportRow(row) {
  const url = uploadReportRowUrl(row)
  if (!url) return
  window.open(url, '_blank', 'noopener,noreferrer')
}

async function copyTaskId(taskId) {
  const text = String(taskId || '').trim()
  if (!text) return
  try {
    await navigator.clipboard.writeText(text)
  } catch {
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.setAttribute('readonly', '')
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.select()
    document.execCommand('copy')
    document.body.removeChild(textarea)
  }
}

const minioConsoleUrl = 'http://120.53.92.66:9001/'
</script>

<template>
  <section class="server-page" aria-label="服务器">
    <section class="biliup-panel server-overview">
      <div class="server-page-head">
        <div>
          <h1>服务器</h1>
          <p>{{ backupperStatusSummary }}</p>
          <p v-if="backupperStatTimeText" class="server-stat-time">统计于 {{ backupperStatTimeText }}</p>
        </div>
        <div class="server-actions">
          <span v-if="loading">加载中</span>
          <a
            class="server-action-link"
            :href="minioConsoleUrl"
            target="_blank"
            rel="noopener noreferrer"
          >
            打开 MinIO
          </a>
          <button
            type="button"
            :disabled="loading || Boolean(actionBusy)"
            @click="refreshServerStatus"
          >
            {{ actionBusy === 'refresh-status' ? '统计中' : '刷新' }}
          </button>
          <button
            type="button"
            class="danger"
            :disabled="Boolean(actionBusy)"
            @click="runMinioCleanup"
          >
            {{ actionBusy === 'minio-cleanup' ? '清理中' : '清理 MinIO' }}
          </button>
          <button
            type="button"
            class="danger"
            :disabled="Boolean(actionBusy)"
            @click="clearBuildCache"
          >
            {{ actionBusy === 'build-cache' ? '清理中' : '构建缓存' }}
          </button>
          <button
            type="button"
            class="danger"
            :disabled="Boolean(actionBusy)"
            @click="clearMysqlBinlog"
          >
            {{ actionBusy === 'mysql-binlog' ? '清理中' : 'MySQL binlog' }}
          </button>
          <button
            type="button"
            class="danger"
            :disabled="Boolean(actionBusy)"
            @click="clearDiagnostics"
          >
            {{ actionBusy === 'diagnostics' ? '清理中' : '成功诊断' }}
          </button>
        </div>
      </div>

      <ServerDiskStatusPanel
        :status="backupperDiskStatus"
        :status-text="backupperDiskStatusText"
      />

      <p v-if="actionMessage" class="inline-message">{{ actionMessage }}</p>
      <p v-if="error" class="inline-error">{{ error }}</p>
    </section>

    <section
      v-if="uploadIncompleteReport || uploadIncompleteReportError || actionBusy === 'upload-incomplete-report'"
      class="biliup-panel upload-incomplete-report"
      aria-label="上传未完成 MinIO 报表"
    >
      <div class="upload-report-head">
        <div>
          <h2>上传未完成报表</h2>
          <p v-if="uploadReportGeneratedText">
            {{ uploadReportGeneratedText }} · {{ uploadReportRows.length }} 个任务 · {{ uploadReportSummary.rowSize || '0B' }}
          </p>
          <p v-else>正在扫描 MinIO 和任务状态</p>
        </div>
        <div class="upload-report-controls">
          <button
            type="button"
            :class="{ active: uploadReportSort === 'type' }"
            @click="uploadReportSort = 'type'"
          >
            Type
          </button>
          <button
            type="button"
            :class="{ active: uploadReportSort === 'size' }"
            @click="uploadReportSort = 'size'"
          >
            体积
          </button>
          <button
            type="button"
            class="upload-report-retry"
            :disabled="Boolean(actionBusy)"
            @click="generateUploadIncompleteReport"
          >
            {{ actionBusy === 'upload-incomplete-report' ? '拉取中' : '重试' }}
          </button>
        </div>
      </div>

      <div v-if="uploadReportStatusCounts.length" class="upload-report-summary">
        <span v-for="item in uploadReportStatusCounts" :key="item.status">{{ item.status }} {{ item.count }}</span>
      </div>
      <p v-if="uploadIncompleteReportError" class="inline-error">{{ uploadIncompleteReportError }}</p>

      <div v-if="uploadReportRows.length" class="upload-report-table-wrap">
        <table class="upload-report-table">
          <thead>
            <tr>
              <th>Task</th>
              <th>Type</th>
              <th>状态</th>
              <th>Uploader</th>
              <th>对象</th>
              <th>体积</th>
              <th>平台</th>
              <th>素材</th>
              <th>封面</th>
              <th>成片</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in uploadReportRows"
              :key="row.taskId"
              class="upload-report-row"
              role="link"
              tabindex="0"
              :title="uploadReportRowUrl(row)"
              @click="openUploadReportRow(row)"
              @keydown.enter="openUploadReportRow(row)"
              @keydown.space.prevent="openUploadReportRow(row)"
            >
              <td>
                <button type="button" class="upload-report-task" @click.stop="copyTaskId(row.taskId)">
                  {{ row.taskId }}
                </button>
              </td>
              <td>{{ row.type || '-' }}</td>
              <td>{{ reportTaskState(row) }}</td>
              <td>{{ row.uploaderStatus || '-' }}</td>
              <td>{{ row.remainingObjectCount }}</td>
              <td>{{ row.remainingSize }}</td>
              <td>
                <span class="uploader-platform-icons upload-report-platform-icons" aria-label="上传平台状态">
                  <span
                    v-for="platformStatus in platformStatuses(row)"
                    :key="platformStatus.platform"
                    :class="['uploader-platform-icon', `upload-status-${platformStatus.status}`]"
                    :title="platformTitle(platformStatus)"
                  >
                    <img
                      v-if="platformIconUrls[platformStatus.platform]"
                      :src="platformIconUrls[platformStatus.platform]"
                      :alt="uploadPlatformText[platformStatus.platform] || platformStatus.platform"
                      loading="lazy"
                    />
                  </span>
                </span>
              </td>
              <td>{{ stageCleanedText(row, 'processAssets') }}</td>
              <td>{{ stageCleanedText(row, 'cover') }}</td>
              <td>{{ stageCleanedText(row, 'finalVideo') }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-else-if="uploadIncompleteReport && actionBusy !== 'upload-incomplete-report'" class="empty-state">暂无上传未完成任务</div>
    </section>
  </section>
</template>
