import { computed, ref } from 'vue'
import { parseLocalDateTime } from '../utils/format'

export function useFailureLogs(monitorApi) {
  const rows = ref([])
  const loading = ref(false)
  const error = ref('')
  const loadedAt = ref('')
  const stageFilter = ref('all')
  const typeFilter = ref('all')
  const timeFilter = ref('all')
  const accountFilter = ref('all')

  const stageOptions = computed(() => uniqueOptions(rows.value.map(row => row.stage)))
  const typeOptions = computed(() => uniqueOptions(rows.value.map(row => row.type)))
  const accountOptions = computed(() => uniqueOptions(
    rows.value
      .filter(row => row.stage === 'uploader')
      .map(row => row.accountKey),
  ))

  const filteredRows = computed(() => rows.value.filter(row => {
    if (stageFilter.value !== 'all' && row.stage !== stageFilter.value) return false
    if (typeFilter.value !== 'all' && row.type !== typeFilter.value) return false
    if (timeFilter.value !== 'all' && failureTimeGroup(row.failedAt) !== timeFilter.value) return false
    if (accountFilter.value !== 'all' && row.accountKey !== accountFilter.value) return false
    return true
  }))

  async function loadFailureLogs() {
    loading.value = true
    error.value = ''
    try {
      const payload = await monitorApi.loadFailureLogs()
      rows.value = Array.isArray(payload?.rows) ? payload.rows : []
      loadedAt.value = payload?.loadedAt || ''
      normalizeFilters()
    } catch (err) {
      error.value = err instanceof Error ? err.message : String(err)
    } finally {
      loading.value = false
    }
  }

  function resetFilters() {
    stageFilter.value = 'all'
    typeFilter.value = 'all'
    timeFilter.value = 'all'
    accountFilter.value = 'all'
  }

  function normalizeFilters() {
    if (!stageOptions.value.includes(stageFilter.value)) stageFilter.value = 'all'
    if (!typeOptions.value.includes(typeFilter.value)) typeFilter.value = 'all'
    if (!accountOptions.value.includes(accountFilter.value)) accountFilter.value = 'all'
  }

  return {
    rows,
    loading,
    error,
    loadedAt,
    stageFilter,
    typeFilter,
    timeFilter,
    accountFilter,
    stageOptions,
    typeOptions,
    accountOptions,
    filteredRows,
    loadFailureLogs,
    resetFilters,
  }
}

function uniqueOptions(values) {
  return [...new Set(values.map(value => String(value || '').trim()).filter(Boolean))]
    .sort((left, right) => left.localeCompare(right, 'zh-CN'))
}

function failureTimeGroup(value) {
  const date = parseLocalDateTime(value)
  if (!date) return 'before'
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const days = Math.round((today.getTime() - target.getTime()) / 86400000)
  if (days <= 0) return 'today'
  if (days === 1) return 'yesterday'
  return 'before'
}
