import { computed, ref } from 'vue'
import {
  SUBMITTER_COMMON_FIELDS,
  SUBMITTER_FIXED_FIELDS,
  SUBMITTER_NUMERIC_FIELDS,
  SUBMITTER_PAGE_SIZE,
  SUBMITTER_PREFERRED_FIELDS,
} from '../domain/constants'
import { formatNumber } from '../utils/format'

export function useSubmitter(submitterApi, cacheImageUrl) {
  const submitterVideos = ref([])
  const submitterLoading = ref(false)
  const submitterError = ref('')
  const submitterMessage = ref('')
  const submitterUrl = ref('')
  const submitterAuthor = ref('')
  const submitterBusy = ref(false)
  const submitterAuthorBusy = ref(false)
  const submitterUploader = ref('')
  const submitterDurationFilter = ref('all')
  const submitterUploadFilter = ref('unuploaded')
  const submitterSort = ref('updated_desc')
  const submitterAuthors = ref([])
  const submitterFields = ref([])
  const submitterVisibleFields = ref(new Set())
  const submitterFieldsInitialized = ref(false)
  const submitterFieldsOpen = ref(false)
  const submitterListDetail = ref(false)
  const submitterActiveBatch = ref('')
  const submitterFocusedBatch = ref('')
  const submitterActiveStatus = ref(null)
  const submitterJsonTitle = ref('')
  const submitterJsonPayload = ref(null)
  const submitterThumbUrls = ref({})
  const submitterSubmittingId = ref('')
  const submitterPage = ref(1)
  const submitterAuthorTypeOpen = ref(false)
  const submitterAuthorTypeRows = ref([])
  const submitterAuthorTypeSaving = ref('')
  const submitterAuthorTypeError = ref('')
  let submitterTimer = null

  const submitterFilteredVideos = computed(() => {
    const rows = filterSubmitterVideos(submitterVideos.value)
    const start = (submitterPage.value - 1) * SUBMITTER_PAGE_SIZE
    return rows.slice(start, start + SUBMITTER_PAGE_SIZE)
  })

  const submitterFilteredTotal = computed(() => {
    return filterSubmitterVideos(submitterVideos.value).length
  })

  const submitterPageCount = computed(() => {
    return Math.max(1, Math.ceil(submitterFilteredTotal.value / SUBMITTER_PAGE_SIZE))
  })

  const submitterVisibleFieldList = computed(() => {
    return submitterFields.value.filter(field => submitterVisibleFields.value.has(field))
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
      .map(([status, count]) => `${labels[status] || status} ${formatNumber(count)}`)
      .join(' · ')
  })

  function submitterSource(item) {
    return item?.raw_info_json || item?.info_json || item || {}
  }

  function submitterFieldValue(item, key) {
    if (Object.prototype.hasOwnProperty.call(item || {}, key)) return item[key]
    return submitterSource(item)[key]
  }

  function submitterFieldLabel(key) {
    return key === '__detail' ? '详情' : key
  }

  function buildSubmitterFields() {
    const keys = new Set(['__detail'])
    for (const item of submitterVideos.value) {
      for (const key of Object.keys(item || {})) {
        if (!SUBMITTER_FIXED_FIELDS.has(key)) keys.add(key)
      }
      for (const key of Object.keys(submitterSource(item))) {
        if (!SUBMITTER_FIXED_FIELDS.has(key)) keys.add(key)
      }
    }
    submitterFields.value = [...keys].sort((left, right) => {
      const leftIndex = SUBMITTER_PREFERRED_FIELDS.indexOf(left)
      const rightIndex = SUBMITTER_PREFERRED_FIELDS.indexOf(right)
      if (leftIndex !== -1 || rightIndex !== -1) {
        return (leftIndex === -1 ? 999 : leftIndex) - (rightIndex === -1 ? 999 : rightIndex)
      }
      return left.localeCompare(right)
    })
    if (!submitterFieldsInitialized.value) {
      submitterVisibleFields.value = new Set(submitterFields.value.filter(key => SUBMITTER_COMMON_FIELDS.has(key)))
      submitterFieldsInitialized.value = true
    } else {
      submitterVisibleFields.value = new Set([...submitterVisibleFields.value].filter(key => keys.has(key)))
    }
  }

  function selectAllSubmitterFields() {
    submitterVisibleFields.value = new Set(submitterFields.value)
  }

  function selectCommonSubmitterFields() {
    submitterVisibleFields.value = new Set(submitterFields.value.filter(key => SUBMITTER_COMMON_FIELDS.has(key)))
  }

  function selectNoSubmitterFields() {
    submitterVisibleFields.value = new Set()
  }

  function toggleSubmitterField(key, checked) {
    const next = new Set(submitterVisibleFields.value)
    if (checked) next.add(key)
    else next.delete(key)
    submitterVisibleFields.value = next
  }

  async function loadSubmitterVideos(quiet = false) {
    if (!quiet) submitterLoading.value = true
    try {
      const payload = await submitterApi.listVideos({
        detail: submitterListDetail.value,
        batch: submitterFocusedBatch.value,
        uploader: submitterUploader.value,
        sort: submitterSort.value,
      })
      submitterVideos.value = payload?.items || []
      buildSubmitterFields()
      warmSubmitterThumbnails()
      submitterError.value = ''
      updateSubmitterPolling()
      if (!submitterMessage.value) submitterMessage.value = '素材库已加载。'
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
      const payload = await submitterApi.listAuthors()
      submitterAuthors.value = payload?.items || []
    } catch (err) {
      submitterError.value = err instanceof Error ? err.message : String(err)
    }
  }

  async function toggleSubmitterFieldsPanel() {
    submitterFieldsOpen.value = !submitterFieldsOpen.value
    if (submitterFieldsOpen.value && !submitterListDetail.value) {
      submitterListDetail.value = true
      await loadSubmitterVideos()
    }
  }

  async function resetSubmitterFilters() {
    submitterUploader.value = ''
    submitterDurationFilter.value = 'all'
    submitterUploadFilter.value = 'unuploaded'
    submitterSort.value = 'updated_desc'
    submitterFocusedBatch.value = ''
    submitterPage.value = 1
    await loadSubmitterVideos()
  }

  function filterSubmitterVideos(rows) {
    return rows.filter(item => {
      if (submitterUploadFilter.value === 'unuploaded' && item.ydbi_submitted) return false
      if (submitterUploadFilter.value === 'uploaded' && !item.ydbi_submitted) return false
      return matchesSubmitterDurationFilter(item)
    })
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
    if (!rowId || item.ydbi_submitted || submitterSubmittingId.value) return
    submitterSubmittingId.value = String(rowId)
    submitterError.value = ''
    try {
      const author = submitterAuthorName(item)
      const authorConfig = await loadSubmitterAuthorType(author)
      if (!authorConfig.type) {
        submitterError.value = author
          ? `作者 ${author} 未配置投稿 type，请先维护 yd_submitter_author_type。`
          : '当前素材没有作者信息，无法读取投稿 type。'
        return
      }
      const payload = await submitterApi.submitVideo(rowId, authorConfig.type, authorConfig.needDubbing)
      Object.assign(item, {
        ydbi_submitted: 1,
        ydbi_submission_id: payload.submission_id,
        ydbi_submitted_at: new Date().toISOString(),
      })
      if (submitterPage.value > submitterPageCount.value) {
        submitterPage.value = submitterPageCount.value
      }
      submitterMessage.value = `已提交到 YouBi 下载队列，type=${authorConfig.type}。`
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
    if (!author) return { type: '', needDubbing: true }
    const payload = await submitterApi.getAuthorType(author)
    return {
      type: String(payload?.type || '').trim(),
      needDubbing: payload?.needDubbing !== false,
    }
  }

  async function openSubmitterAuthorTypes() {
    submitterAuthorTypeOpen.value = true
    submitterAuthorTypeError.value = ''
    await loadSubmitterAuthorTypes()
  }

  async function loadSubmitterAuthorTypes() {
    try {
      const [payload] = await Promise.all([
        submitterApi.listAuthorTypes(),
        submitterAuthors.value.length ? Promise.resolve() : loadSubmitterAuthors(),
      ])
      const byAuthor = new Map((payload || []).map(item => [String(item.author || ''), item]))
      const authors = new Set([...submitterAuthors.value, ...byAuthor.keys()].filter(Boolean))
      submitterAuthorTypeRows.value = [...authors].sort((left, right) => left.localeCompare(right)).map(author => ({
        author,
        type: String(byAuthor.get(author)?.type || ''),
        draftType: String(byAuthor.get(author)?.type || ''),
        needDubbing: byAuthor.get(author)?.needDubbing !== false,
        draftNeedDubbing: byAuthor.get(author)?.needDubbing !== false,
      }))
    } catch (err) {
      submitterAuthorTypeError.value = err instanceof Error ? err.message : String(err)
    }
  }

  async function saveSubmitterAuthorType(row) {
    const type = String(row?.draftType || '').trim()
    if (submitterAuthorTypeSaving.value === row?.author) return
    if (!row?.author || !type || (type === row.type && row.draftNeedDubbing === row.needDubbing)) return
    submitterAuthorTypeSaving.value = row.author
    submitterAuthorTypeError.value = ''
    try {
      const payload = await submitterApi.saveAuthorType(row.author, type, row.draftNeedDubbing)
      row.type = String(payload?.type || type)
      row.draftType = row.type
      row.needDubbing = payload?.needDubbing !== false
      row.draftNeedDubbing = row.needDubbing
    } catch (err) {
      submitterAuthorTypeError.value = err instanceof Error ? err.message : String(err)
    } finally {
      submitterAuthorTypeSaving.value = ''
    }
  }

  async function autosaveSubmitterAuthorType(row) {
    row.draftType = String(row?.draftType || '').trim()
    await saveSubmitterAuthorType(row)
  }

  function closeSubmitterAuthorTypes() {
    submitterAuthorTypeOpen.value = false
    submitterAuthorTypeError.value = ''
  }

  function setSubmitterPage(page) {
    submitterPage.value = Math.min(Math.max(1, page), submitterPageCount.value)
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
      const payload = await submitterApi.importAuthor(author)
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

  function submitterValueKind(key, value) {
    if (key === '__detail') return 'detail'
    if (value === null || value === undefined || value === '') return 'empty'
    if (key === 'duration') return 'duration'
    if (key === 'timestamp' || key === 'release_timestamp') return 'unix'
    if (key === 'webpage_url' || key.endsWith('_url') || key === 'url' || key === 'original_url') return 'link'
    if (Array.isArray(value)) return 'array'
    if (typeof value === 'object') return 'object'
    if (SUBMITTER_NUMERIC_FIELDS.has(key)) return 'number'
    return 'text'
  }

  function summarizeSubmitterObject(value) {
    const output = {}
    for (const key of Object.keys(value || {}).slice(0, 12)) {
      const entry = value[key]
      if (Array.isArray(entry)) output[key] = `[${entry.length} items]`
      else if (entry && typeof entry === 'object') output[key] = '{...}'
      else output[key] = entry
    }
    const rest = Object.keys(value || {}).length - Object.keys(output).length
    if (rest > 0) output.__more = `${rest} more keys`
    return output
  }

  function submitterJsonPreview(value) {
    return JSON.stringify(summarizeSubmitterObject(value), null, 2)
  }

  function submitterArrayPreview(value) {
    if (!Array.isArray(value)) return []
    return value.slice(0, 20)
  }

  async function showSubmitterJson(item) {
    try {
      let detail = item
      if (item?.id) {
        const payload = await submitterApi.getVideo(item.id)
        detail = payload?.item || item
      }
      const data = submitterSource(detail)
      submitterJsonTitle.value = data.title || data.id || '完整 yt-dlp JSON'
      submitterJsonPayload.value = data
    } catch (err) {
      submitterError.value = err instanceof Error ? err.message : String(err)
    }
  }

  function closeSubmitterJson() {
    submitterJsonTitle.value = ''
    submitterJsonPayload.value = null
  }

  function formatUnixSeconds(value) {
    const number = Number(value)
    if (!Number.isFinite(number) || number <= 0) return '-'
    return new Date(number * 1000).toLocaleString()
  }

  return {
    submitterVideos,
    submitterLoading,
    submitterError,
    submitterMessage,
    submitterUrl,
    submitterAuthor,
    submitterBusy,
    submitterAuthorBusy,
    submitterUploader,
    submitterDurationFilter,
    submitterUploadFilter,
    submitterSort,
    submitterAuthors,
    submitterFields,
    submitterVisibleFields,
    submitterFieldsOpen,
    submitterFocusedBatch,
    submitterJsonTitle,
    submitterJsonPayload,
    submitterThumbUrls,
    submitterSubmittingId,
    submitterPage,
    submitterAuthorTypeOpen,
    submitterAuthorTypeRows,
    submitterAuthorTypeSaving,
    submitterAuthorTypeError,
    submitterFilteredVideos,
    submitterFilteredTotal,
    submitterPageCount,
    submitterVisibleFieldList,
    submitterStatusCounts,
    loadSubmitterVideos,
    applySubmitterFilters,
    loadSubmitterAuthors,
    toggleSubmitterFieldsPanel,
    resetSubmitterFilters,
    clearSubmitterBatchFocus,
    submitVideoToYoubi,
    openSubmitterAuthorTypes,
    autosaveSubmitterAuthorType,
    closeSubmitterAuthorTypes,
    setSubmitterPage,
    createSubmitterVideo,
    importSubmitterAuthor,
    clearSubmitterPolling,
    submitterFieldValue,
    submitterFieldLabel,
    selectAllSubmitterFields,
    selectCommonSubmitterFields,
    selectNoSubmitterFields,
    toggleSubmitterField,
    submitterVideoHref,
    submitterVideoTitle,
    submitterVideoThumb,
    submitterCachedThumb,
    submitterValueKind,
    submitterJsonPreview,
    submitterArrayPreview,
    showSubmitterJson,
    closeSubmitterJson,
    formatUnixSeconds,
  }
}
