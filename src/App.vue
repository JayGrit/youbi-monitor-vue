<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'

const tasks = ref([])
const serviceHeartbeats = ref([])
const serverTime = ref('')
const loading = ref(true)
const error = ref('')
const bilibiliAccount = ref(null)
const bilibiliAccounts = ref([])
const bilibiliRows = ref(accountRows([]))
const bilibiliError = ref('')
const bilibiliQrCode = ref(null)
const bilibiliQrMessage = ref('')
const bilibiliRenewing = ref(false)
const bilibiliBusyKey = ref('')
const readyTaskId = ref('')
const openFailureKey = ref('')
let timer = null
let bilibiliQrTimer = null
const apiBase = `${import.meta.env.BASE_URL}api`

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
    const response = await fetch(`${apiBase}/video-tasks/monitor?limit=100`)
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
    await loadBilibiliAccounts()
    bilibiliAccount.value = bilibiliRows.value.find(row => row.accountKey) || bilibiliRows.value[0]
    bilibiliError.value = ''
  } catch (err) {
    bilibiliError.value = err instanceof Error ? err.message : String(err)
  }
}

async function loadBilibiliAccounts() {
  const response = await fetch(`${apiBase}/bilibili/accounts`)
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`)
  }
  bilibiliAccounts.value = await response.json()
  bilibiliRows.value = accountRows(bilibiliAccounts.value)
}

async function startBilibiliQrLogin(row) {
  try {
    const key = row?.accountKey || '_auto'
    bilibiliBusyKey.value = rowKey(row)
    const response = await fetch(`${apiBase}/bilibili/account/qrcode?accountKey=${encodeURIComponent(key)}`, { method: 'POST' })
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }
    bilibiliQrCode.value = await response.json()
    bilibiliQrMessage.value = '等待扫码确认'
    pollBilibiliQrCode()
  } catch (err) {
    bilibiliError.value = err instanceof Error ? err.message : String(err)
  } finally {
    bilibiliBusyKey.value = ''
  }
}

async function pollBilibiliQrCode() {
  if (!bilibiliQrCode.value?.authCode) return
  if (bilibiliQrTimer) window.clearInterval(bilibiliQrTimer)
  await refreshBilibiliQrCode()
  bilibiliQrTimer = window.setInterval(refreshBilibiliQrCode, 1500)
}

async function refreshBilibiliQrCode() {
  if (!bilibiliQrCode.value?.authCode) return
  try {
    const key = bilibiliQrCode.value.accountKey || '_auto'
    const response = await fetch(`${apiBase}/bilibili/account/${encodeURIComponent(key)}/qrcode/${encodeURIComponent(bilibiliQrCode.value.authCode)}/poll`, {
      method: 'POST',
    })
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }
    const payload = await response.json()
    bilibiliQrMessage.value = payload.message || '等待扫码确认'
    if (payload.loggedIn) {
      bilibiliAccount.value = payload.account
      await loadBilibiliAccounts()
      bilibiliQrCode.value = null
      if (bilibiliQrTimer) {
        window.clearInterval(bilibiliQrTimer)
        bilibiliQrTimer = null
      }
    }
  } catch (err) {
    bilibiliError.value = err instanceof Error ? err.message : String(err)
  }
}

async function renewBilibiliAccount(row) {
  if (!row?.accountKey) return
  bilibiliRenewing.value = true
  bilibiliBusyKey.value = rowKey(row)
  try {
    const response = await fetch(`${apiBase}/bilibili/account/renew?accountKey=${encodeURIComponent(row.accountKey)}`, { method: 'POST' })
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }
    bilibiliAccount.value = await response.json()
    await loadBilibiliAccounts()
    bilibiliError.value = ''
  } catch (err) {
    bilibiliError.value = err instanceof Error ? err.message : String(err)
  } finally {
    bilibiliRenewing.value = false
    bilibiliBusyKey.value = ''
  }
}

async function refreshBilibiliRow(row) {
  if (!row?.accountKey) return
  try {
    const response = await fetch(`${apiBase}/bilibili/account?accountKey=${encodeURIComponent(row.accountKey)}`)
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }
    const account = await response.json()
    mergeAccountRow(account)
    bilibiliAccount.value = account
    bilibiliError.value = ''
  } catch (err) {
    bilibiliError.value = err instanceof Error ? err.message : String(err)
  }
}

async function saveBilibiliKey(row) {
  if (!row?.accountKey) return
  const nextKey = (row.draftKey || '').trim()
  if (!nextKey || nextKey === row.accountKey) return
  try {
    const response = await fetch(`${apiBase}/bilibili/account/${encodeURIComponent(row.accountKey)}/key`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newAccountKey: nextKey }),
    })
    const payload = await response.json()
    if (!response.ok) {
      throw new Error(payload.message || `HTTP ${response.status}`)
    }
    mergeAccountRow(payload, row.slot)
    await loadBilibiliAccounts()
    bilibiliError.value = ''
  } catch (err) {
    bilibiliError.value = err instanceof Error ? err.message : String(err)
  }
}

async function markTaskReady(task) {
  if (!task?.taskId || task.status !== 'failed' || readyTaskId.value) return
  readyTaskId.value = task.taskId
  try {
    const response = await fetch(`${apiBase}/video-tasks/${encodeURIComponent(task.taskId)}/ready`, {
      method: 'POST',
    })
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }
    task.status = 'ready'
    task.errorMessage = ''
    await loadTasks()
  } catch (err) {
    error.value = err instanceof Error ? err.message : String(err)
  } finally {
    readyTaskId.value = ''
  }
}

function isTaskReadyBusy(task) {
  return readyTaskId.value === task?.taskId
}

function failureDetails(node) {
  return [node?.errorMessage, node?.childErrorMessage].filter(Boolean).join('\n')
}

function canShowFailureDetails(node) {
  return node?.status === 'failed' && Boolean(failureDetails(node))
}

function failureKey(task, node) {
  return `${task?.taskId || ''}:${node?.key || ''}`
}

function toggleFailureDetails(task, node) {
  const key = failureKey(task, node)
  openFailureKey.value = openFailureKey.value === key ? '' : key
}

function accountRows(accounts) {
  const rows = accounts.slice(0, 3).map((account, index) => ({
    ...account,
    slot: index + 1,
    draftKey: account.accountKey || '',
  }))
  while (rows.length < 3) {
    rows.push({
      slot: rows.length + 1,
      accountKey: '',
      draftKey: '',
      uname: '',
      mid: '',
      valid: false,
      message: '空',
    })
  }
  return rows
}

function mergeAccountRow(account, preferredSlot) {
  const rows = [...bilibiliRows.value]
  let index = rows.findIndex(row => row.accountKey === account.accountKey)
  if (index < 0 && preferredSlot) {
    index = rows.findIndex(row => row.slot === preferredSlot)
  }
  if (index < 0) {
    index = rows.findIndex(row => !row.accountKey)
  }
  if (index < 0) {
    index = 0
  }
  rows[index] = {
    ...account,
    slot: rows[index]?.slot || index + 1,
    draftKey: account.accountKey || '',
  }
  bilibiliRows.value = accountRows(rows.filter(row => row.accountKey))
}

function rowKey(row) {
  return row?.accountKey || `slot_${row?.slot || 0}`
}

function rowStatus(row) {
  if (!row.accountKey) return '空'
  if (row.valid === true) return '已登录'
  if (row.valid === false) return '未登录'
  return row.message || '已保存'
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
  const title = String(task.title || '').trim()
  if (title && !isWatchUrl(title)) return title
  return task.taskId || '未命名任务'
}

function isWatchUrl(value) {
  try {
    const parsed = new URL(value)
    return ['youtube.com', 'www.youtube.com', 'm.youtube.com'].includes(parsed.hostname) && parsed.pathname === '/watch'
  } catch {
    return /^https?:\/\/(www\.)?youtube\.com\/watch\b/.test(value)
  }
}

function uploadAccountText(task) {
  const name = String(task.bilibiliUploadAccountName || '').trim()
  const uid = String(task.bilibiliUploadUid || '').trim()
  if (name && uid) return `${name} · UID ${uid}`
  return name || (uid ? `UID ${uid}` : '')
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
  ]
  const progress = nodeProgress(node)
  if (progress) {
    parts.push(`任务点 ${progress}`)
  }
  parts.push(`耗时 ${formatDuration(node.elapsedSeconds)}`)
  if (node.errorMessage) {
    parts.push(node.errorMessage)
  }
  return parts.join('\n')
}

function nodeProgress(node) {
  if (!Number.isFinite(Number(node.totalCount)) || Number(node.totalCount) <= 0) {
    return ''
  }
  return `${Number(node.completedCount || 0)}/${Number(node.totalCount)}`
}

function qrImageUrl(url) {
  if (!url) return ''
  return `https://api.qrserver.com/v1/create-qr-code/?size=184x184&data=${encodeURIComponent(url)}`
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
  if (bilibiliQrTimer) {
    window.clearInterval(bilibiliQrTimer)
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
            <span class="device-name">{{ device.deviceName }}</span>
            {{ formatLastSeen(device) }}
          </span>
        </div>
      </div>
    </section>

    <section class="biliup-panel" aria-label="B站账号和上传管理">
      <div class="biliup-head">
        <div>
          <h2>B站账号</h2>
          <p v-if="bilibiliAccount">已保存 {{ bilibiliAccounts.length }} 个账号</p>
          <p v-else>{{ bilibiliError ? `B站账号异常：${bilibiliError}` : '正在检测 B站账号' }}</p>
        </div>
        <div class="biliup-actions">
          <button type="button" @click="loadBiliupStatus">刷新状态</button>
        </div>
      </div>

      <div class="account-table" aria-label="B站账号表">
        <div class="account-row account-header">
          <span>槽位</span>
          <span>Key</span>
          <span>账号</span>
          <span>状态</span>
          <span>操作</span>
        </div>
        <div v-for="row in bilibiliRows" :key="row.slot" class="account-row">
          <strong>{{ row.slot }}</strong>
          <input v-model="row.draftKey" type="text" :placeholder="row.accountKey ? '账号 key' : '登录后自动生成'" />
          <span>
            <template v-if="row.accountKey">
              {{ row.uname || '-' }}<template v-if="row.mid"> · UID {{ row.mid }}</template>
            </template>
            <template v-else>-</template>
          </span>
          <span>{{ rowStatus(row) }}</span>
          <span class="account-actions">
            <button type="button" @click="startBilibiliQrLogin(row)">
              {{ row.accountKey ? '重新扫码' : '扫码登录' }}
            </button>
            <button type="button" :disabled="!row.accountKey" @click="refreshBilibiliRow(row)">刷新</button>
            <button type="button" :disabled="!row.accountKey || bilibiliRenewing" @click="renewBilibiliAccount(row)">
              {{ bilibiliBusyKey === rowKey(row) ? '续期中' : '续期' }}
            </button>
            <button type="button" :disabled="!row.accountKey || row.draftKey === row.accountKey" @click="saveBilibiliKey(row)">保存Key</button>
          </span>
        </div>
      </div>

      <div v-if="bilibiliQrCode" class="bilibili-login">
        <img :src="qrImageUrl(bilibiliQrCode.url)" alt="B站登录二维码" />
        <div>
          <strong>{{ bilibiliQrMessage }}</strong>
          <a :href="bilibiliQrCode.url" target="_blank" rel="noreferrer">打开登录链接</a>
        </div>
      </div>

      <p v-if="bilibiliError" class="inline-error">{{ bilibiliError }}</p>
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
            <button
              v-if="task.status === 'failed'"
              type="button"
              class="retry-button"
              :disabled="isTaskReadyBusy(task)"
              title="把任务切回排队中"
              @click="markTaskReady(task)"
            >
              {{ isTaskReadyBusy(task) ? '处理中' : '重试' }}
            </button>
          </div>
          <div class="task-details">
            <span>{{ task.taskId }}</span>
            <span v-if="uploadAccountText(task)" class="upload-account">投稿账号 {{ uploadAccountText(task) }}</span>
            <span>总耗时 {{ formatDuration(task.elapsedSeconds) }}</span>
          </div>
          <p v-if="task.errorMessage" class="task-error">{{ task.errorMessage }}</p>
        </div>

        <div class="stage-chain" aria-label="阶段链路">
          <template v-for="(node, index) in task.nodes" :key="node.key">
            <button
              v-if="canShowFailureDetails(node)"
              type="button"
              :class="['stage-node', 'stage-node-button', `status-${node.status}`]"
              :title="`${nodeTitle(node)}\n点击查看失败原因`"
              @click="toggleFailureDetails(task, node)"
            >
              <span class="stage-label">{{ node.label }}</span>
              <span v-if="nodeProgress(node)" class="stage-progress">{{ nodeProgress(node) }}</span>
              <span class="stage-time">{{ formatDuration(node.elapsedSeconds) }}</span>
            </button>
            <div v-else :class="['stage-node', `status-${node.status}`]" :title="nodeTitle(node)">
              <span class="stage-label">{{ node.label }}</span>
              <span v-if="nodeProgress(node)" class="stage-progress">{{ nodeProgress(node) }}</span>
              <span class="stage-time">{{ formatDuration(node.elapsedSeconds) }}</span>
            </div>
            <div
              v-if="index < task.nodes.length - 1"
              :class="['stage-link', `status-${node.status}`]"
              aria-hidden="true"
            ></div>
          </template>
        </div>
        <div
          v-for="node in task.nodes"
          v-show="openFailureKey === failureKey(task, node)"
          :key="`${node.key}-failure`"
          class="failure-panel"
        >
          <div class="failure-panel-head">
            <strong>{{ node.label }}失败原因</strong>
            <button type="button" @click="openFailureKey = ''">收起</button>
          </div>
          <pre>{{ failureDetails(node) }}</pre>
        </div>
      </article>
    </section>
  </main>
</template>
