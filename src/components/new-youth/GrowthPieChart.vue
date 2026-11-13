<script setup>
import { computed } from 'vue'

const props = defineProps({
  heading: { type: String, required: true },
  period: { type: String, default: '' },
  data: { type: Object, default: null },
})

const ageGroups = [
  { key: 'today', label: '今天发布', color: '#d86160' },
  { key: 'recent', label: '昨天、前天', color: '#6388b5' },
  { key: 'earlier', label: '更早或未知', color: '#5a9a79' },
]
const groupColor = key => ageGroups.find(group => group.key === key)?.color || ageGroups[2].color
const slices = computed(() => (props.data?.slices || []).filter(item => Number(item.growth) > 0))
const total = computed(() => Number(props.data?.totalGrowth || 0))
const groups = computed(() => ageGroups.map(group => ({
  ...group,
  growth: Number((props.data?.groups || []).find(item => item.key === group.key)?.growth || 0),
})))
const pieStyle = computed(() => {
  if (total.value <= 0) return { background: '#e5eaf1' }
  let offset = 0
  const stops = groups.value.filter(group => group.growth > 0).map(group => {
    const start = offset
    offset += (group.growth / total.value) * 100
    return `${group.color} ${start}% ${offset}%`
  })
  return { background: `conic-gradient(${stops.join(', ')})` }
})

const formatNumber = value => Number(value || 0).toLocaleString('zh-CN')
const share = value => total.value ? `${((Number(value) / total.value) * 100).toFixed(1)}%` : '0%'
const publishText = value => value ? `发布于 ${String(value).replace('T', ' ').slice(5, 16)}` : '发布时间未知'
</script>

<template>
  <section class="ny-card ny-pie-card">
    <div class="ny-card-heading">
      <div>
        <span class="ny-eyebrow">播放增量分布</span>
        <h2>{{ heading }}</h2>
        <p>{{ period }}</p>
      </div>
      <span class="ny-card-count">{{ data?.comparableVideos || 0 }} 条视频</span>
    </div>

    <div v-if="!data?.available" class="ny-empty">等待这段时间的完整采集快照</div>
    <div v-else-if="!total" class="ny-empty">这段时间暂无播放量增长</div>
    <div v-else class="ny-pie-layout">
      <div class="ny-pie-summary">
        <div class="ny-pie-wrap">
          <div class="ny-pie" :style="pieStyle" role="img" :aria-label="`${heading}总增长 ${formatNumber(total)} 次播放，按发布时间分组`"></div>
          <div class="ny-pie-total"><strong>+{{ formatNumber(total) }}</strong><span>次播放</span></div>
        </div>
        <div class="ny-group-legend">
          <div v-for="group in groups" :key="group.key" class="ny-group-row">
            <span class="ny-legend-dot" :style="{ background: group.color }"></span>
            <span>{{ group.label }}</span>
            <strong>+{{ formatNumber(group.growth) }}</strong>
            <span class="ny-legend-share">{{ share(group.growth) }}</span>
          </div>
        </div>
      </div>
      <div class="ny-video-list">
        <div v-for="slice in slices" :key="slice.bvid" class="ny-video-row">
          <span class="ny-legend-dot" :style="{ background: groupColor(slice.ageGroup) }"></span>
          <div class="ny-video-detail">
            <a :href="slice.url" target="_blank" rel="noopener noreferrer" :title="slice.title">{{ slice.title }}</a>
            <small>{{ publishText(slice.publishedAt) }}</small>
          </div>
          <strong>+{{ formatNumber(slice.growth) }}</strong>
          <span class="ny-legend-share">{{ share(slice.growth) }}</span>
        </div>
      </div>
    </div>
    <p v-if="data?.negativeCorrections" class="ny-footnote">{{ data.negativeCorrections }} 条视频播放数回落，未纳入饼图。</p>
  </section>
</template>
