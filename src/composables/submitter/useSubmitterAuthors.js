export function useSubmitterAuthors({
  submitterApi,
  submitterAuthors,
  submitterAuthorTypeRows,
  submitterTaskTypes,
  submitterAuthorTypeSaving,
  submitterAuthorDeleting,
  submitterAuthorTypeError,
  submitterMessage,
  submitterUploader,
  submitterTopicFilter,
  submitterAuthorTopicFilters,
  loadSubmitterVideos,
}) {
  async function loadSubmitterAuthorTypes() {
    submitterAuthorTypeError.value = ''
    try {
      const payload = await submitterApi.listAuthorTypes()
      const byAuthor = new Map((payload || []).map(item => [String(item.author || ''), item]))
      const authorRows = new Map()
      for (const item of submitterAuthors.value) {
        const normalized = normalizeSubmitterAuthorRow(item)
        if (normalized.author) authorRows.set(normalized.author, normalized)
      }
      for (const author of byAuthor.keys()) {
        if (!authorRows.has(author)) authorRows.set(author, { author })
      }
      submitterAuthorTypeRows.value = sortSubmitterAuthorTypeRows([...authorRows.values()].map(authorRow => {
        const author = authorRow.author
        const item = byAuthor.get(author)
        const resetCover = item?.resetCover === true
        const coverOrientation = resetCover ? normalizeCoverOrientation(item?.coverOrientation || item?.cover_orientation) : ''
        return {
          author,
          source: normalizeSubmitterAuthorSource(item?.source || item?.platform || item?.source_platform || authorRow.source),
          authorUrl: String(item?.authorUrl || item?.author_url || item?.sourceUrl || item?.source_url || authorRow.authorUrl || ''),
          topic: String(item?.topic || ''),
          draftTopic: String(item?.topic || ''),
          taskType: String(item?.taskType || item?.task_type || 'dubbing'),
          draftTaskType: String(item?.taskType || item?.task_type || 'dubbing'),
          hasBackgroundAudio: item?.hasBackgroundAudio !== false,
          draftHasBackgroundAudio: item?.hasBackgroundAudio !== false,
          resetCover,
          draftResetCover: resetCover,
          coverOrientation,
          draftCoverOrientation: coverOrientation,
          fetchNewVideos: item?.fetchNewVideos === true,
          draftFetchNewVideos: item?.fetchNewVideos === true,
          bilibiliExists: item?.bilibiliExists === true,
          draftBilibiliExists: item?.bilibiliExists === true,
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

  function normalizeSubmitterAuthorRow(item) {
    if (typeof item === 'string') {
      return {
        author: item,
        source: inferSubmitterAuthorSource(item),
        authorUrl: inferSubmitterAuthorUrl(item),
      }
    }
    const author = String(item?.author || item?.uploader || item?.name || item?.id || '').trim()
    const authorUrl = String(item?.authorUrl || item?.author_url || item?.sourceUrl || item?.source_url || item?.url || '').trim()
    return {
      author,
      source: normalizeSubmitterAuthorSource(item?.source || item?.platform || item?.source_platform || inferSubmitterAuthorSource(authorUrl || author)),
      authorUrl: authorUrl || inferSubmitterAuthorUrl(author),
    }
  }

  function normalizeSubmitterAuthorSource(value) {
    const source = String(value || '').trim().toLowerCase()
    if (source.includes('youtube') || source === 'yt') return 'youtube'
    if (source.includes('tiktok')) return 'tiktok'
    if (source.includes('douyin') || source.includes('iesdouyin')) return 'douyin'
    return ''
  }

  function inferSubmitterAuthorSource(value) {
    const text = String(value || '').trim().toLowerCase()
    if (/youtu\.?be|youtube\.com/.test(text)) return 'youtube'
    if (/tiktok\.com/.test(text)) return 'tiktok'
    if (/douyin\.com|iesdouyin\.com/.test(text)) return 'douyin'
    return ''
  }

  function inferSubmitterAuthorUrl(value) {
    const text = String(value || '').trim()
    if (/^https?:\/\//i.test(text)) return text
    return ''
  }

  async function loadSubmitterTaskTypes() {
    submitterAuthorTypeError.value = ''
    try {
      const payload = await submitterApi.listTaskTypes()
      submitterTaskTypes.value = (payload || [])
        .map(item => ({
          taskType: String(item?.taskType || item?.task_type || '').trim(),
          name: String(item?.name || '').trim(),
          description: String(item?.description || '').trim(),
        }))
        .filter(item => item.taskType)
    } catch (err) {
      submitterAuthorTypeError.value = err instanceof Error ? err.message : String(err)
    }
  }

  function sortSubmitterAuthorTypeRows(rows) {
    return rows.sort((left, right) => {
      const leftType = String(left?.topic || left?.draftTopic || '').trim()
      const rightType = String(right?.topic || right?.draftTopic || '').trim()
      if (leftType && !rightType) return -1
      if (!leftType && rightType) return 1
      const typeOrder = leftType.localeCompare(rightType)
      if (typeOrder !== 0) return typeOrder
      return String(left?.author || '').localeCompare(String(right?.author || ''))
    })
  }

  async function saveSubmitterAuthorType(row) {
    const topic = String(row?.draftTopic || '').trim()
    const sourceLanguage = String(row?.draftSourceLanguage || '').trim() || '英文'
    const targetLanguage = String(row?.draftTargetLanguage || '').trim() || '中文'
    if (submitterAuthorTypeSaving.value === row?.author) return
    if (!row?.author || !topic) return
    if (
      topic === row.topic
      && row.draftTaskType === row.taskType
      && row.draftHasBackgroundAudio === row.hasBackgroundAudio
      && row.draftResetCover === row.resetCover
      && row.draftCoverOrientation === row.coverOrientation
      && row.draftFetchNewVideos === row.fetchNewVideos
      && row.draftBilibiliExists === row.bilibiliExists
      && sourceLanguage === row.sourceLanguage
      && targetLanguage === row.targetLanguage
    ) return
    submitterAuthorTypeSaving.value = row.author
    submitterAuthorTypeError.value = ''
    try {
      const taskType = String(row.draftTaskType || row.taskType || 'dubbing').trim()
      row.draftTaskType = taskType
      const hasBackgroundAudio = row.draftHasBackgroundAudio !== false
      const resetCover = row.draftResetCover === true
      const coverOrientation = resetCover ? normalizeCoverOrientation(row.draftCoverOrientation) : ''
      const fetchNewVideos = row.draftFetchNewVideos === true
      const bilibiliExists = row.draftBilibiliExists === true
      const payload = await submitterApi.saveAuthorType(row.author, topic, taskType, hasBackgroundAudio, sourceLanguage, targetLanguage, resetCover, coverOrientation, fetchNewVideos, bilibiliExists)
      row.topic = String(payload?.topic || topic)
      row.draftTopic = row.topic
      row.taskType = String(payload?.taskType || payload?.task_type || taskType)
      row.draftTaskType = row.taskType
      row.hasBackgroundAudio = payload?.hasBackgroundAudio !== false
      row.draftHasBackgroundAudio = row.hasBackgroundAudio
      row.resetCover = payload?.resetCover === true
      row.draftResetCover = row.resetCover
      row.coverOrientation = row.resetCover ? normalizeCoverOrientation(payload?.coverOrientation || payload?.cover_orientation || coverOrientation) : ''
      row.draftCoverOrientation = row.coverOrientation
      row.fetchNewVideos = payload?.fetchNewVideos === true
      row.draftFetchNewVideos = row.fetchNewVideos
      row.bilibiliExists = payload?.bilibiliExists === true
      row.draftBilibiliExists = row.bilibiliExists
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
    row.draftTopic = String(row?.draftTopic || '').trim()
    row.draftSourceLanguage = String(row?.draftSourceLanguage || '').trim() || '英文'
    row.draftTargetLanguage = String(row?.draftTargetLanguage || '').trim() || '中文'
    row.draftCoverOrientation = row.draftResetCover ? normalizeCoverOrientation(row.draftCoverOrientation) : ''
    await saveSubmitterAuthorType(row)
  }

  function normalizeCoverOrientation(value) {
    return String(value || '').trim() === 'vertical' ? 'vertical' : 'horizontal'
  }

  async function deleteSubmitterAuthor(row) {
    const author = String(row?.author || '').trim()
    if (!author || submitterAuthorDeleting.value || submitterAuthorTypeSaving.value) return
    if (!window.confirm(`确定删除作者 ${author} 并清理其所有视频？`)) return
    submitterAuthorDeleting.value = author
    submitterAuthorTypeError.value = ''
    try {
      const result = await submitterApi.deleteAuthorType(author)
      const deletedAuthorRows = Number(result?.deletedAuthorRows || 0)
      const deletedVideoRows = Number(result?.deletedVideoRows || 0)
      const deletedImportRows = Number(result?.deletedImportRows || 0)
      const matchedBatchCount = Array.isArray(result?.matchedBatches) ? result.matchedBatches.length : 0
      submitterMessage.value = `已删除作者配置 ${deletedAuthorRows} 条，视频 ${deletedVideoRows} 条，导入批次 ${deletedImportRows} 条，匹配 batch ${matchedBatchCount} 个`
      console.info('submitter author deleted', result)
      submitterAuthorTypeRows.value = submitterAuthorTypeRows.value.filter(item => item.author !== author)
      submitterAuthors.value = submitterAuthors.value.filter(item => normalizeSubmitterAuthorRow(item).author !== author)
      if (submitterUploader.value === author) {
        submitterUploader.value = ''
      }
      if (submitterTopicFilter.value && !submitterAuthorTopicFilters.value.includes(submitterTopicFilter.value)) {
        submitterTopicFilter.value = ''
      }
      await loadSubmitterVideos(true)
    } catch (err) {
      submitterAuthorTypeError.value = err instanceof Error ? err.message : String(err)
    } finally {
      submitterAuthorDeleting.value = ''
    }
  }

  return {
    loadSubmitterAuthorTypes,
    loadSubmitterTaskTypes,
    autosaveSubmitterAuthorType,
    deleteSubmitterAuthor,
  }
}
