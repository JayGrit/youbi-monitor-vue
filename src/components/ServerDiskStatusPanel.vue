<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'

const props = defineProps({
  status: { type: Object, default: null },
  statusText: { type: String, default: '' },
})

const DISK_CHART_COLORS = [
  '#2563eb',
  '#0f766e',
  '#16a34a',
  '#f59e0b',
  '#8b5cf6',
  '#db2777',
  '#dc2626',
  '#7c3aed',
  '#64748b',
  '#f8fafc',
]
const nowTick = ref(Date.now())
let relativeTimer = null

const diskUsageContext = computed(() => {
  const gib = 1024 ** 3
  const status = props.status || {}
  const disk = status.components?.disk?.payload || status.summary?.disk || status
  const minio = status.components?.minio?.payload || {}
  const minioBucketBytes = minio.bucketBytes || status.summary?.minioBucketBytes || {}
  const docker = status.components?.docker?.payload || status.summary?.docker || {}
  const workfolder = status.components?.workfolder?.payload || {}
  const mysql = status.components?.mysql?.payload || {}
  const mysqlBinlog = status.components?.mysql_binlog?.payload || {}
  const componentTimes = {
    disk: status.components?.disk?.createdAt || status.createdAt,
    minio: status.components?.minio?.createdAt || status.createdAt,
    docker: status.components?.docker?.createdAt || status.createdAt,
    workfolder: status.components?.workfolder?.createdAt || status.createdAt,
    mysql: status.components?.mysql?.createdAt || status.createdAt,
    mysql_binlog: status.components?.mysql_binlog?.createdAt || status.createdAt,
  }
  const usedBytes = Math.max(0, Number(disk.usedGb || status.usedGb || 0) * gib)
  const availableBytes = Math.max(0, Number(disk.availableGb || status.availableGb || 0) * gib)
  const totalBytes = Math.max(
    Number(disk.totalGb || status.totalGb || 0) * gib,
    usedBytes + availableBytes,
  )
  const minioYdbiBytes = Math.max(0, Number(minioBucketBytes.ydbi ?? status.minioYdbiBytes ?? status.minioBytes ?? 0))
  const minioDiagnosticsBytes = Math.max(0, Number(minioBucketBytes['youbi-diagnostics'] ?? status.minioDiagnosticsBytes ?? 0))
  const dockerImageBytes = Math.max(0, Number(docker.imageBytes ?? status.dockerImageBytes ?? 0))
  const danglingBytes = Math.min(dockerImageBytes, Math.max(0, Number(docker.danglingImageBytes ?? status.dockerDanglingImageBytes ?? 0)))
  const dockerNonDanglingImageBytes = Math.max(0, dockerImageBytes - danglingBytes)
  const buildCacheBytes = Math.max(0, Number(docker.buildCacheBytes ?? status.dockerBuildCacheBytes ?? 0))
  const workfolderBytes = Math.max(0, Number(workfolder.bytes ?? status.summary?.workfolderBytes ?? status.workfolderBytes ?? 0))
  const mysqlBytes = Math.max(0, Number(mysql.bytes ?? status.summary?.mysqlBytes ?? status.mysqlBytes ?? 0))
  const mysqlBinlogBytes = Math.max(0, Number(mysqlBinlog.bytes ?? status.summary?.mysqlBinlogBytes ?? status.mysqlBinlogBytes ?? 0))
  const knownUsedBytes = minioYdbiBytes + minioDiagnosticsBytes + dockerNonDanglingImageBytes + danglingBytes
    + buildCacheBytes + workfolderBytes + mysqlBytes + mysqlBinlogBytes

  return {
    totalBytes,
    usedBytes,
    availableBytes,
    knownUsedBytes,
    items: [
      { label: 'MinIO ydbi', value: minioYdbiBytes, color: DISK_CHART_COLORS[0], createdAt: componentTimes.minio },
      { label: 'MinIO 诊断', value: minioDiagnosticsBytes, color: DISK_CHART_COLORS[1], createdAt: componentTimes.minio },
      { label: 'Docker 镜像', value: dockerNonDanglingImageBytes, color: DISK_CHART_COLORS[2], createdAt: componentTimes.docker },
      { label: 'Docker dangling 镜像', value: danglingBytes, color: DISK_CHART_COLORS[3], createdAt: componentTimes.docker },
      { label: 'Docker 构建缓存', value: buildCacheBytes, color: DISK_CHART_COLORS[4], createdAt: componentTimes.docker },
      { label: 'YouBi workfolder', value: workfolderBytes, color: DISK_CHART_COLORS[5], createdAt: componentTimes.workfolder },
      { label: 'MySQL 数据', value: mysqlBytes, color: DISK_CHART_COLORS[6], createdAt: componentTimes.mysql },
      { label: 'MySQL binlog', value: mysqlBinlogBytes, color: DISK_CHART_COLORS[7], createdAt: componentTimes.mysql_binlog },
    ],
    diskCreatedAt: componentTimes.disk,
  }
})

const diskUsageItems = computed(() => {
  const context = diskUsageContext.value
  const otherUsedBytes = Math.max(0, context.usedBytes - context.knownUsedBytes)
  return [
    ...context.items,
    { label: '其他系统占用', value: otherUsedBytes, color: DISK_CHART_COLORS[8], createdAt: context.diskCreatedAt },
    { label: '可用空间', value: context.availableBytes, color: DISK_CHART_COLORS[9], createdAt: context.diskCreatedAt },
  ].filter(item => item.value > 0 || item.label === '可用空间')
})

const diskUsageTotal = computed(() => {
  const context = diskUsageContext.value
  return Math.max(context.totalBytes, context.usedBytes + context.availableBytes, context.knownUsedBytes + context.availableBytes)
})

const diskChartItems = computed(() => {
  const context = diskUsageContext.value
  const visibleUsedItems = context.knownUsedBytes > context.usedBytes && context.knownUsedBytes > 0
    ? context.items.map(item => ({ ...item, chartValue: item.value / context.knownUsedBytes * context.usedBytes }))
    : context.items.map(item => ({ ...item, chartValue: item.value }))
  const knownChartBytes = visibleUsedItems.reduce((sum, item) => sum + item.chartValue, 0)
  return [
    ...visibleUsedItems,
    { label: '其他系统占用', chartValue: Math.max(0, context.usedBytes - knownChartBytes), color: DISK_CHART_COLORS[8] },
    { label: '可用空间', chartValue: context.availableBytes, color: DISK_CHART_COLORS[9] },
  ].filter(item => item.chartValue > 0)
})

const diskChartStyle = computed(() => {
  const total = diskChartItems.value.reduce((sum, item) => sum + item.chartValue, 0)
  if (!total) return { background: DISK_CHART_COLORS[9] }
  let offset = 0
  const stops = diskChartItems.value.map(item => {
    const start = offset
    offset += item.chartValue / total * 100
    return `${item.color} ${start}% ${offset}%`
  })
  return { background: `conic-gradient(${stops.join(', ')})` }
})

function formatStorageBytes(value) {
  const bytes = Math.max(0, Number(value || 0))
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(2)} GB`
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(1)} MB`
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${Math.round(bytes)} B`
}

function diskUsagePercent(value) {
  if (!diskUsageTotal.value) return '0.0%'
  return `${(Number(value || 0) / diskUsageTotal.value * 100).toFixed(1)}%`
}

function relativeTime(value) {
  if (!value) return ''
  const text = String(value).trim()
  const normalized = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(text)
    ? text.replace(' ', 'T')
    : text
  const time = new Date(normalized).getTime()
  if (Number.isNaN(time)) return ''
  const diffMs = Math.max(0, nowTick.value - time)
  const minutes = Math.floor(diffMs / 60000)
  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes} 分钟前`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} 小时前`
  return `${Math.floor(hours / 24)} 天前`
}

onMounted(() => {
  relativeTimer = window.setInterval(() => {
    nowTick.value = Date.now()
  }, 60000)
})

onUnmounted(() => {
  if (relativeTimer) window.clearInterval(relativeTimer)
})
</script>

<template>
  <div class="disk-status-panel-body">
    <div class="disk-status-chart" :style="diskChartStyle" aria-label="服务器磁盘占用饼图">
      <div>
        <strong>{{ status?.components?.disk?.payload?.usedPercent || status?.usedPercent || 0 }}%</strong>
        <span>{{ statusText || '暂无状态' }}</span>
      </div>
    </div>
    <div class="disk-status-legend">
      <div v-for="item in diskUsageItems" :key="item.label" class="disk-status-legend-row">
        <span class="disk-status-color" :style="{ background: item.color }"></span>
        <span>{{ item.label }} <em v-if="relativeTime(item.createdAt)">{{ relativeTime(item.createdAt) }}</em></span>
        <strong>{{ formatStorageBytes(item.value) }}</strong>
        <small>{{ diskUsagePercent(item.value) }}</small>
      </div>
    </div>
  </div>
</template>
