<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { loadNewYouthOverview, loadPendingNewYouthUploads, releaseNewYouthUpload } from '../api/newYouth'
import { normalizeResourceUrl } from '../utils/media'
import GrowthPieChart from '../components/new-youth/GrowthPieChart.vue'
import FollowerBarChart from '../components/new-youth/FollowerBarChart.vue'

const data = ref(null)
const loading = ref(false)
const error = ref('')
const pendingUploads = ref([])
const uploadsError = ref('')
const publishingTaskId = ref('')
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
    const [overview, uploads] = await Promise.allSettled([loadNewYouthOverview(), loadPendingNewYouthUploads()])
    if (overview.status === 'fulfilled') data.value = overview.value
    else error.value = overview.reason?.message || String(overview.reason)
    if (uploads.status === 'fulfilled') {
      pendingUploads.value = uploads.value?.items || []
      uploadsError.value = ''
    } else uploadsError.value = uploads.reason?.message || String(uploads.reason)
  } finally {
    loading.value = false
  }
}

async function publishUpload(taskId) {
  if (publishingTaskId.value) return
  publishingTaskId.value = taskId
  uploadsError.value = ''
  try {
    await releaseNewYouthUpload(taskId)
    pendingUploads.value = pendingUploads.value.filter(item => item.taskId !== taskId)
  } catch (err) {
    uploadsError.value = err?.message || String(err)
  } finally {
    publishingTaskId.value = ''
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
      <p class="ny-source-note">播放量按同一 BV 的两次成功快照计算；此前没有记录的新视频按 0 次播放计算。饼图按绑定的 uploader 时间汇总全部视频，右侧只显示增量前 10 名。最近指昨天和前天；时间未知的视频归入以前。粉丝缺少相邻快照的小时以“—”表示。</p>
    </template>

    <section class="ny-card ny-pending-uploads">
      <div class="ny-card-heading">
        <div><span class="ny-eyebrow">PUBLISH QUEUE</span><h2>待发表视频</h2></div>
        <span class="ny-card-count">{{ pendingUploads.length }} 条</span>
      </div>
      <p v-if="uploadsError" class="ny-error" role="alert">{{ uploadsError }}</p>
      <p v-if="!pendingUploads.length" class="ny-pending-empty">暂无待发表视频</p>
      <ul v-else class="ny-pending-list">
        <li v-for="item in pendingUploads" :key="item.taskId" class="ny-pending-row">
          <img v-if="item.coverUrl" class="ny-pending-cover" :src="normalizeResourceUrl(item.coverUrl)" alt="" loading="lazy" />
          <div v-else class="ny-pending-cover ny-pending-cover-empty">无封面</div>
          <div class="ny-pending-title" :title="item.title">{{ item.title }}</div>
          <button type="button" class="ny-publish-button" :disabled="Boolean(publishingTaskId)" @click="publishUpload(item.taskId)">
            {{ publishingTaskId === item.taskId ? '提交中…' : '发表' }}
          </button>
        </li>
      </ul>
    </section>
  </div>
</template>
