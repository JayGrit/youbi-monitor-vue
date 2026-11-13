<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { loadNewYouthOverview, loadPendingNewYouthUploads, loadScheduledNewYouthUploads, releaseNewYouthUpload, scheduleNewYouthUpload, cancelNewYouthUploadSchedule } from '../api/newYouth'
import { normalizeResourceUrl } from '../utils/media'
import GrowthPieChart from '../components/new-youth/GrowthPieChart.vue'
import FollowerBarChart from '../components/new-youth/FollowerBarChart.vue'

const data = ref(null)
const loading = ref(false)
const error = ref('')
const pendingUploads = ref([])
const scheduledUploads = ref([])
const uploadsError = ref('')
const publishingTaskId = ref('')
const editingTaskId = ref('')
const selectedSlot = ref('')
const clockNow = ref(Date.now())
let timer = null
let clockTimer = null

const shanghaiParts = date => Object.fromEntries(new Intl.DateTimeFormat('en-US', {
  timeZone: 'Asia/Shanghai', year: 'numeric', month: 'numeric', day: 'numeric',
}).formatToParts(date).map(part => [part.type, Number(part.value)]))
const availableSlots = computed(() => {
  const { year, month, day } = shanghaiParts(new Date(clockNow.value))
  const slots = []
  for (let offset = 0; offset < 3; offset++) {
    const calendarDay = new Date(Date.UTC(year, month - 1, day + offset))
    const labelDay = `${calendarDay.getUTCFullYear()}-${String(calendarDay.getUTCMonth() + 1).padStart(2, '0')}-${String(calendarDay.getUTCDate()).padStart(2, '0')}`
    for (let hour = 0; hour < 24; hour++) {
      const utc = new Date(Date.UTC(year, month - 1, day + offset, hour - 8))
      if (utc.getTime() > clockNow.value) slots.push({ value: utc.toISOString(), label: `${labelDay} ${String(hour).padStart(2, '0')}:00` })
    }
  }
  return slots
})
const formatScheduled = value => value ? new Intl.DateTimeFormat('zh-CN', {
  timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', hour12: false,
}).format(new Date(value)) : '—'

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
    const [overview, uploads, scheduled] = await Promise.allSettled([loadNewYouthOverview(), loadPendingNewYouthUploads(), loadScheduledNewYouthUploads()])
    if (overview.status === 'fulfilled') data.value = overview.value
    else error.value = overview.reason?.message || String(overview.reason)
    if (uploads.status === 'fulfilled') {
      pendingUploads.value = uploads.value?.items || []
      uploadsError.value = ''
    } else uploadsError.value = uploads.reason?.message || String(uploads.reason)
    if (scheduled.status === 'fulfilled') scheduledUploads.value = scheduled.value?.items || []
    else uploadsError.value = scheduled.reason?.message || String(scheduled.reason)
  } finally {
    loading.value = false
  }
}

function editSchedule(item) {
  clockNow.value = Date.now()
  editingTaskId.value = item.taskId
  selectedSlot.value = availableSlots.value.find(slot => Date.parse(slot.value) === Date.parse(item.dispatchAtUtc))?.value
    || availableSlots.value[0]?.value || ''
}

async function saveSchedule(taskId) {
  if (publishingTaskId.value || !selectedSlot.value) return
  publishingTaskId.value = taskId
  uploadsError.value = ''
  try {
    await scheduleNewYouthUpload(taskId, selectedSlot.value)
    editingTaskId.value = ''
    await refresh()
  } catch (err) {
    uploadsError.value = err?.message || String(err)
  } finally {
    publishingTaskId.value = ''
  }
}

async function cancelSchedule(taskId) {
  if (publishingTaskId.value) return
  publishingTaskId.value = taskId
  uploadsError.value = ''
  try {
    await cancelNewYouthUploadSchedule(taskId)
    editingTaskId.value = ''
    await refresh()
  } catch (err) {
    uploadsError.value = err?.message || String(err)
  } finally {
    publishingTaskId.value = ''
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
  clockTimer = window.setInterval(() => { clockNow.value = Date.now() }, 30 * 1000)
  document.addEventListener('visibilitychange', refreshWhenVisible)
})
onUnmounted(() => {
  if (timer) window.clearInterval(timer)
  if (clockTimer) window.clearInterval(clockTimer)
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
          <div class="ny-pending-actions">
            <button type="button" class="ny-publish-button" :disabled="Boolean(publishingTaskId)" @click="publishUpload(item.taskId)">
              {{ publishingTaskId === item.taskId ? '提交中…' : '发表' }}
            </button>
            <button type="button" class="ny-publish-button" :disabled="Boolean(publishingTaskId)" @click="editSchedule(item)">定时发表</button>
          </div>
          <div v-if="editingTaskId === item.taskId" class="ny-schedule-editor">
            <select v-model="selectedSlot" aria-label="定时发表时间"><option v-for="slot in availableSlots" :key="slot.value" :value="slot.value">{{ slot.label }}</option></select>
            <button type="button" :disabled="!selectedSlot || Boolean(publishingTaskId)" @click="saveSchedule(item.taskId)">确认</button>
            <button type="button" @click="editingTaskId = ''">返回</button>
          </div>
        </li>
      </ul>
      <div v-if="scheduledUploads.length" class="ny-card-heading"><div><h2>已定时视频</h2></div><span class="ny-card-count">{{ scheduledUploads.length }} 条</span></div>
      <ul v-if="scheduledUploads.length" class="ny-pending-list">
        <li v-for="item in scheduledUploads" :key="item.taskId" class="ny-pending-row">
          <img v-if="item.coverUrl" class="ny-pending-cover" :src="normalizeResourceUrl(item.coverUrl)" alt="" loading="lazy" />
          <div v-else class="ny-pending-cover ny-pending-cover-empty">无封面</div>
          <div class="ny-pending-title" :title="item.title">{{ item.title }}<small> {{ formatScheduled(item.dispatchAtUtc) }} · {{ item.scheduleState === 'missed' ? (item.errorMessage || '定时发表失败') : item.scheduleState === 'queued' ? '已进入投稿队列' : item.scheduleState === 'waiting' ? '到点等待接纳' : '等待定时发表' }}</small></div>
          <div v-if="item.scheduleState !== 'missed'" class="ny-pending-actions">
            <button type="button" class="ny-publish-button" :disabled="Boolean(publishingTaskId)" @click="editSchedule(item)">改期</button>
            <button type="button" class="ny-publish-button" :disabled="Boolean(publishingTaskId)" @click="cancelSchedule(item.taskId)">取消</button>
          </div>
          <div v-if="editingTaskId === item.taskId" class="ny-schedule-editor">
            <select v-model="selectedSlot" aria-label="改期时间"><option v-for="slot in availableSlots" :key="slot.value" :value="slot.value">{{ slot.label }}</option></select>
            <button type="button" :disabled="!selectedSlot || Boolean(publishingTaskId)" @click="saveSchedule(item.taskId)">确认</button>
            <button type="button" @click="editingTaskId = ''">返回</button>
          </div>
        </li>
      </ul>
    </section>
  </div>
</template>
