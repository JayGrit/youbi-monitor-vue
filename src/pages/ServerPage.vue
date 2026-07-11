<script setup>
import { computed } from 'vue'
import ServerDiskStatusPanel from '../components/ServerDiskStatusPanel.vue'

const props = defineProps({
  backupperDiskStatus: { type: Object, default: null },
  backupperDiskStatusText: { type: String, default: '' },
  loading: { type: Boolean, default: false },
  error: { type: String, default: '' },
  actionBusy: { type: String, default: '' },
  actionMessage: { type: String, default: '' },
  loadServerStatus: { type: Function, required: true },
  refreshServerStatus: { type: Function, required: true },
  clearBuildCache: { type: Function, required: true },
  clearMysqlBinlog: { type: Function, required: true },
  clearDiagnostics: { type: Function, required: true },
})

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
  </section>
</template>
