<script setup>
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue'
import OperatorExecutionCard from '../components/operator-diagnostics/OperatorExecutionCard.vue'

const props = defineProps({
  api: { type: Object, required: true },
})

const statuses = [
  { value: '', label: '全部' },
  { value: 'ready', label: '排队' },
  { value: 'running', label: '执行中' },
  { value: 'success', label: '成功' },
  { value: 'failed', label: '失败' },
]

const filters = reactive({
  status: '',
  platform: '',
  action: '',
  taskId: '',
  opId: '',
  accountKey: '',
})
const textDrafts = reactive({ taskId: '', opId: '', accountKey: '' })
const page = ref(1)
const limit = 10
const executions = ref([])
const total = ref(0)
const pageCount = ref(0)
const loading = ref(false)
const error = ref('')
const loadedAt = ref('')
const expanded = ref({})
const diagnostics = ref({})
const diagnosticLoading = ref({})
const diagnosticErrors = ref({})
const pageVisible = ref(typeof document === 'undefined' || document.visibilityState === 'visible')
let pollTimer = null
let requestToken = 0

const hasRunning = computed(() => executions.value.some(item => ['ready', 'running'].includes(item.status)))

onMounted(() => {
  restoreQuery()
  loadExecutions()
  document.addEventListener('visibilitychange', handleVisibility)
})

onUnmounted(() => {
  stopPolling()
  document.removeEventListener('visibilitychange', handleVisibility)
})

function restoreQuery() {
  const query = new URLSearchParams(window.location.search)
  page.value = Math.max(1, Number(query.get('operatorPage') || query.get('page') || 1))
  for (const key of Object.keys(filters)) {
    filters[key] = query.get(key) || ''
  }
  textDrafts.taskId = filters.taskId
  textDrafts.opId = filters.opId
  textDrafts.accountKey = filters.accountKey
}

function syncQuery() {
  const query = new URLSearchParams(window.location.search)
  query.set('page', 'operator-diagnostics')
  query.set('operatorPage', String(page.value))
  for (const [key, value] of Object.entries(filters)) {
    if (value) query.set(key, value)
    else query.delete(key)
  }
  window.history.replaceState(null, '', `${window.location.pathname}?${query.toString()}`)
}

async function loadExecutions({ silent = false } = {}) {
  const token = ++requestToken
  if (!silent) loading.value = true
  error.value = ''
  syncQuery()
  try {
    const response = await props.api.listTasks({
      page: page.value,
      limit,
      status: filters.status,
      platform: filters.platform,
      action: filters.action,
      taskId: filters.taskId,
      opId: filters.opId,
      accountKey: filters.accountKey,
      sort: 'created_desc',
    })
    if (token !== requestToken) return
    executions.value = response.items || []
    total.value = Number(response.total || 0)
    pageCount.value = Number(response.pageCount || 0)
    loadedAt.value = new Date().toLocaleTimeString()
    if (pageCount.value && page.value > pageCount.value) {
      page.value = pageCount.value
      await loadExecutions({ silent })
      return
    }
    ensureDefaultExpanded()
    refreshExpandedDiagnostics({ onlyActive: true })
    syncPolling()
  } catch (err) {
    if (token === requestToken) error.value = err instanceof Error ? err.message : String(err)
  } finally {
    if (token === requestToken) loading.value = false
  }
}

function ensureDefaultExpanded() {
  if (Object.keys(expanded.value).some(key => expanded.value[key])) return
  const target = executions.value.find(item => ['running', 'failed'].includes(item.status))
  if (target?.opId) {
    expanded.value = { ...expanded.value, [target.opId]: true }
  }
}

function filterChanged() {
  page.value = 1
  loadExecutions()
}

function applyTextFilters() {
  filters.taskId = textDrafts.taskId.trim()
  filters.opId = textDrafts.opId.trim()
  filters.accountKey = textDrafts.accountKey.trim()
  filterChanged()
}

function setPage(nextPage) {
  const maxPage = pageCount.value || 1
  page.value = Math.min(maxPage, Math.max(1, nextPage))
  loadExecutions()
}

function toggle(opId) {
  expanded.value = { ...expanded.value, [opId]: !expanded.value[opId] }
  if (expanded.value[opId]) loadDiagnostics(opId)
}

async function refreshExecution(opId) {
  try {
    const row = await props.api.getTask(opId)
    executions.value = executions.value.map(item => item.opId === opId ? { ...item, ...row } : item)
    await loadDiagnostics(opId)
  } catch (err) {
    diagnosticErrors.value = { ...diagnosticErrors.value, [opId]: err instanceof Error ? err.message : String(err) }
  }
}

async function loadDiagnostics(opId) {
  if (!opId || diagnosticLoading.value[opId]) return
  diagnosticLoading.value = { ...diagnosticLoading.value, [opId]: true }
  diagnosticErrors.value = { ...diagnosticErrors.value, [opId]: '' }
  try {
    const response = await props.api.getDiagnostics(opId)
    diagnostics.value = { ...diagnostics.value, [opId]: response.items || [] }
  } catch (err) {
    diagnosticErrors.value = { ...diagnosticErrors.value, [opId]: err instanceof Error ? err.message : String(err) }
  } finally {
    const next = { ...diagnosticLoading.value }
    delete next[opId]
    diagnosticLoading.value = next
  }
}

function refreshExpandedDiagnostics({ onlyActive = false } = {}) {
  executions.value
    .filter(item => expanded.value[item.opId])
    .filter(item => !onlyActive || ['ready', 'running'].includes(item.status))
    .forEach(item => {
      refreshExecution(item.opId)
    })
}

function handleVisibility() {
  pageVisible.value = document.visibilityState === 'visible'
  syncPolling()
}

function syncPolling() {
  stopPolling()
  if (!pageVisible.value || !hasRunning.value) return
  pollTimer = window.setInterval(() => {
    loadExecutions({ silent: true })
  }, 5000)
}

function stopPolling() {
  if (pollTimer) window.clearInterval(pollTimer)
  pollTimer = null
}

async function copyText(text) {
  await navigator.clipboard?.writeText(String(text || ''))
}
</script>

<template>
  <section class="operator-diagnostics-page">
    <header class="operator-diagnostics-header">
      <div>
        <h1>诊断</h1>
        <p>每页 10 条 Operator 执行，按 opId 查看诊断截图和 HTML。</p>
      </div>
      <button type="button" @click="loadExecutions()">刷新</button>
    </header>

    <form class="operator-filter-bar" @submit.prevent="applyTextFilters">
      <label>
        状态
        <select v-model="filters.status" @change="filterChanged">
          <option v-for="item in statuses" :key="item.value || 'all'" :value="item.value">{{ item.label }}</option>
        </select>
      </label>
      <label>
        平台
        <input v-model.trim="filters.platform" type="text" @change="filterChanged" />
      </label>
      <label>
        Action
        <input v-model.trim="filters.action" type="text" @change="filterChanged" />
      </label>
      <label>
        taskId
        <input v-model="textDrafts.taskId" type="text" />
      </label>
      <label>
        opId
        <input v-model="textDrafts.opId" type="text" />
      </label>
      <label>
        账号
        <input v-model="textDrafts.accountKey" type="text" />
      </label>
      <button type="submit">查询</button>
    </form>

    <div class="operator-page-status">
      <span v-if="loading">正在加载</span>
      <span v-else>共 {{ total }} 条<span v-if="loadedAt"> · {{ loadedAt }}</span></span>
      <span v-if="error" class="operator-page-error">{{ error }}</span>
    </div>

    <div class="operator-card-list">
      <p v-if="!loading && !executions.length" class="flow-muted">没有 Operator 执行</p>
      <OperatorExecutionCard
        v-for="execution in executions"
        :key="execution.opId"
        :execution="execution"
        :expanded="Boolean(expanded[execution.opId])"
        :diagnostics="diagnostics[execution.opId] || []"
        :loading="Boolean(diagnosticLoading[execution.opId])"
        :error="diagnosticErrors[execution.opId] || ''"
        @toggle="toggle"
        @refresh="refreshExecution"
        @copy="copyText"
      />
    </div>

    <footer class="operator-pagination">
      <button type="button" :disabled="page <= 1" @click="setPage(1)">首页</button>
      <button type="button" :disabled="page <= 1" @click="setPage(page - 1)">上一页</button>
      <span>{{ page }} / {{ pageCount || 1 }}</span>
      <button type="button" :disabled="page >= (pageCount || 1)" @click="setPage(page + 1)">下一页</button>
      <button type="button" :disabled="page >= (pageCount || 1)" @click="setPage(pageCount || 1)">末页</button>
    </footer>
  </section>
</template>

<style scoped>
.operator-diagnostics-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.operator-diagnostics-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.operator-diagnostics-header h1 {
  margin: 0 0 4px;
  font-size: 24px;
}

.operator-diagnostics-header p {
  margin: 0;
  color: #64748b;
}

.operator-diagnostics-header button,
.operator-filter-bar button,
.operator-pagination button {
  min-height: 34px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  background: #fff;
  color: #0f172a;
  padding: 0 12px;
  cursor: pointer;
}

.operator-filter-bar {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 10px;
  align-items: end;
}

.operator-filter-bar label {
  display: grid;
  gap: 4px;
  color: #64748b;
  font-size: 12px;
}

.operator-filter-bar input,
.operator-filter-bar select {
  min-height: 34px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  padding: 0 9px;
  background: #fff;
  color: #0f172a;
}

.operator-page-status {
  min-height: 24px;
  color: #64748b;
}

.operator-page-error {
  margin-left: 12px;
  color: #b91c1c;
}

.operator-card-list {
  display: grid;
  gap: 12px;
}

.operator-pagination {
  display: flex;
  align-items: center;
  gap: 8px;
  justify-content: center;
}

.operator-pagination button:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

@media (max-width: 1100px) {
  .operator-filter-bar {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 700px) {
  .operator-diagnostics-header {
    flex-direction: column;
  }

  .operator-filter-bar {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
