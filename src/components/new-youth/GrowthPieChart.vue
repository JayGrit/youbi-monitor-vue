<script setup>
import { computed } from 'vue'

const props = defineProps({
  heading: { type: String, required: true },
  period: { type: String, default: '' },
  data: { type: Object, default: null },
})

const colors = ['#ef5b3c', '#e98b3a', '#e2b441', '#a6b84c', '#53a896', '#4d8cc1', '#7a7cce', '#a477ba', '#cc6a95', '#b76d62', '#8a94a6']
const slices = computed(() => (props.data?.slices || []).filter(item => Number(item.growth) > 0))
const total = computed(() => Number(props.data?.totalGrowth || 0))
const pieStyle = computed(() => {
  if (total.value <= 0) return { background: '#e5eaf1' }
  let offset = 0
  const stops = slices.value.map((slice, index) => {
    const start = offset
    offset += (Number(slice.growth) / total.value) * 100
    return `${colors[index % colors.length]} ${start}% ${offset}%`
  })
  return { background: `conic-gradient(${stops.join(', ')})` }
})

const formatNumber = value => Number(value || 0).toLocaleString('zh-CN')
const share = value => total.value ? `${((Number(value) / total.value) * 100).toFixed(1)}%` : '0%'
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
      <div class="ny-pie-wrap">
        <div class="ny-pie" :style="pieStyle" role="img" :aria-label="`${heading}总增长 ${formatNumber(total)} 次播放`"></div>
        <div class="ny-pie-total"><strong>+{{ formatNumber(total) }}</strong><span>次播放</span></div>
      </div>
      <div class="ny-pie-legend">
        <div v-for="(slice, index) in slices" :key="slice.bvid || 'other'" class="ny-legend-row">
          <span class="ny-legend-dot" :style="{ background: colors[index % colors.length] }"></span>
          <a v-if="slice.url" :href="slice.url" target="_blank" rel="noopener noreferrer" :title="slice.title">{{ slice.title }}</a>
          <span v-else class="ny-legend-other">{{ slice.title }}</span>
          <strong>+{{ formatNumber(slice.growth) }}</strong>
          <span class="ny-legend-share">{{ share(slice.growth) }}</span>
        </div>
      </div>
    </div>
    <p v-if="data?.negativeCorrections" class="ny-footnote">{{ data.negativeCorrections }} 条视频播放数回落，未纳入饼图。</p>
  </section>
</template>
