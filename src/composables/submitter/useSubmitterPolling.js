import { formatNumber } from '../../utils/format'

export function useSubmitterPolling({
  submitterApi,
  submitterActiveRows,
  submitterActiveBatch,
  submitterActiveStatus,
  submitterMessage,
  submitterError,
  loadSubmitterVideos,
}) {
  let submitterTimer = null

  async function refreshSubmitterImportStatus() {
    if (!submitterActiveBatch.value) return
    try {
      const payload = await submitterApi.getImportStatus(submitterActiveBatch.value)
      submitterActiveStatus.value = payload
      submitterMessage.value = submitterImportStatusText(payload)
      if (['done', 'failed'].includes(payload.status)) {
        submitterActiveBatch.value = ''
      }
    } catch (err) {
      submitterActiveBatch.value = ''
      submitterActiveStatus.value = null
      submitterMessage.value = err instanceof Error ? err.message : '导入任务状态不可用。'
    }
  }

  function updateSubmitterPolling() {
    const shouldPoll = submitterActiveRows.value > 0 || Boolean(submitterActiveBatch.value)
    if (shouldPoll && !submitterTimer) {
      submitterTimer = window.setInterval(async () => {
        try {
          await refreshSubmitterImportStatus()
          await loadSubmitterVideos(true)
        } catch (err) {
          submitterError.value = err instanceof Error ? err.message : String(err)
        }
      }, 3000)
    } else if (!shouldPoll && submitterTimer) {
      clearSubmitterPolling()
    }
  }

  function clearSubmitterPolling() {
    if (submitterTimer) {
      window.clearInterval(submitterTimer)
      submitterTimer = null
    }
  }

  function submitterImportStatusText(status) {
    const discovered = formatNumber(status?.discovered || status?.registered || 0)
    const skipped = formatNumber(status?.skipped || 0)
    const saved = formatNumber(status?.saved || 0)
    const failed = formatNumber(status?.failed || 0)
    const current = status?.current_title ? ` 当前：${status.current_title}` : ''
    if (status?.status === 'scanning') {
      return `正在扫描频道，新增 ${discovered} 个视频，跳过已存在 ${skipped} 个。`
    }
    if (status?.status === 'processing') {
      return `正在处理新增视频，已保存 ${saved} 个，跳过 ${skipped} 个，失败 ${failed} 个。${current}`
    }
    if (status?.status === 'done') {
      return `导入完成：新增 ${discovered} 个视频，跳过 ${skipped} 个，已保存 ${saved} 个，失败 ${failed} 个。`
    }
    if (status?.status === 'failed') {
      return `导入失败：${status.error || '未知错误'}。新增 ${discovered} 个视频，跳过 ${skipped} 个，已保存 ${saved} 个，失败 ${failed} 个。`
    }
    return '导入任务正在后台运行。'
  }

  return {
    refreshSubmitterImportStatus,
    updateSubmitterPolling,
    clearSubmitterPolling,
  }
}
