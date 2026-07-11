<script setup>
import { computed } from 'vue'

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

const diskUsageContext = computed(() => {
  const gib = 1024 ** 3
  const status = props.status || {}
  const usedBytes = Math.max(0, Number(status.usedGb || 0) * gib)
  const availableBytes = Math.max(0, Number(status.availableGb || 0) * gib)
  const totalBytes = Math.max(
    Number(status.totalGb || 0) * gib,
    usedBytes + availableBytes,
  )
  const minioYdbiBytes = Math.max(0, Number(status.minioYdbiBytes ?? status.minioBytes ?? 0))
  const minioDiagnosticsBytes = Math.max(0, Number(status.minioDiagnosticsBytes || 0))
  const dockerImageBytes = Math.max(0, Number(status.dockerImageBytes || 0))
  const danglingBytes = Math.min(dockerImageBytes, Math.max(0, Number(status.dockerDanglingImageBytes || 0)))
  const dockerNonDanglingImageBytes = Math.max(0, dockerImageBytes - danglingBytes)
  const buildCacheBytes = Math.max(0, Number(status.dockerBuildCacheBytes || 0))
  const workfolderBytes = Math.max(0, Number(status.workfolderBytes || 0))
  const mysqlBytes = Math.max(0, Number(status.mysqlBytes || 0))
  const mysqlBinlogBytes = Math.max(0, Number(status.mysqlBinlogBytes || 0))
  const knownUsedBytes = minioYdbiBytes + minioDiagnosticsBytes + dockerNonDanglingImageBytes + danglingBytes
    + buildCacheBytes + workfolderBytes + mysqlBytes + mysqlBinlogBytes

  return {
    totalBytes,
    usedBytes,
    availableBytes,
    knownUsedBytes,
    items: [
      { label: 'MinIO ydbi', value: minioYdbiBytes, color: DISK_CHART_COLORS[0] },
      { label: 'MinIO 诊断', value: minioDiagnosticsBytes, color: DISK_CHART_COLORS[1] },
      { label: 'Docker 镜像', value: dockerNonDanglingImageBytes, color: DISK_CHART_COLORS[2] },
      { label: 'Docker dangling 镜像', value: danglingBytes, color: DISK_CHART_COLORS[3] },
      { label: 'Docker 构建缓存', value: buildCacheBytes, color: DISK_CHART_COLORS[4] },
      { label: 'YouBi workfolder', value: workfolderBytes, color: DISK_CHART_COLORS[5] },
      { label: 'MySQL 数据', value: mysqlBytes, color: DISK_CHART_COLORS[6] },
      { label: 'MySQL binlog', value: mysqlBinlogBytes, color: DISK_CHART_COLORS[7] },
    ],
  }
})

const diskUsageItems = computed(() => {
  const context = diskUsageContext.value
  const otherUsedBytes = Math.max(0, context.usedBytes - context.knownUsedBytes)
  return [
    ...context.items,
    { label: '其他系统占用', value: otherUsedBytes, color: DISK_CHART_COLORS[8] },
    { label: '可用空间', value: context.availableBytes, color: DISK_CHART_COLORS[9] },
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
</script>

<template>
  <div class="disk-status-panel-body">
    <div class="disk-status-chart" :style="diskChartStyle" aria-label="服务器磁盘占用饼图">
      <div>
        <strong>{{ status?.usedPercent || 0 }}%</strong>
        <span>{{ statusText || '暂无状态' }}</span>
      </div>
    </div>
    <div class="disk-status-legend">
      <div v-for="item in diskUsageItems" :key="item.label" class="disk-status-legend-row">
        <span class="disk-status-color" :style="{ background: item.color }"></span>
        <span>{{ item.label }}</span>
        <strong>{{ formatStorageBytes(item.value) }}</strong>
        <small>{{ diskUsagePercent(item.value) }}</small>
      </div>
    </div>
  </div>
</template>
