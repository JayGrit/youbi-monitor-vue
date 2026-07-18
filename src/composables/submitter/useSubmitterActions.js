import { formatNumber } from '../../utils/format'

export function useSubmitterActions({
  submitterApi,
  submitterVideos,
  submitterTotal,
  submitterError,
  submitterMessage,
  submitterSubmittingId,
  submitterRejectingId,
  submitterBatchSubmitting,
  submitterSelectedIds,
  submitterSelectedRows,
  submitterFieldValue,
  submitterSubmissionStatus,
  removeSubmittedRows,
  loadSubmitterVideos,
}) {
  async function submitVideoToYoubi(item) {
    const rowId = submitterFieldValue(item, 'id')
    if (!rowId || submitterSubmissionStatus(item) !== 'unuploaded' || submitterSubmittingId.value || submitterRejectingId.value || submitterBatchSubmitting.value) return
    submitterSubmittingId.value = String(rowId)
    submitterError.value = ''
    try {
      const payload = await submitterApi.submitVideo(rowId)
      Object.assign(item, {
        ydbi_submitted: 1,
        ydbi_submission_status: 'pending',
        ydbi_submission_id: payload.submission_id,
        ydbi_submitted_at: new Date().toISOString(),
        ydbi_rejected_at: null,
      })
      removeSubmittedRows([rowId], submitterTotal)
      submitterMessage.value = `已投稿到 YouBi 待执行队列，topic=${payload.topic || 'unknown'}。`
    } catch (err) {
      submitterError.value = err instanceof Error ? err.message : String(err)
      window.alert(submitterError.value)
    } finally {
      submitterSubmittingId.value = ''
    }
  }

  async function submitSelectedVideosToYoubi() {
    if (submitterBatchSubmitting.value || submitterSubmittingId.value || submitterRejectingId.value) return
    const selectedIds = submitterSelectedIds.value.slice()
    if (!selectedIds.length) return
    submitterBatchSubmitting.value = true
    submitterSubmittingId.value = 'batch'
    submitterError.value = ''
    submitterMessage.value = `正在批量投稿 ${formatNumber(selectedIds.length)} 条素材...`
    const submittedIds = new Set()
    const failedMessages = []
    let skipped = 0
    try {
      for (const rowId of selectedIds) {
        const item = submitterSelectedRows.value[rowId]
        if (!item || submitterSubmissionStatus(item) !== 'unuploaded') {
          skipped += 1
          continue
        }
        try {
          const payload = await submitterApi.submitVideo(rowId)
          Object.assign(item, {
            ydbi_submitted: 1,
            ydbi_submission_status: 'pending',
            ydbi_submission_id: payload.submission_id,
            ydbi_submitted_at: new Date().toISOString(),
            ydbi_rejected_at: null,
          })
          submittedIds.add(rowId)
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err)
          failedMessages.push(`素材 ${rowId}: ${message}`)
        }
      }
      if (submittedIds.size) {
        removeSubmittedRows([...submittedIds], submitterTotal)
      }
      const parts = [`已投稿 ${formatNumber(submittedIds.size)} 条到 YouBi 待执行队列`]
      if (skipped) parts.push(`跳过 ${formatNumber(skipped)} 条`)
      if (failedMessages.length) parts.push(`失败 ${formatNumber(failedMessages.length)} 条`)
      submitterMessage.value = `${parts.join('，')}。`
      submitterError.value = failedMessages.slice(0, 3).join('；')
    } finally {
      submitterSubmittingId.value = ''
      submitterBatchSubmitting.value = false
    }
  }

  async function rejectSubmitterVideo(item) {
    const rowId = submitterFieldValue(item, 'id')
    if (!rowId || submitterSubmissionStatus(item) !== 'unuploaded' || submitterSubmittingId.value || submitterRejectingId.value || submitterBatchSubmitting.value) return
    submitterRejectingId.value = String(rowId)
    submitterError.value = ''
    try {
      await submitterApi.rejectVideo(rowId)
      Object.assign(item, {
        ydbi_submitted: 0,
        ydbi_submission_status: 'rejected',
        ydbi_rejected_at: new Date().toISOString(),
      })
      await loadSubmitterVideos(true)
      submitterMessage.value = '已标记为拒稿。'
    } catch (err) {
      submitterError.value = err instanceof Error ? err.message : String(err)
      await loadSubmitterVideos(true)
    } finally {
      submitterRejectingId.value = ''
    }
  }

  async function withdrawSubmitterVideo(item) {
    const rowId = submitterFieldValue(item, 'id')
    if (!rowId || submitterSubmissionStatus(item) !== 'pending' || submitterSubmittingId.value || submitterRejectingId.value || submitterBatchSubmitting.value) return
    submitterSubmittingId.value = String(rowId)
    submitterError.value = ''
    try {
      await submitterApi.withdrawVideo(rowId)
      Object.assign(item, {
        ydbi_submitted: 0,
        ydbi_submission_status: 'unuploaded',
        ydbi_submission_id: null,
        ydbi_submitted_at: null,
        ydbi_rejected_at: null,
      })
      await loadSubmitterVideos(true)
      submitterMessage.value = '已撤稿，恢复为未投稿状态。'
    } catch (err) {
      submitterError.value = err instanceof Error ? err.message : String(err)
      await loadSubmitterVideos(true)
    } finally {
      submitterSubmittingId.value = ''
    }
  }

  return {
    submitVideoToYoubi,
    submitSelectedVideosToYoubi,
    rejectSubmitterVideo,
    withdrawSubmitterVideo,
  }
}
