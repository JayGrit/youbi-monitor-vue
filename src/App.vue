<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'

const tasks = ref([])
const serviceHeartbeats = ref([])
const serverTime = ref('')
const loading = ref(true)
const error = ref('')
const biliupStatus = ref(null)
const biliupError = ref('')
const biliupJob = ref(null)
const biliupInputText = ref('')
const videoList = ref(null)
const videoListLoading = ref(false)
let timer = null
let biliupJobTimer = null

const terminalKeys = {
  up: '\x1b[A',
  down: '\x1b[B',
  enter: '\n',
  scanLogin: '\x1b[B\n',
}

const statusText = {
  pending: '未开始',
  ready: '排队中',
  running: '处理中',
  success: '成功',
  failed: '失败',
  skipped: '跳过',
}

const summary = computed(() => {
  const counts = { running: 0, failed: 0, success: 0, total: tasks.value.length }
  for (const task of tasks.value) {
    if (task.status === 'running') counts.running += 1
    if (task.status === 'failed') counts.failed += 1
    if (task.status === 'success') counts.success += 1
  }
  return counts
})

const onlineSummary = computed(() => {
  let online = 0
  let total = 0
  for (const service of serviceHeartbeats.value) {
    for (const device of service.devices || []) {
      total += 1
      if (device.online) online += 1
    }
  }
  return { online, total }
})

async function loadTasks() {
  try {
    const response = await fetch('/api/video-tasks/monitor?limit=100')
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }
    const payload = await response.json()
    tasks.value = payload.tasks || []
    serviceHeartbeats.value = payload.serviceHeartbeats || []
    serverTime.value = payload.serverTime || ''
    error.value = ''
  } catch (err) {
    error.value = err instanceof Error ? err.message : String(err)
  } finally {
    loading.value = false
  }
}

async function loadBiliupStatus() {
  try {
    const response = await fetch('/api/biliup/status')
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }
    biliupStatus.value = await response.json()
    biliupError.value = ''
  } catch (err) {
    biliupError.value = err instanceof Error ? err.message : String(err)
  }
}

async function startBiliupJob(action) {
  try {
    const response = await fetch(`/api/biliup/${action}`, { method: 'POST' })
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }
    biliupJob.value = await response.json()
    pollBiliupJob()
  } catch (err) {
    biliupError.value = err instanceof Error ? err.message : String(err)
  }
}

async function pollBiliupJob() {
  if (!biliupJob.value?.id) return
  if (biliupJobTimer) window.clearInterval(biliupJobTimer)
  await refreshBiliupJob()
  biliupJobTimer = window.setInterval(refreshBiliupJob, 1500)
}

async function refreshBiliupJob() {
  if (!biliupJob.value?.id) return
  try {
    const response = await fetch(`/api/biliup/jobs/${biliupJob.value.id}`)
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }
    biliupJob.value = await response.json()
    if (biliupJob.value.status !== 'running' && biliupJobTimer) {
      window.clearInterval(biliupJobTimer)
      biliupJobTimer = null
      loadBiliupStatus()
    }
  } catch (err) {
    biliupError.value = err instanceof Error ? err.message : String(err)
  }
}

async function loadVideoList(type = 'all') {
  videoListLoading.value = true
  try {
    const response = await fetch(`/api/biliup/videos?type=${type}&fromPage=1&maxPages=1`)
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }
    videoList.value = await response.json()
    biliupError.value = ''
  } catch (err) {
    biliupError.value = err instanceof Error ? err.message : String(err)
  } finally {
    videoListLoading.value = false
  }
}

async function sendBiliupInput(input) {
  if (!biliupJob.value?.id || biliupJob.value.status !== 'running') return
  try {
    const response = await fetch(`/api/biliup/jobs/${biliupJob.value.id}/input`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input }),
    })
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }
    biliupJob.value = await response.json()
    await refreshBiliupJob()
  } catch (err) {
    biliupError.value = err instanceof Error ? err.message : String(err)
  }
}

async function sendTypedBiliupInput() {
  if (!biliupInputText.value) return
  await sendBiliupInput(`${biliupInputText.value}\n`)
  biliupInputText.value = ''
}

async function cancelBiliupJob() {
  if (!biliupJob.value?.id || biliupJob.value.status !== 'running') return
  try {
    const response = await fetch(`/api/biliup/jobs/${biliupJob.value.id}/cancel`, {
      method: 'POST',
    })
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }
    biliupJob.value = await response.json()
    if (biliupJobTimer) {
      window.clearInterval(biliupJobTimer)
      biliupJobTimer = null
    }
  } catch (err) {
    biliupError.value = err instanceof Error ? err.message : String(err)
  }
}

function formatDuration(seconds) {
  const total = Math.max(0, Number(seconds || 0))
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const secs = total % 60
  if (hours > 0) {
    return `${hours}:${pad(minutes)}:${pad(secs)}`
  }
  return `${minutes}:${pad(secs)}`
}

function pad(value) {
  return String(value).padStart(2, '0')
}

function displayTitle(task) {
  return task.title || task.taskId || '未命名任务'
}

function compactUrl(url) {
  if (!url) return ''
  try {
    const parsed = new URL(url)
    return `${parsed.hostname}${parsed.pathname}`
  } catch {
    return url
  }
}

function formatDateTime(value) {
  if (!value) return '-'
  return String(value).replace('T', ' ').slice(0, 19)
}

function formatLastSeen(device) {
  return device?.online ? '在线' : '离线'
}

function nodeTitle(node) {
  const parts = [
    node.label,
    statusText[node.status] || node.status,
    `耗时 ${formatDuration(node.elapsedSeconds)}`,
  ]
  if (node.errorMessage) {
    parts.push(node.errorMessage)
  }
  return parts.join('\n')
}

function terminalScreen(output) {
  const text = output || ''
  const promptIndex = text.lastIndexOf('? 选择一种登录方式')
  if (promptIndex > 0) {
    return text.slice(promptIndex)
  }
  const lines = text.split('\n')
  return lines.slice(-120).join('\n')
}

onMounted(() => {
  loadTasks()
  loadBiliupStatus()
  timer = window.setInterval(loadTasks, 2000)
})

onUnmounted(() => {
  if (timer) {
    window.clearInterval(timer)
  }
  if (biliupJobTimer) {
    window.clearInterval(biliupJobTimer)
  }
})
</script>

<template>
  <main class="page-shell">
    <header class="top-bar">
      <div>
        <h1>视频生成监控</h1>
        <p>任务链路实时状态</p>
      </div>
      <div class="summary-strip" aria-label="任务汇总">
        <span><strong>{{ summary.total }}</strong> 总数</span>
        <span><strong>{{ summary.running }}</strong> 处理中</span>
        <span><strong>{{ summary.failed }}</strong> 失败</span>
        <span><strong>{{ summary.success }}</strong> 成功</span>
      </div>
    </header>

    <section class="status-line">
      <span :class="['dot', error ? 'dot-failed' : 'dot-success']"></span>
      <span v-if="error">接口异常：{{ error }}</span>
      <span v-else-if="loading">正在加载</span>
      <span v-else>最后刷新：{{ serverTime || '本地时间' }}</span>
    </section>

    <section class="heartbeat-panel" aria-label="服务设备在线状态">
      <div class="heartbeat-head">
        <div>
          <h2>服务设备</h2>
          <p>{{ onlineSummary.online }} / {{ onlineSummary.total }} 在线 · 60 秒内有数据库查询记录</p>
        </div>
      </div>

      <div class="heartbeat-table">
        <div class="heartbeat-row heartbeat-header">
          <span>服务</span>
          <span v-for="device in serviceHeartbeats[0]?.devices || []" :key="device.deviceName">
            {{ device.deviceName }}
          </span>
        </div>
        <div v-for="service in serviceHeartbeats" :key="service.serviceName" class="heartbeat-row">
          <strong>{{ service.serviceName }}</strong>
          <span
            v-for="device in service.devices"
            :key="device.deviceName"
            :class="['device-pill', device.online ? 'device-online' : 'device-offline']"
            :title="formatDateTime(device.lastSeenAt)"
          >
            <span :class="['dot', device.online ? 'dot-success' : 'dot-muted']"></span>
            {{ formatLastSeen(device) }}
          </span>
        </div>
      </div>
    </section>

    <section class="biliup-panel" aria-label="B站账号和上传管理">
      <div class="biliup-head">
        <div>
          <h2>B站账号</h2>
          <p v-if="biliupStatus">
            Cookie {{ biliupStatus.cookieExists ? '已检测到' : '未检测到' }}
            <span v-if="biliupStatus.cookieExists">
              · {{ formatDateTime(biliupStatus.cookieUpdatedAt) }}
              · {{ biliupStatus.cookieSizeBytes }} bytes
            </span>
          </p>
          <p v-else>{{ biliupError ? `biliup 异常：${biliupError}` : '正在检测 biliup' }}</p>
        </div>
        <div class="biliup-actions">
          <button type="button" @click="loadBiliupStatus">刷新状态</button>
          <button type="button" @click="startBiliupJob('renew')">刷新登录</button>
          <button type="button" @click="startBiliupJob('login')">重新登录</button>
          <button type="button" @click="loadVideoList('all')">
            {{ videoListLoading ? '查询中' : '上传列表' }}
          </button>
        </div>
      </div>

      <div v-if="biliupStatus" class="biliup-paths">
        <span>{{ biliupStatus.binExists ? 'biliup 已就绪' : 'biliup 不存在' }}</span>
        <span>{{ biliupStatus.cookiePath }}</span>
      </div>

      <pre v-if="biliupJob" class="command-output">{{ biliupJob.command }}
状态：{{ biliupJob.status }}<template v-if="biliupJob.exitCode !== null">，退出码：{{ biliupJob.exitCode }}</template>

{{ terminalScreen(biliupJob.output) || '等待输出...' }}</pre>

      <div v-if="biliupJob?.status === 'running'" class="biliup-inputs">
        <button type="button" @click="sendBiliupInput(terminalKeys.up)">上</button>
        <button type="button" @click="sendBiliupInput(terminalKeys.down)">下</button>
        <button type="button" @click="sendBiliupInput(terminalKeys.enter)">回车</button>
        <button type="button" @click="sendBiliupInput(terminalKeys.scanLogin)">扫码登录</button>
        <input
          v-model="biliupInputText"
          type="text"
          placeholder="输入验证码或文本"
          @keyup.enter="sendTypedBiliupInput"
        />
        <button type="button" @click="sendTypedBiliupInput">发送</button>
        <button type="button" @click="cancelBiliupJob">取消</button>
      </div>

      <pre v-if="videoList" class="command-output">{{ videoList.command }}
退出码：{{ videoList.exitCode }}

{{ videoList.output || '没有输出' }}</pre>
    </section>

    <section class="task-list" aria-label="任务列表">
      <div v-if="!loading && tasks.length === 0" class="empty-state">
        暂无任务
      </div>

      <article v-for="task in tasks" :key="task.taskId" class="task-row">
        <div class="task-meta">
          <div class="task-title-row">
            <h2>{{ displayTitle(task) }}</h2>
            <span :class="['task-badge', `status-${task.status}`]">
              {{ statusText[task.status] || task.status }}
            </span>
          </div>
          <div class="task-details">
            <span>{{ task.taskId }}</span>
            <span v-if="task.sourceUrl">{{ compactUrl(task.sourceUrl) }}</span>
            <span>总耗时 {{ formatDuration(task.elapsedSeconds) }}</span>
          </div>
          <p v-if="task.errorMessage" class="task-error">{{ task.errorMessage }}</p>
        </div>

        <div class="stage-chain" aria-label="阶段链路">
          <template v-for="(node, index) in task.nodes" :key="node.key">
            <div :class="['stage-node', `status-${node.status}`]" :title="nodeTitle(node)">
              <span class="stage-label">{{ node.label }}</span>
              <span class="stage-time">{{ formatDuration(node.elapsedSeconds) }}</span>
            </div>
            <div
              v-if="index < task.nodes.length - 1"
              :class="['stage-link', `status-${node.status}`]"
              aria-hidden="true"
            ></div>
          </template>
        </div>
      </article>
    </section>
  </main>
</template>
