import { computed } from 'vue'
import { formatNumber } from '../../utils/format'

export function useSubmitterSelection({
  submitterVideos,
  submitterSelectedIds,
  submitterSelectedRows,
  submitterBatchSubmitting,
  submitterMessage,
  submitterError,
  loadSubmitterMatchingVideos,
  submitterFieldValue,
  submitterSubmissionStatus,
}) {
  const submitterPageSelectableIds = computed(() => {
    return submitterVideos.value
      .filter(item => submitterSubmissionStatus(item) === 'unuploaded')
      .map(item => String(submitterFieldValue(item, 'id') || '').trim())
      .filter(Boolean)
  })

  const submitterSelectedCount = computed(() => submitterSelectedIds.value.length)

  const submitterPageAllSelected = computed(() => {
    const ids = submitterPageSelectableIds.value
    if (!ids.length) return false
    const selected = new Set(submitterSelectedIds.value)
    return ids.every(id => selected.has(id))
  })

  function setSubmitterRowSelected(item, selected) {
    const rowId = String(submitterFieldValue(item, 'id') || '').trim()
    if (!rowId || submitterSubmissionStatus(item) !== 'unuploaded' || submitterBatchSubmitting.value) return
    const ids = new Set(submitterSelectedIds.value)
    const rows = { ...submitterSelectedRows.value }
    if (selected) {
      ids.add(rowId)
      rows[rowId] = item
    } else {
      ids.delete(rowId)
      delete rows[rowId]
    }
    submitterSelectedIds.value = [...ids]
    submitterSelectedRows.value = rows
  }

  function toggleSubmitterPageSelection() {
    if (submitterBatchSubmitting.value) return
    const selected = new Set(submitterSelectedIds.value)
    const rows = { ...submitterSelectedRows.value }
    const shouldSelect = !submitterPageAllSelected.value
    for (const item of submitterVideos.value) {
      const rowId = String(submitterFieldValue(item, 'id') || '').trim()
      if (!rowId || submitterSubmissionStatus(item) !== 'unuploaded') continue
      if (shouldSelect) {
        selected.add(rowId)
        rows[rowId] = item
      } else {
        selected.delete(rowId)
        delete rows[rowId]
      }
    }
    submitterSelectedIds.value = [...selected]
    submitterSelectedRows.value = rows
  }

  async function selectAllSubmitterFilteredVideos() {
    if (submitterBatchSubmitting.value) return
    submitterError.value = ''
    try {
      const rows = (await loadSubmitterMatchingVideos())
        .filter(item => submitterSubmissionStatus(item) === 'unuploaded')
      const nextRows = {}
      const ids = []
      for (const item of rows) {
        const rowId = String(submitterFieldValue(item, 'id') || '').trim()
        if (!rowId) continue
        ids.push(rowId)
        nextRows[rowId] = item
      }
      submitterSelectedIds.value = ids
      submitterSelectedRows.value = nextRows
      submitterMessage.value = ids.length
        ? `已选择当前筛选结果中的 ${formatNumber(ids.length)} 条未投稿素材。`
        : '当前筛选结果没有可投稿的素材。'
    } catch (err) {
      submitterError.value = err instanceof Error ? err.message : String(err)
    }
  }

  function clearSubmitterSelection() {
    submitterSelectedIds.value = []
    submitterSelectedRows.value = {}
  }

  function removeSubmittedRows(rowIds, submitterTotal) {
    const submitted = new Set(rowIds.map(id => String(id)).filter(Boolean))
    if (!submitted.size) return
    const beforeCount = submitterVideos.value.length
    submitterVideos.value = submitterVideos.value.filter(item => {
      const rowId = String(submitterFieldValue(item, 'id') || '').trim()
      return !submitted.has(rowId)
    })
    const removedFromPage = beforeCount - submitterVideos.value.length
    submitterTotal.value = Math.max(0, submitterTotal.value - Math.max(removedFromPage, submitted.size))
    submitterSelectedIds.value = submitterSelectedIds.value.filter(id => !submitted.has(String(id)))
    const rows = { ...submitterSelectedRows.value }
    for (const rowId of submitted) delete rows[rowId]
    submitterSelectedRows.value = rows
  }

  return {
    submitterPageSelectableIds,
    submitterSelectedCount,
    submitterPageAllSelected,
    setSubmitterRowSelected,
    toggleSubmitterPageSelection,
    selectAllSubmitterFilteredVideos,
    clearSubmitterSelection,
    removeSubmittedRows,
  }
}
