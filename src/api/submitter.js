import { postJson, requestJson } from './http'

export function createSubmitterApi(submitterApiBase, apiBase) {
  return {
    listVideos({
      detail,
      batch,
      type,
      uploader,
      videoName,
      sort,
      limit,
      offset,
      durationMin,
      durationMax,
      publishedFrom,
      publishedTo,
      submissionStatus,
      manualSubtitle,
    } = {}) {
      const params = new URLSearchParams()
      params.set('limit', String(limit || 50))
      params.set('offset', String(offset || 0))
      if (detail || batch) params.set('detail', '1')
      if (batch) params.set('batch', batch)
      if (type) params.set('type', type)
      if (uploader) params.set('uploader', uploader)
      if (videoName) params.set('video_name', videoName)
      if (sort) params.set('sort', sort)
      if (durationMin !== undefined && durationMin !== null) params.set('duration_min', String(durationMin))
      if (durationMax !== undefined && durationMax !== null) params.set('duration_max', String(durationMax))
      if (publishedFrom !== undefined && publishedFrom !== null) params.set('published_from', String(publishedFrom))
      if (publishedTo !== undefined && publishedTo !== null) params.set('published_to', String(publishedTo))
      if (submissionStatus && submissionStatus !== 'all') params.set('submission_status', submissionStatus)
      if (manualSubtitle && manualSubtitle !== 'all') params.set('manual_subtitle', manualSubtitle)
      const query = params.toString()
      return requestJson(`${submitterApiBase}/videos${query ? `?${query}` : ''}`)
    },

    listAuthors() {
      return requestJson(`${submitterApiBase}/authors`)
    },

    submitVideo(rowId, type) {
      return postJson(`${submitterApiBase}/videos/${encodeURIComponent(rowId)}/submit`, {
        type,
      })
    },

    rejectVideo(rowId) {
      return postJson(`${submitterApiBase}/videos/${encodeURIComponent(rowId)}/reject`, {})
    },

    withdrawVideo(rowId) {
      return postJson(`${submitterApiBase}/videos/${encodeURIComponent(rowId)}/withdraw`, {})
    },

    createVideo(url) {
      return postJson(`${submitterApiBase}/videos`, { url })
    },

    importAuthor(author, platform) {
      return postJson(`${submitterApiBase}/authors/import`, { author, platform })
    },

    getImportStatus(batch) {
      return requestJson(`${submitterApiBase}/authors/import/${encodeURIComponent(batch)}`)
    },

    getVideo(id) {
      return requestJson(`${submitterApiBase}/videos/${encodeURIComponent(id)}`)
    },

    getAuthorType(author) {
      const params = new URLSearchParams({ author })
      return requestJson(`${apiBase}/submitter-author-types?${params}`)
    },

    listAuthorTypes() {
      return requestJson(`${apiBase}/submitter-author-types/all`)
    },

    listTaskTypes() {
      return requestJson(`${apiBase}/submitter-author-types/task-types`)
    },

    saveAuthorType(author, type, taskType, hasBackgroundAudio, sourceLanguage, targetLanguage, resetCover, coverOrientation, fetchNewVideos, bilibiliExists) {
      return postJson(`${apiBase}/submitter-author-types`, {
        author,
        type,
        taskType,
        hasBackgroundAudio,
        sourceLanguage,
        targetLanguage,
        resetCover,
        coverOrientation,
        fetchNewVideos,
        bilibiliExists,
      })
    },

    deleteAuthorType(author) {
      const params = new URLSearchParams({ author })
      return requestJson(`${apiBase}/submitter-author-types?${params}`, { method: 'DELETE' })
    },
  }
}
