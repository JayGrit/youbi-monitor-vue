import { computed, ref } from 'vue'
import { SUBMITTER_PAGE_SIZE } from '../domain/constants'
import { formatNumber } from '../utils/format'
import { useSubmitterActions } from './submitter/useSubmitterActions'
import { useSubmitterAuthors } from './submitter/useSubmitterAuthors'
import { useSubmitterPolling } from './submitter/useSubmitterPolling'
import { useSubmitterSelection } from './submitter/useSubmitterSelection'
import { useSubmitterThumbnails } from './submitter/useSubmitterThumbnails'

export function useSubmitter(submitterApi, cacheImageUrl) {
  const submitterVideos = ref([])
  const submitterLoading = ref(false)
  const submitterError = ref('')
  const submitterMessage = ref('')
  const submitterInput = ref('')
  const submitterBusy = ref(false)
  const submitterTypeFilter = ref('')
  const submitterUploader = ref('')
  const submitterVideoName = ref('')
  const submitterDurationFilter = ref('all')
  const submitterPublishedFilter = ref('all')
  const submitterManualSubtitleFilter = ref('all')
  const submitterBilibiliFilter = ref('all')
  const submitterUploadFilter = ref('unuploaded')
  const submitterSort = ref('published_desc')
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
  const submitterBatchSubmitting = ref(false)
  const submitterSelectedIds = ref([])
  const submitterSelectedRows = ref({})
  const submitterPage = ref(1)
  const submitterTotal = ref(0)
  const submitterAuthorTypeRows = ref([])
  const submitterTaskTypes = ref([])
  const submitterAuthorTypeSaving = ref('')
  const submitterAuthorDeleting = ref('')
  const submitterAuthorTypeError = ref('')

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
      const payload = await submitterApi.listVideos(
        submitterListRequest(SUBMITTER_PAGE_SIZE, (submitterPage.value - 1) * SUBMITTER_PAGE_SIZE),
      )
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
    clearSubmitterSelection()
    await loadSubmitterVideos()
  }

  async function loadSubmitterAuthors() {
    try {
      const authorsPayload = await submitterApi.listAuthors()
      submitterAuthors.value = authorsPayload?.items || []
      await Promise.all([
        loadSubmitterAuthorTypes(),
        loadSubmitterTaskTypes(),
      ])
    } catch (err) {
      submitterError.value = err instanceof Error ? err.message : String(err)
    }
  }

  async function resetSubmitterFilters() {
    submitterTypeFilter.value = ''
    submitterUploader.value = ''
    submitterVideoName.value = ''
    submitterDurationFilter.value = 'all'
    submitterPublishedFilter.value = 'all'
    submitterManualSubtitleFilter.value = 'all'
    submitterBilibiliFilter.value = 'all'
    submitterUploadFilter.value = 'unuploaded'
    submitterSort.value = 'published_desc'
    submitterFocusedBatch.value = ''
    submitterPage.value = 1
    clearSubmitterSelection()
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

  function submitterPublishedRange() {
    const now = Math.floor(Date.now() / 1000)
    if (submitterPublishedFilter.value === 'week') return { from: now - 7 * 24 * 60 * 60, to: now }
    if (submitterPublishedFilter.value === 'month') return { from: now - 30 * 24 * 60 * 60, to: now }
    return { from: null, to: null }
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
    clearSubmitterSelection()
    await loadSubmitterVideos()
  }

  function submitterListRequest(limit, offset = 0) {
    const durationRange = submitterDurationRange()
    const publishedRange = submitterPublishedRange()
    return {
      detail: submitterListDetail.value,
      batch: submitterFocusedBatch.value,
      type: submitterTypeFilter.value,
      uploader: submitterUploader.value,
      videoName: submitterVideoName.value.trim(),
      sort: submitterSort.value,
      limit,
      offset,
      durationMin: durationRange.min,
      durationMax: durationRange.max,
      publishedFrom: publishedRange.from,
      publishedTo: publishedRange.to,
      submissionStatus: submitterUploadFilter.value,
      manualSubtitle: submitterManualSubtitleFilter.value,
      bilibiliExists: submitterBilibiliFilter.value,
    }
  }

  async function loadSubmitterMatchingVideos() {
    const payload = await submitterApi.listVideos(submitterListRequest(null, 0))
    return payload?.items || []
  }

  const {
    submitterPageSelectableIds,
    submitterSelectedCount,
    submitterPageAllSelected,
    setSubmitterRowSelected,
    toggleSubmitterPageSelection,
    selectAllSubmitterFilteredVideos,
    clearSubmitterSelection,
    removeSubmittedRows,
  } = useSubmitterSelection({
    submitterVideos,
    submitterSelectedIds,
    submitterSelectedRows,
    submitterBatchSubmitting,
    submitterMessage,
    submitterError,
    loadSubmitterMatchingVideos,
    submitterFieldValue,
    submitterSubmissionStatus,
  })

  const {
    submitterVideoThumb,
    submitterCachedThumb,
    warmSubmitterThumbnails,
  } = useSubmitterThumbnails({
    submitterVideos,
    submitterThumbUrls,
    cacheImageUrl,
    submitterFieldValue,
  })

  const {
    submitVideoToYoubi,
    submitSelectedVideosToYoubi,
    rejectSubmitterVideo,
    withdrawSubmitterVideo,
  } = useSubmitterActions({
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
  })

  const {
    loadSubmitterAuthorTypes,
    loadSubmitterTaskTypes,
    autosaveSubmitterAuthorType,
    deleteSubmitterAuthor,
  } = useSubmitterAuthors({
    submitterApi,
    submitterAuthors,
    submitterAuthorTypeRows,
    submitterTaskTypes,
    submitterAuthorTypeSaving,
    submitterAuthorDeleting,
    submitterAuthorTypeError,
    submitterMessage,
    submitterUploader,
    submitterTypeFilter,
    submitterAuthorTypeFilters,
    loadSubmitterVideos,
  })

  const {
    refreshSubmitterImportStatus,
    updateSubmitterPolling,
    clearSubmitterPolling,
  } = useSubmitterPolling({
    submitterApi,
    submitterActiveRows,
    submitterActiveBatch,
    submitterActiveStatus,
    submitterMessage,
    submitterError,
    loadSubmitterVideos,
  })

  async function setSubmitterPage(page) {
    submitterPage.value = Math.min(Math.max(1, page), submitterPageCount.value)
    await loadSubmitterVideos()
  }

  async function submitSubmitterInput() {
    const input = submitterInput.value.trim()
    if (!input || submitterBusy.value) return
    submitterBusy.value = true
    submitterMessage.value = '正在识别输入并提交到 Submitter...'
    submitterError.value = ''
    try {
      const payload = await submitterApi.intake(input)
      submitterInput.value = ''
      if (payload.kind === 'author') {
        submitterActiveBatch.value = payload.batch || ''
        submitterFocusedBatch.value = payload.batch || ''
        submitterActiveStatus.value = payload
        submitterListDetail.value = Boolean(payload.batch)
        submitterMessage.value = payload.source_url ? `已加入后台扫描队列：${payload.source_url}` : '已加入后台扫描队列。'
      } else {
        submitterMessage.value = '已保存视频信息。'
      }
      await loadSubmitterVideos(true)
      await loadSubmitterAuthors()
      if (payload.kind === 'author' && payload.batch) {
        await refreshSubmitterImportStatus()
      }
      updateSubmitterPolling()
    } catch (err) {
      submitterError.value = err instanceof Error ? err.message : String(err)
    } finally {
      submitterBusy.value = false
    }
  }

  function submitterVideoHref(item) {
    const data = submitterSource(item)
    return submitterFieldValue(item, 'webpage_url') || data.original_url || item?.input_url || ''
  }

  function submitterVideoTitle(item) {
    return submitterFieldValue(item, 'title') || '-'
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
    submitterInput,
    submitterBusy,
    submitterTypeFilter,
    submitterUploader,
    submitterVideoName,
    submitterDurationFilter,
    submitterPublishedFilter,
    submitterManualSubtitleFilter,
    submitterBilibiliFilter,
    submitterUploadFilter,
    submitterSort,
    submitterAuthors,
    submitterFocusedBatch,
    submitterJsonTitle,
    submitterJsonPayload,
    submitterThumbUrls,
    submitterSubmittingId,
    submitterRejectingId,
    submitterBatchSubmitting,
    submitterSelectedIds,
    submitterSelectedCount,
    submitterPageSelectableIds,
    submitterPageAllSelected,
    submitterPage,
    submitterTotal,
    submitterAuthorTypeRows,
    submitterTaskTypes,
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
    submitSelectedVideosToYoubi,
    setSubmitterRowSelected,
    toggleSubmitterPageSelection,
    selectAllSubmitterFilteredVideos,
    clearSubmitterSelection,
    rejectSubmitterVideo,
    withdrawSubmitterVideo,
    submitterSubmissionStatus,
    autosaveSubmitterAuthorType,
    deleteSubmitterAuthor,
    setSubmitterPage,
    submitSubmitterInput,
    clearSubmitterPolling,
    resumeSubmitterPolling: updateSubmitterPolling,
    submitterFieldValue,
    submitterVideoHref,
    submitterVideoTitle,
    submitterVideoThumb,
    submitterCachedThumb,
    closeSubmitterJson,
  }
}
