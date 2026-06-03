import { postJson, requestJson } from './http'

export function createSubmitterApi(submitterApiBase, apiBase) {
  return {
    listVideos({ detail, batch, uploader, sort, limit, offset, durationMin, durationMax, submissionStatus } = {}) {
      const params = new URLSearchParams()
      params.set('limit', String(limit || 50))
      params.set('offset', String(offset || 0))
      if (detail || batch) params.set('detail', '1')
      if (batch) params.set('batch', batch)
      if (uploader) params.set('uploader', uploader)
      if (sort) params.set('sort', sort)
      if (durationMin !== undefined && durationMin !== null) params.set('duration_min', String(durationMin))
      if (durationMax !== undefined && durationMax !== null) params.set('duration_max', String(durationMax))
      if (submissionStatus && submissionStatus !== 'all') params.set('submission_status', submissionStatus)
      const query = params.toString()
      return requestJson(`${submitterApiBase}/videos${query ? `?${query}` : ''}`)
    },

    listAuthors() {
      return requestJson(`${submitterApiBase}/authors`)
    },

    submitVideo(rowId, type, needSubtitle, needDubbing, needSeparation) {
      return postJson(`${submitterApiBase}/videos/${encodeURIComponent(rowId)}/submit`, {
        type,
        need_subtitle: needSubtitle,
        need_dubbing: needDubbing,
        need_separation: needSeparation,
      })
    },

    rejectVideo(rowId) {
      return postJson(`${submitterApiBase}/videos/${encodeURIComponent(rowId)}/reject`, {})
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

    saveAuthorType(author, type, needSubtitle, needDubbing, needSeparation, sourceLanguage, targetLanguage) {
      return postJson(`${apiBase}/submitter-author-types`, {
        author,
        type,
        needSubtitle,
        needDubbing,
        needSeparation,
        sourceLanguage,
        targetLanguage,
      })
    },

    deleteAuthorType(author) {
      const params = new URLSearchParams({ author })
      return requestJson(`${apiBase}/submitter-author-types?${params}`, { method: 'DELETE' })
    },
  }
}
