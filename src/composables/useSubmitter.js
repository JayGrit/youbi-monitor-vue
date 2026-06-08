import { computed, ref } from 'vue'
import { SUBMITTER_PAGE_SIZE } from '../domain/constants'
import { formatNumber } from '../utils/format'

export function useSubmitter(submitterApi, cacheImageUrl) {
  const submitterVideos = ref([])
  const submitterLoading = ref(false)
  const submitterError = ref('')
  const submitterMessage = ref('')
  const submitterUrl = ref('')
  const submitterAuthor = ref('')
  const submitterPlatform = ref('youtube')
  const submitterBusy = ref(false)
  const submitterAuthorBusy = ref(false)
  const submitterTypeFilter = ref('')
  const submitterUploader = ref('')
  const submitterVideoName = ref('')
  const submitterDurationFilter = ref('all')
  const submitterUploadFilter = ref('unuploaded')
  const submitterSort = ref('updated_desc')
  const submitterAuthors = ref([])
  const submitterListDetail = ref(false)
  const submitterActiveBatch = ref('')
  const submitterFocusedBatch = ref('')
  const submitterActiveStatus = ref(null)
  const submitterJsonTitle = ref('')
  const submitterJsonPayload = ref(null)
  const submitterThumbUrls = ref({})
  const submitterSubmittingId = ref('')
  const submitterRejectingId = ref('')
  const submitterPage = ref(1)
  const submitterTotal = ref(0)
  const submitterAuthorTypeRows = ref([])
  const submitterAuthorTypeSaving = ref('')
  const submitterAuthorDeleting = ref('')
  const submitterAuthorTypeError = ref('')
  let submitterTimer = null

  const submitterAuthorTypeFilters = computed(() => {
    const types = new Set()
    for (const row of submitterAuthorTypeRows.value) {
      const type = String(row?.type || row?.draftType || '').trim()
      if (type) types.add(type)
    }
    return [...types].sort((left, right) => left.localeCompare(right))
  })

  const submitterAuthorOptions = computed(() => {
    const typeFilter = submitterTypeFilter.value.trim()
    return submitterAuthorTypeRows.value
      .filter(row => !typeFilter || String(row?.type || row?.draftType || '').trim() === typeFilter)
      .map(row => String(row?.author || '').trim())
      .filter(Boolean)
  })

  const submitterFilteredVideos = computed(() => {
    return submitterVideos.value
  })

  const submitterFilteredTotal = computed(() => {
    return submitterTotal.value
  })

  const submitterPageCount = computed(() => {
    return Math.max(1, Math.ceil(submitterFilteredTotal.value / SUBMITTER_PAGE_SIZE))
  })

  const submitterActiveRows = computed(() => {
    return submitterVideos.value.filter(item => ['pending', 'running'].includes(item.import_status)).length
  })

  const submitterStatusCounts = computed(() => {
    const labels = {
      done: '完成',
      pending: '等待',
      running: '执行中',
      failed: '失败',
    }
    const counts = new Map()
    for (const item of submitterVideos.value) {
      const status = String(item?.import_status || 'unknown').trim() || 'unknown'
      counts.set(status, (counts.get(status) || 0) + 1)
    }
    return [...counts.entries()]
      .sort(([left], [right]) => {
        const order = ['running', 'pending', 'failed', 'done', 'unknown']
        const leftIndex = order.indexOf(left)
        const rightIndex = order.indexOf(right)
        return (leftIndex === -1 ? order.length : leftIndex) - (rightIndex === -1 ? order.length : rightIndex)
      })
      .map(([status, count]) => `${labels[status] || (status === 'unknown' ? '未导入' : status)} ${formatNumber(count)}`)
      .join(' · ')
  })

  function submitterSource(item) {
    return item?.raw_info_json || item?.info_json || item || {}
  }

  function submitterFieldValue(item, key) {
    if (Object.prototype.hasOwnProperty.call(item || {}, key)) return item[key]
    return submitterSource(item)[key]
  }

  async function loadSubmitterVideos(quiet = false) {
    if (!quiet) submitterLoading.value = true
    try {
      const durationRange = submitterDurationRange()
      const payload = await submitterApi.listVideos({
        detail: submitterListDetail.value,
        batch: submitterFocusedBatch.value,
        type: submitterTypeFilter.value,
        uploader: submitterUploader.value,
        videoName: submitterVideoName.value.trim(),
        sort: submitterSort.value,
        limit: SUBMITTER_PAGE_SIZE,
        offset: (submitterPage.value - 1) * SUBMITTER_PAGE_SIZE,
        durationMin: durationRange.min,
        durationMax: durationRange.max,
        submissionStatus: submitterUploadFilter.value,
      })
      submitterVideos.value = payload?.items || []
      submitterTotal.value = Number(payload?.total || 0)
      if (submitterPage.value > submitterPageCount.value) {
        submitterPage.value = submitterPageCount.value
        await loadSubmitterVideos(quiet)
        return
      }
      warmSubmitterThumbnails()
      submitterError.value = ''
      updateSubmitterPolling()
    } catch (err) {
      submitterError.value = err instanceof Error ? err.message : String(err)
    } finally {
      submitterLoading.value = false
    }
  }

  async function applySubmitterFilters() {
    submitterPage.value = 1
    await loadSubmitterVideos()
  }

  async function loadSubmitterAuthors() {
    try {
      const authorsPayload = await submitterApi.listAuthors()
      submitterAuthors.value = authorsPayload?.items || []
      await loadSubmitterAuthorTypes()
    } catch (err) {
      submitterError.value = err instanceof Error ? err.message : String(err)
    }
  }

  async function resetSubmitterFilters() {
    submitterTypeFilter.value = ''
    submitterUploader.value = ''
    submitterVideoName.value = ''
    submitterDurationFilter.value = 'all'
    submitterUploadFilter.value = 'unuploaded'
    submitterSort.value = 'updated_desc'
    submitterFocusedBatch.value = ''
    submitterPage.value = 1
    await loadSubmitterVideos()
  }

  function filterSubmitterVideos(rows) {
    return rows.filter(item => {
      if (submitterUploadFilter.value !== 'all' && submitterSubmissionStatus(item) !== submitterUploadFilter.value) return false
      return matchesSubmitterDurationFilter(item)
    })
  }

  function submitterDurationRange() {
    if (submitterDurationFilter.value === 'short') return { min: 0, max: 120 }
    if (submitterDurationFilter.value === 'medium') return { min: 121, max: 1200 }
    if (submitterDurationFilter.value === 'long') return { min: 1201, max: null }
    return { min: null, max: null }
  }

  function submitterSubmissionStatus(item) {
    const status = String(item?.ydbi_submission_status || '').trim()
    if (status) return status
    return item?.ydbi_submitted ? 'uploaded' : 'unuploaded'
  }

  function matchesSubmitterDurationFilter(item) {
    if (submitterDurationFilter.value === 'all') return true
    const duration = Number(item?.duration)
    if (!Number.isFinite(duration)) return false
    if (submitterDurationFilter.value === 'short') return duration >= 0 && duration <= 120
    if (submitterDurationFilter.value === 'medium') return duration >= 121 && duration <= 1200
    if (submitterDurationFilter.value === 'long') return duration >= 1201
    return true
  }

  async function clearSubmitterBatchFocus() {
    submitterFocusedBatch.value = ''
    submitterPage.value = 1
    await loadSubmitterVideos()
  }

  async function submitVideoToYoubi(item) {
    const rowId = submitterFieldValue(item, 'id')
    if (!rowId || submitterSubmissionStatus(item) !== 'unuploaded' || submitterSubmittingId.value || submitterRejectingId.value) return
    submitterSubmittingId.value = String(rowId)
    submitterError.value = ''
    try {
      const author = submitterAuthorName(item)
      const authorConfig = await loadSubmitterAuthorType(author)
      if (!authorConfig.type) {
        submitterError.value = author
          ? `作者 ${author} 未配置投稿 type，请先维护 submitter_author。`
          : '当前素材没有作者信息，无法读取投稿 type。'
        return
      }
      const payload = await submitterApi.submitVideo(
        rowId,
        authorConfig.type,
        authorConfig.needSubtitle,
        authorConfig.needDubbing,
        authorConfig.needSeparation,
      )
      Object.assign(item, {
        ydbi_submitted: 1,
        ydbi_submission_status: 'pending',
        ydbi_submission_id: payload.submission_id,
        ydbi_submitted_at: new Date().toISOString(),
        ydbi_rejected_at: null,
      })
      await loadSubmitterVideos(true)
      submitterMessage.value = `已提交到 YouBi 待执行队列，type=${authorConfig.type}。`
    } catch (err) {
      submitterError.value = err instanceof Error ? err.message : String(err)
      await loadSubmitterVideos(true)
    } finally {
      submitterSubmittingId.value = ''
    }
  }

  async function rejectSubmitterVideo(item) {
    const rowId = submitterFieldValue(item, 'id')
    if (!rowId || submitterSubmissionStatus(item) !== 'unuploaded' || submitterSubmittingId.value || submitterRejectingId.value) return
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
    if (!rowId || submitterSubmissionStatus(item) !== 'pending' || submitterSubmittingId.value || submitterRejectingId.value) return
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
      submitterMessage.value = '已撤稿，恢复为未上传状态。'
    } catch (err) {
      submitterError.value = err instanceof Error ? err.message : String(err)
      await loadSubmitterVideos(true)
    } finally {
      submitterSubmittingId.value = ''
    }
  }

  function submitterAuthorName(item) {
    return String(
      submitterFieldValue(item, 'uploader')
      || submitterFieldValue(item, 'import_author')
      || submitterFieldValue(item, 'channel')
      || ''
    ).trim()
  }

  async function loadSubmitterAuthorType(author) {
    if (!author) return { type: '', needSubtitle: true, needDubbing: true, needSeparation: true }
    const payload = await submitterApi.getAuthorType(author)
    const needSubtitle = payload?.needSubtitle !== false
    return {
      type: String(payload?.type || '').trim(),
      needSubtitle,
      needDubbing: needSubtitle && payload?.needDubbing !== false,
      needSeparation: payload?.needSeparation !== false,
    }
  }

  async function loadSubmitterAuthorTypes() {
    submitterAuthorTypeError.value = ''
    try {
      const payload = await submitterApi.listAuthorTypes()
      const byAuthor = new Map((payload || []).map(item => [String(item.author || ''), item]))
      const authors = new Set([...submitterAuthors.value, ...byAuthor.keys()].filter(Boolean))
      submitterAuthorTypeRows.value = sortSubmitterAuthorTypeRows([...authors].map(author => {
        const item = byAuthor.get(author)
        return {
          author,
          type: String(item?.type || ''),
          draftType: String(item?.type || ''),
          needSubtitle: item?.needSubtitle !== false,
          draftNeedSubtitle: item?.needSubtitle !== false,
          needDubbing: item?.needSubtitle !== false && item?.needDubbing !== false,
          draftNeedDubbing: item?.needSubtitle !== false && item?.needDubbing !== false,
          needSeparation: item?.needSeparation !== false,
          draftNeedSeparation: item?.needSeparation !== false,
          sourceLanguage: String(item?.sourceLanguage || item?.source_language || '英文'),
          draftSourceLanguage: String(item?.sourceLanguage || item?.source_language || '英文'),
          targetLanguage: String(item?.targetLanguage || item?.target_language || '中文'),
          draftTargetLanguage: String(item?.targetLanguage || item?.target_language || '中文'),
        }
      }))
    } catch (err) {
      submitterAuthorTypeError.value = err instanceof Error ? err.message : String(err)
    }
  }

  function sortSubmitterAuthorTypeRows(rows) {
    return rows.sort((left, right) => {
      const leftType = String(left?.type || left?.draftType || '').trim()
      const rightType = String(right?.type || right?.draftType || '').trim()
      if (leftType && !rightType) return -1
      if (!leftType && rightType) return 1
      const typeOrder = leftType.localeCompare(rightType)
      if (typeOrder !== 0) return typeOrder
      return String(left?.author || '').localeCompare(String(right?.author || ''))
    })
  }

  async function saveSubmitterAuthorType(row) {
    const type = String(row?.draftType || '').trim()
    const sourceLanguage = String(row?.draftSourceLanguage || '').trim() || '英文'
    const targetLanguage = String(row?.draftTargetLanguage || '').trim() || '中文'
    if (submitterAuthorTypeSaving.value === row?.author) return
    if (!row?.author || !type) return
    if (
      type === row.type
      && row.draftNeedSubtitle === row.needSubtitle
      && row.draftNeedDubbing === row.needDubbing
      && row.draftNeedSeparation === row.needSeparation
      && sourceLanguage === row.sourceLanguage
      && targetLanguage === row.targetLanguage
    ) return
    submitterAuthorTypeSaving.value = row.author
    submitterAuthorTypeError.value = ''
    try {
      const needSubtitle = row.draftNeedSubtitle !== false
      const needDubbing = needSubtitle && row.draftNeedDubbing !== false
      const needSeparation = row.draftNeedSeparation !== false
      const payload = await submitterApi.saveAuthorType(row.author, type, needSubtitle, needDubbing, needSeparation, sourceLanguage, targetLanguage)
      row.type = String(payload?.type || type)
      row.draftType = row.type
      row.needSubtitle = payload?.needSubtitle !== false
      row.draftNeedSubtitle = row.needSubtitle
      row.needDubbing = row.needSubtitle && payload?.needDubbing !== false
      row.draftNeedDubbing = row.needDubbing
      row.needSeparation = payload?.needSeparation !== false
      row.draftNeedSeparation = row.needSeparation
      row.sourceLanguage = String(payload?.sourceLanguage || payload?.source_language || sourceLanguage)
      row.draftSourceLanguage = row.sourceLanguage
      row.targetLanguage = String(payload?.targetLanguage || payload?.target_language || targetLanguage)
      row.draftTargetLanguage = row.targetLanguage
      submitterAuthorTypeRows.value = sortSubmitterAuthorTypeRows([...submitterAuthorTypeRows.value])
    } catch (err) {
      submitterAuthorTypeError.value = err instanceof Error ? err.message : String(err)
    } finally {
      submitterAuthorTypeSaving.value = ''
    }
  }

  async function autosaveSubmitterAuthorType(row) {
    row.draftType = String(row?.draftType || '').trim()
    row.draftSourceLanguage = String(row?.draftSourceLanguage || '').trim() || '英文'
    row.draftTargetLanguage = String(row?.draftTargetLanguage || '').trim() || '中文'
    await saveSubmitterAuthorType(row)
  }

  async function deleteSubmitterAuthor(row) {
    const author = String(row?.author || '').trim()
    if (!author || submitterAuthorDeleting.value || submitterAuthorTypeSaving.value) return
    if (!window.confirm(`确定删除作者 ${author} 并清理其所有视频？`)) return
    submitterAuthorDeleting.value = author
    submitterAuthorTypeError.value = ''
    try {
      await submitterApi.deleteAuthorType(author)
      submitterAuthorTypeRows.value = submitterAuthorTypeRows.value.filter(item => item.author !== author)
      submitterAuthors.value = submitterAuthors.value.filter(item => item !== author)
      if (submitterUploader.value === author) {
        submitterUploader.value = ''
      }
      if (submitterTypeFilter.value && !submitterAuthorTypeFilters.value.includes(submitterTypeFilter.value)) {
        submitterTypeFilter.value = ''
      }
      await loadSubmitterVideos(true)
    } catch (err) {
      submitterAuthorTypeError.value = err instanceof Error ? err.message : String(err)
    } finally {
      submitterAuthorDeleting.value = ''
    }
  }

  async function setSubmitterPage(page) {
    submitterPage.value = Math.min(Math.max(1, page), submitterPageCount.value)
    await loadSubmitterVideos()
  }

  async function createSubmitterVideo() {
    const url = submitterUrl.value.trim()
    if (!url || submitterBusy.value) return
    submitterBusy.value = true
    submitterMessage.value = '正在抓取 yt-dlp JSON 并写入数据库...'
    submitterError.value = ''
    try {
      await submitterApi.createVideo(url)
      submitterUrl.value = ''
      submitterMessage.value = '已保存视频信息。'
      await loadSubmitterVideos(true)
      await loadSubmitterAuthors()
    } catch (err) {
      submitterError.value = err instanceof Error ? err.message : String(err)
    } finally {
      submitterBusy.value = false
    }
  }

  async function importSubmitterAuthor() {
    const author = submitterAuthor.value.trim()
    if (!author || submitterAuthorBusy.value) return
    submitterAuthorBusy.value = true
    submitterBusy.value = true
    submitterMessage.value = '正在创建作者后台导入任务...'
    submitterError.value = ''
    try {
      const payload = await submitterApi.importAuthor(author, submitterPlatform.value)
      submitterAuthor.value = ''
      submitterActiveBatch.value = payload.batch || ''
      submitterFocusedBatch.value = payload.batch || ''
      submitterActiveStatus.value = payload
      submitterListDetail.value = true
      submitterMessage.value = payload.source_url ? `已开始扫描：${payload.source_url}` : '已开始后台扫描。'
      await loadSubmitterVideos(true)
      await loadSubmitterAuthors()
      await refreshSubmitterImportStatus()
      updateSubmitterPolling()
    } catch (err) {
      submitterError.value = err instanceof Error ? err.message : String(err)
    } finally {
      submitterAuthorBusy.value = false
      submitterBusy.value = false
    }
  }

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

  function submitterVideoHref(item) {
    const data = submitterSource(item)
    return submitterFieldValue(item, 'webpage_url') || data.original_url || item?.input_url || ''
  }

  function submitterVideoTitle(item) {
    return submitterFieldValue(item, 'title') || '-'
  }

  function submitterVideoThumb(item) {
    return submitterFieldValue(item, 'thumbnail') || ''
  }

  function submitterCachedThumb(item) {
    const url = submitterVideoThumb(item)
    return submitterThumbUrls.value[url] || url
  }

  async function cacheSubmitterThumbnail(url) {
    await cacheImageUrl(url, 'submitter-thumbnails-v1', submitterThumbUrls)
  }

  function warmSubmitterThumbnails() {
    for (const item of submitterVideos.value.slice(0, 100)) {
      cacheSubmitterThumbnail(submitterVideoThumb(item))
    }
  }

  function closeSubmitterJson() {
    submitterJsonTitle.value = ''
    submitterJsonPayload.value = null
  }

  return {
    submitterVideos,
    submitterLoading,
    submitterError,
    submitterMessage,
    submitterUrl,
    submitterAuthor,
    submitterPlatform,
    submitterBusy,
    submitterAuthorBusy,
    submitterTypeFilter,
    submitterUploader,
    submitterVideoName,
    submitterDurationFilter,
    submitterUploadFilter,
    submitterSort,
    submitterAuthors,
    submitterFocusedBatch,
    submitterJsonTitle,
    submitterJsonPayload,
    submitterThumbUrls,
    submitterSubmittingId,
    submitterRejectingId,
    submitterPage,
    submitterTotal,
    submitterAuthorTypeRows,
    submitterAuthorTypeSaving,
    submitterAuthorDeleting,
    submitterAuthorTypeError,
    submitterFilteredVideos,
    submitterFilteredTotal,
    submitterPageCount,
    submitterStatusCounts,
    submitterAuthorTypeFilters,
    submitterAuthorOptions,
    loadSubmitterVideos,
    applySubmitterFilters,
    loadSubmitterAuthors,
    resetSubmitterFilters,
    clearSubmitterBatchFocus,
    submitVideoToYoubi,
    rejectSubmitterVideo,
    withdrawSubmitterVideo,
    submitterSubmissionStatus,
    autosaveSubmitterAuthorType,
    deleteSubmitterAuthor,
    setSubmitterPage,
    createSubmitterVideo,
    importSubmitterAuthor,
    clearSubmitterPolling,
    submitterFieldValue,
    submitterVideoHref,
    submitterVideoTitle,
    submitterVideoThumb,
    submitterCachedThumb,
    closeSubmitterJson,
  }
}
