<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'

const props = defineProps({
  status: { type: Object, default: null },
  statusText: { type: String, default: '' },
})

const COLORS = ['#2563eb', '#0f766e', '#16a34a', '#f59e0b', '#8b5cf6', '#db2777', '#dc2626', '#7c3aed', '#0891b2', '#b45309', '#9333ea', '#475569']
const OTHER_COLOR = '#64748b'
const FREE_COLOR = '#f8fafc'
const VISIBLE_MINIO_BUCKETS = ['newyouth', 'ydbi', 'youbi-assets', 'youbi-diagnostics', 'youbi-cover']
const gib = 1024 ** 3
const nowTick = ref(Date.now())
let relativeTimer = null

function component(name) {
  return props.status?.components?.[name] || {}
}

function item(label, value, color, createdAt) {
  return { label, value: Math.max(0, Number(value || 0)), color, createdAt }
}

const systemDisk = computed(() => {
  const status = props.status || {}
  const disk = component('disk').payload || status.summary?.disk || status
  const docker = component('docker').payload || status.summary?.docker || {}
  const workfolder = component('workfolder').payload || {}
  const mysql = component('mysql').payload || {}
  const binlog = component('mysql_binlog').payload || {}
  const used = Math.max(0, Number(disk.usedGb || status.usedGb || 0) * gib)
  const available = Math.max(0, Number(disk.availableGb || status.availableGb || 0) * gib)
  const total = Math.max(Number(disk.totalGb || status.totalGb || 0) * gib, used + available)
  const images = Math.max(0, Number(docker.imageBytes ?? status.dockerImageBytes ?? 0))
  const dangling = Math.min(images, Math.max(0, Number(docker.danglingImageBytes ?? status.dockerDanglingImageBytes ?? 0)))
  const entries = [
    item('Docker 镜像', images - dangling, COLORS[0], component('docker').createdAt),
    item('Docker dangling 镜像', dangling, COLORS[1], component('docker').createdAt),
    item('Docker 构建缓存', docker.buildCacheBytes ?? status.dockerBuildCacheBytes, COLORS[2], component('docker').createdAt),
    item('YouBi workfolder', workfolder.bytes ?? status.summary?.workfolderBytes ?? status.workfolderBytes, COLORS[3], component('workfolder').createdAt),
    item('MySQL 数据', mysql.bytes ?? status.summary?.mysqlBytes ?? status.mysqlBytes, COLORS[4], component('mysql').createdAt),
    item('MySQL binlog', binlog.bytes ?? status.summary?.mysqlBinlogBytes ?? status.mysqlBinlogBytes, COLORS[5], component('mysql_binlog').createdAt),
  ]
  return makeChart({
    title: '系统盘', mount: disk.mountPoint || '/', total, used, available,
    percent: disk.usedPercent ?? status.usedPercent,
    entries, createdAt: component('disk').createdAt || status.createdAt,
    otherLabel: '其他系统占用',
  })
})

const minioDisk = computed(() => {
  const part = component('minio_disk')
  if (!part.payload || part.status !== 'success') {
    return { title: 'MinIO 磁盘', unavailable: part.errorMessage || '等待 40G 磁盘统计', entries: [] }
  }
  const disk = part.payload
  const buckets = VISIBLE_MINIO_BUCKETS.map((name, index) =>
    item(name, disk.bucketBytes?.[name], COLORS[index], part.createdAt))
  return makeChart({
    title: 'MinIO 磁盘', mount: disk.mountPoint || '/minio-data',
    total: Number(disk.totalBytes || 0), used: Number(disk.usedBytes || 0),
    available: Number(disk.availableBytes || 0), percent: disk.usedPercent,
    entries: buckets, otherLabel: '其他占用', createdAt: part.createdAt,
  })
})

const charts = computed(() => [systemDisk.value, minioDisk.value])

function makeChart({ title, mount, total, used, available, percent, entries, otherLabel, createdAt }) {
  const known = entries.reduce((sum, entry) => sum + entry.value, 0)
  const occupied = Math.max(0, total - available)
  const other = Math.max(0, occupied - known)
  const rows = [...entries, item(otherLabel, other, OTHER_COLOR, createdAt), item('可用空间', available, FREE_COLOR, createdAt)]
    .filter(row => row.value > 0 || row.label === '可用空间')
  const knownUsed = known + other
  const chartUsed = knownUsed > occupied && knownUsed > 0
    ? rows.map(row => ({ ...row, chartValue: row.label === '可用空间' ? row.value : row.value / knownUsed * occupied }))
    : rows.map(row => ({ ...row, chartValue: row.value }))
  const chartTotal = chartUsed.reduce((sum, row) => sum + row.chartValue, 0)
  let offset = 0
  const stops = chartUsed.filter(row => row.chartValue > 0).map(row => {
    const start = offset
    offset += row.chartValue / chartTotal * 100
    return `${row.color} ${start}% ${offset}%`
  })
  return {
    title, mount, total: Math.max(total, used + available), used, percent,
    entries: rows, style: { background: stops.length ? `conic-gradient(${stops.join(', ')})` : FREE_COLOR },
  }
}

function formatStorageBytes(value) {
  const bytes = Math.max(0, Number(value || 0))
  if (bytes >= gib) return `${(bytes / gib).toFixed(2)} GB`
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(1)} MB`
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${Math.round(bytes)} B`
}

function usagePercent(value, total) {
  return total ? `${(value / total * 100).toFixed(1)}%` : '0.0%'
}

function relativeTime(value) {
  if (!value) return ''
  const text = String(value).trim()
  const normalized = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(text) ? text.replace(' ', 'T') : text
  const time = new Date(normalized).getTime()
  if (Number.isNaN(time)) return ''
  const minutes = Math.floor(Math.max(0, nowTick.value - time) / 60000)
  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes} 分钟前`
  if (minutes < 1440) return `${Math.floor(minutes / 60)} 小时前`
  return `${Math.floor(minutes / 1440)} 天前`
}

onMounted(() => { relativeTimer = window.setInterval(() => { nowTick.value = Date.now() }, 60000) })
onUnmounted(() => { if (relativeTimer) window.clearInterval(relativeTimer) })
</script>

<template>
  <div class="disk-status-panels">
    <section v-for="chart in charts" :key="chart.title" class="disk-status-section">
      <header class="disk-status-section-head">
        <h2>{{ chart.title }}</h2>
        <span v-if="chart.mount">{{ chart.mount }} · {{ formatStorageBytes(chart.total) }}</span>
      </header>
      <p v-if="chart.unavailable" class="disk-status-unavailable">{{ chart.unavailable }}</p>
      <div v-else class="disk-status-panel-body">
        <div class="disk-status-chart" :style="chart.style" :aria-label="`${chart.title}占用饼图`">
          <div>
            <strong>{{ chart.percent || 0 }}%</strong>
            <span>{{ chart.title === '系统盘' && statusText ? statusText : `${formatStorageBytes(chart.used)} / ${formatStorageBytes(chart.total)}` }}</span>
          </div>
        </div>
        <div class="disk-status-legend">
          <div v-for="row in chart.entries" :key="row.label" class="disk-status-legend-row">
            <span class="disk-status-color" :style="{ background: row.color }"></span>
            <span>{{ row.label }} <em v-if="relativeTime(row.createdAt)">{{ relativeTime(row.createdAt) }}</em></span>
            <strong>{{ formatStorageBytes(row.value) }}</strong>
            <small>{{ usagePercent(row.value, chart.total) }}</small>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
