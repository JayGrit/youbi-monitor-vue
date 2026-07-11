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

const backupperStatTime = computed(() => {
  const value = props.backupperDiskStatus?.createdAt
  if (!value) return ''
  const textTime = String(value).match(/\b(\d{2}:\d{2})/)
  if (textTime) return textTime[1]
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date)
})
</script>

<template>
  <section class="server-page" aria-label="服务器">
    <section class="biliup-panel server-overview">
      <div class="server-page-head">
        <div>
          <h1>服务器</h1>
          <p>{{ backupperDiskStatusText || (loading ? '加载中' : '暂无服务器状态') }}</p>
          <p v-if="backupperStatTime" class="server-stat-time">统计时间 {{ backupperStatTime }}</p>
        </div>
        <div class="server-actions">
          <span v-if="loading">加载中</span>
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
