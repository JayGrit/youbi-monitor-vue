<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { loadNewYouthOverview } from '../api/newYouth'
import GrowthPieChart from '../components/new-youth/GrowthPieChart.vue'
import FollowerBarChart from '../components/new-youth/FollowerBarChart.vue'

const data = ref(null)
const loading = ref(false)
const error = ref('')
let timer = null

const formatSlot = value => value ? String(value).replace('T', ' ').slice(5, 16) : '—'
const previousPeriod = computed(() => data.value?.previousHour
  ? `${formatSlot(data.value.previousHour.startSlot)} → ${formatSlot(data.value.previousHour.endSlot)}` : '')
const todayPeriod = computed(() => data.value?.today
  ? `${formatSlot(data.value.today.startSlot)} → ${formatSlot(data.value.today.endSlot)}` : '')

async function refresh() {
  if (loading.value) return
  loading.value = true
  error.value = ''
  try {
    data.value = await loadNewYouthOverview()
  } catch (err) {
    error.value = err?.message || String(err)
  } finally {
    loading.value = false
  }
}

function refreshWhenVisible() {
  if (document.visibilityState === 'visible') void refresh()
}

onMounted(() => {
  void refresh()
  timer = window.setInterval(refreshWhenVisible, 5 * 60 * 1000)
  document.addEventListener('visibilitychange', refreshWhenVisible)
})
onUnmounted(() => {
  if (timer) window.clearInterval(timer)
  document.removeEventListener('visibilitychange', refreshWhenVisible)
})
</script>

<template>
  <div class="ny-page">
    <section class="ny-hero">
      <div>
        <span class="ny-hero-kicker">BILIBILI · NEWYOUTH</span>
        <h1>新青年</h1>
        <p>按整点快照追踪播客播放与粉丝增长</p>
      </div>
      <button type="button" class="ny-refresh" :disabled="loading" @click="refresh">{{ loading ? '更新中…' : '刷新数据' }}</button>
    </section>

    <p v-if="error" class="ny-error" role="alert">加载失败：{{ error }}</p>
    <p v-if="loading && !data" class="ny-loading">正在读取采集快照…</p>
    <template v-if="data">
      <div class="ny-pies">
        <GrowthPieChart heading="上一个小时" :period="previousPeriod" :data="data.previousHour" />
        <GrowthPieChart heading="今日 00:00 至今" :period="todayPeriod" :data="data.today" />
      </div>
      <FollowerBarChart :points="data.followers || []" />
      <p class="ny-source-note">播放量按同一 BV 的两次成功快照计算；此前没有记录的新视频按 0 次播放计算。饼图按视频绑定的 uploader 发布时间汇总为今天、昨天和前天、更早三组；时间未知的视频归入更早一组。右侧列出全部增长视频。粉丝缺少相邻快照的小时以“—”表示。</p>
    </template>
  </div>
</template>
