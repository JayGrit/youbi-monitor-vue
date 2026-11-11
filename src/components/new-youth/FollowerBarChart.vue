<script setup>
import { computed } from 'vue'

const props = defineProps({ points: { type: Array, default: () => [] } })
const width = computed(() => Math.max(760, props.points.length * 48 + 70))
const maxPositive = computed(() => Math.max(1, ...props.points.map(point => Math.max(0, Number(point.growth || 0)))))
const maxNegative = computed(() => Math.max(1, ...props.points.map(point => Math.max(0, -Number(point.growth || 0)))))
const x = index => 42 + index * ((width.value - 70) / Math.max(1, props.points.length))
const positiveHeight = value => Math.round((Number(value) / maxPositive.value) * 130)
const negativeHeight = value => Math.round((-Number(value) / maxNegative.value) * 42)
const label = value => value == null ? '—' : `${value > 0 ? '+' : ''}${value}`
</script>

<template>
  <section class="ny-card ny-follower-card">
    <div class="ny-card-heading">
      <div>
        <span class="ny-eyebrow">账号增长</span>
        <h2>粉丝每小时增量</h2>
        <p>每根柱子比较该整点与前一整点的成功快照</p>
      </div>
    </div>
    <div v-if="!points.length" class="ny-empty">暂无粉丝采集数据</div>
    <div v-else class="ny-chart-scroll">
      <svg :viewBox="`0 0 ${width} 270`" :style="{ minWidth: `${width}px` }" class="ny-bars" role="img" aria-label="今日粉丝每小时增量柱状图">
        <line x1="24" :x2="width - 16" y1="185" y2="185" class="ny-axis" />
        <line x1="24" :x2="width - 16" y1="105" y2="105" class="ny-grid" />
        <g v-for="(point, index) in points" :key="point.slot">
          <rect v-if="point.growth != null && point.growth >= 0"
            :x="x(index)" :y="185 - positiveHeight(point.growth)" width="24"
            :height="Math.max(2, positiveHeight(point.growth))" rx="5" class="ny-bar-positive" />
          <rect v-else-if="point.growth != null" :x="x(index)" y="185" width="24"
            :height="Math.max(2, negativeHeight(point.growth))" rx="5" class="ny-bar-negative" />
          <circle v-else :cx="x(index) + 12" cy="185" r="3" class="ny-bar-missing" />
          <text :x="x(index) + 12" :y="point.growth == null ? 166 : point.growth >= 0 ? Math.max(25, 176 - positiveHeight(point.growth)) : 245"
            text-anchor="middle" class="ny-bar-value">{{ label(point.growth) }}</text>
          <text :x="x(index) + 12" y="258" text-anchor="middle" class="ny-bar-hour">{{ point.hour }}</text>
          <title>{{ point.hour }}：{{ point.growth == null ? '缺少相邻成功快照' : `${label(point.growth)} 人（${point.previousFollowers} → ${point.followers}）` }}</title>
        </g>
      </svg>
    </div>
  </section>
</template>
