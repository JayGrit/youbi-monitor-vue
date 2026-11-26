<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { loadNewYouthOverview, loadPendingNewYouthUploads, loadScheduledNewYouthUploads, releaseNewYouthUpload, scheduleNewYouthUpload, cancelNewYouthUploadSchedule, saveNewYouthChargingVideo } from '../api/newYouth'
import { normalizeResourceUrl } from '../utils/media'
import GrowthPieChart from '../components/new-youth/GrowthPieChart.vue'
import FollowerBarChart from '../components/new-youth/FollowerBarChart.vue'

const data = ref(null)
const loading = ref(false)
const error = ref('')
const pendingUploads = ref([])
const scheduledUploads = ref([])
const reviews = ref([])
const uploadsError = ref('')
const publishingTaskId = ref('')
const editingTaskId = ref('')
const selectedSlot = ref('')
const chargingEnabled = ref(false)
const chargingTitle = ref('')
const chargingTaskId = ref('')
const chargingAmount = ref(18)

function editCharging(item) {
  chargingTaskId.value = item.taskId
  chargingTitle.value = item.title
  chargingAmount.value = item.chargingAmountYuan || 18
}

async function saveCharging() {
  if (!chargingTaskId.value || publishingTaskId.value) return
  publishingTaskId.value = chargingTaskId.value
  uploadsError.value = ''
  try {
    const saved = await saveNewYouthChargingVideo(chargingTaskId.value, chargingAmount.value)
    for (const uploads of [pendingUploads, scheduledUploads]) {
      uploads.value = uploads.value.map(item => item.taskId === saved.taskId ? { ...item, ...saved } : item)
    }
    chargingTaskId.value = ''
  } catch (err) {
    uploadsError.value = err.message
  } finally {
    publishingTaskId.value = ''
  }
}

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

const formatCount = new Intl.NumberFormat('zh-CN')
const displayCount = value => value == null ? '—' : formatCount.format(value)
const formatNetGrowth = new Intl.NumberFormat('zh-CN', { signDisplay: 'exceptZero' })
const followerGoal = computed(() => {
  const date = data.value?.generatedAt?.slice(0, 10)
  if (!date) return null

  // The overview timestamps and hourly slots use Asia/Shanghai.
  const weekday = new Date(date + 'T00:00:00Z').getUTCDay()
  const target = weekday === 0 || weekday === 6 ? 750 : 300
  const midnight = data.value.followers?.find(point => point.hour === '00:00')?.followers
  const current = data.value.followerCount
  const growth = midnight == null || current == null ? null : current - midnight
  const percent = growth == null ? null : Math.floor(Math.max(0, growth) * 100 / target)
  return { target, midnight, growth, percent }
})
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
      reviews.value = (uploads.value?.reviews || []).filter(item => item.step === 'release' && !item.blockedReason)
      chargingEnabled.value = uploads.value?.chargingVideoEnabled === true
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
    await refresh()
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
        <dl v-if="data" class="ny-account-counts">
          <div><dt>当前粉丝量</dt><dd>{{ displayCount(data.followerCount) }}</dd></div>
          <div><dt>充电人数</dt><dd>{{ displayCount(data.chargeCount) }}</dd></div>
        </dl>
      </div>
      <div class="ny-hero-actions">
        <div v-if="followerGoal" class="ny-follower-goal">
          <div class="ny-follower-goal-heading">
            <span id="ny-follower-goal-label">今日涨粉目标</span>
            <span><strong v-if="followerGoal.growth !== null">{{ formatNetGrowth.format(followerGoal.growth) }}</strong><span v-else>—</span> / {{ displayCount(followerGoal.target) }} 人</span>
          </div>
          <progress
            v-if="followerGoal.growth !== null"
            :value="Math.min(followerGoal.target, Math.max(0, followerGoal.growth))"
            :max="followerGoal.target"
            aria-labelledby="ny-follower-goal-label"
            :aria-valuetext="`净增 ${formatNetGrowth.format(followerGoal.growth)} 人，完成 ${followerGoal.percent}%`"
          />
          <div class="ny-follower-goal-caption">
            <span v-if="followerGoal.midnight == null">暂无 00:00 粉丝快照</span>
            <span v-else>00:00 基准 {{ displayCount(followerGoal.midnight) }}</span>
            <span v-if="followerGoal.percent !== null">{{ followerGoal.percent }}%</span>
          </div>
        </div>
        <button type="button" class="ny-refresh" :disabled="loading" @click="refresh">{{ loading ? '更新中…' : '刷新数据' }}</button>
      </div>
    </section>

    <p v-if="error" class="ny-error" role="alert">加载失败：{{ error }}</p>
    <p v-if="loading && !data" class="ny-loading">正在读取采集快照…</p>
    <template v-if="data">
      <div class="ny-pies">
        <GrowthPieChart heading="上一个小时" :period="previousPeriod" :data="data.previousHour" />
        <GrowthPieChart heading="今日 00:00 至今" :period="todayPeriod" :data="data.today" />
      </div>
      <FollowerBarChart :points="data.followers || []" />
      <p class="ny-source-note">播放量按同一 BV 的两次成功快照计算；此前没有记录的新视频按 0 次播放计算。饼图按视频发布时间分组，右侧只显示增量前 10 名。最近指昨天和前天；时间未知的视频归入以前。粉丝缺少相邻快照的小时以“—”表示。</p>
    </template>

    <section class="ny-card ny-pending-uploads">
      <form v-if="chargingTaskId" class="ny-schedule-editor" @submit.prevent="saveCharging">
        <label>{{ chargingTitle }}的充电设置
          <select v-model.number="chargingAmount" :disabled="Boolean(publishingTaskId)">
            <option :value="18">18 元</option>
            <option :value="30">30 元</option>
            <option :value="0">取消充电</option>
          </select>
        </label>
        <button type="submit" :disabled="Boolean(publishingTaskId)">{{ publishingTaskId ? '保存中…' : '保存' }}</button>
        <button type="button" :disabled="Boolean(publishingTaskId)" @click="chargingTaskId = ''">关闭</button>
      </form>
      <div class="ny-card-heading">
        <div><span class="ny-eyebrow">PUBLISH QUEUE</span><h2>待发表视频</h2></div>
        <span class="ny-card-count">{{ pendingUploads.length }} 条</span>
      </div>
      <p v-if="uploadsError" class="ny-error" role="alert">{{ uploadsError }}</p>
      <p v-if="!pendingUploads.length" class="ny-pending-empty">暂无待放行视频</p>
      <ul v-else class="ny-pending-list">
        <li v-for="item in pendingUploads" :key="item.taskId" class="ny-pending-row">
          <img v-if="item.coverUrl" class="ny-pending-cover" :src="normalizeResourceUrl(item.coverUrl)" alt="" loading="lazy" />
          <div v-else class="ny-pending-cover ny-pending-cover-empty">无封面</div>
          <div class="ny-pending-title" :title="item.title">{{ item.title }} <small v-if="item.isChargingVideo">充电 · {{ item.chargingAmountYuan }} 元</small></div>
          <div class="ny-pending-actions">
            <button type="button" class="ny-publish-button" :disabled="Boolean(publishingTaskId)" @click="publishUpload(item.taskId)">
              {{ publishingTaskId === item.taskId ? '提交中…' : '放行发表' }}
            </button>
            <button v-if="chargingEnabled" type="button" class="ny-publish-button" :disabled="Boolean(publishingTaskId)" @click="editCharging(item)">{{ item.isChargingVideo ? '修改充电设置' : '设为充电视频' }}</button>
            <button type="button" class="ny-publish-button" :disabled="Boolean(publishingTaskId)" @click="editSchedule(item)">定时发表</button>
          </div>
          <div v-if="editingTaskId === item.taskId" class="ny-schedule-editor">
            <select v-model="selectedSlot" aria-label="定时发表时间"><option v-for="slot in availableSlots" :key="slot.value" :value="slot.value">{{ slot.label }}</option></select>
            <button type="button" :disabled="!selectedSlot || Boolean(publishingTaskId)" @click="saveSchedule(item.taskId)">确认</button>
            <button type="button" @click="editingTaskId = ''">返回</button>
          </div>
        </li>
      </ul>
      <div class="ny-card-heading"><h2>待重投视频</h2><span class="ny-card-count">{{ reviews.length }} 条</span></div>
      <p v-if="!reviews.length" class="ny-pending-empty">暂无待重投视频</p>
      <ul v-else class="ny-pending-list">
        <li v-for="item in reviews" :key="item.taskId" class="ny-pending-row">
          <img v-if="item.coverUrl" class="ny-pending-cover" :src="normalizeResourceUrl(item.coverUrl)" alt="" loading="lazy" />
          <div v-else class="ny-pending-cover ny-pending-cover-empty">无封面</div>
          <div class="ny-pending-title" :title="item.title">
            {{ item.title }}
            <small>{{ item.dispatchAtUtc ? (item.due ? '到点等待接纳' : formatScheduled(item.dispatchAtUtc)) : '未过审 · 待人工放行' }}</small>
            <small v-if="item.reason">{{ item.reason }}</small>
            <small v-if="item.violationTime">{{ item.violationTime }}</small>
          </div>
          <div v-if="item.step === 'release' && !item.blockedReason" class="ny-pending-actions">
            <button type="button" class="ny-publish-button" :disabled="Boolean(publishingTaskId)" @click="publishUpload(item.taskId)">立即投递</button>
            <button type="button" class="ny-publish-button" :disabled="Boolean(publishingTaskId)" @click="editSchedule(item)">{{ item.dispatchAtUtc ? '改期' : '定时投递' }}</button>
            <button v-if="item.dispatchAtUtc" type="button" class="ny-publish-button" :disabled="Boolean(publishingTaskId)" @click="cancelSchedule(item.taskId)">取消</button>
          </div>
          <div v-if="editingTaskId === item.taskId && item.step === 'release'" class="ny-schedule-editor">
            <select v-model="selectedSlot" aria-label="定时投递时间"><option v-for="slot in availableSlots" :key="slot.value" :value="slot.value">{{ slot.label }}</option></select>
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
          <div class="ny-pending-title" :title="item.title">{{ item.title }} <small v-if="item.isChargingVideo">充电 · {{ item.chargingAmountYuan }} 元</small><small> {{ formatScheduled(item.dispatchAtUtc) }} · {{ item.scheduleState === 'missed' ? (item.errorMessage || '定时发表失败') : item.scheduleState === 'queued' ? '已进入投稿队列' : item.scheduleState === 'waiting' ? '到点等待接纳' : '等待定时发表' }}</small></div>
          <div v-if="item.scheduleState !== 'missed'" class="ny-pending-actions">
            <button v-if="chargingEnabled && item.scheduleState !== 'queued' && item.stageStatus !== 'running'" type="button" class="ny-publish-button" :disabled="Boolean(publishingTaskId)" @click="editCharging(item)">{{ item.isChargingVideo ? '修改充电设置' : '设为充电视频' }}</button>
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
