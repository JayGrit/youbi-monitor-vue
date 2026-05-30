import { postJson, requestJson } from './http'

export function createSubmitterApi(submitterApiBase, apiBase) {
  return {
    listVideos({ detail, batch, uploader, sort } = {}) {
      const params = new URLSearchParams()
      params.set('limit', '100000')
      if (detail || batch) params.set('detail', '1')
      if (batch) params.set('batch', batch)
      if (uploader) params.set('uploader', uploader)
      if (sort) params.set('sort', sort)
      const query = params.toString()
      return requestJson(`${submitterApiBase}/videos${query ? `?${query}` : ''}`)
    },

    listAuthors() {
      return requestJson(`${submitterApiBase}/authors`)
    },

    submitVideo(rowId, type, needDubbing) {
      return postJson(`${submitterApiBase}/videos/${encodeURIComponent(rowId)}/submit`, { type, need_dubbing: needDubbing })
    },

    rejectVideo(rowId) {
      return postJson(`${submitterApiBase}/videos/${encodeURIComponent(rowId)}/reject`, {})
    },

    createVideo(url) {
      return postJson(`${submitterApiBase}/videos`, { url })
    },

    importAuthor(author) {
      return postJson(`${submitterApiBase}/authors/import`, { author })
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

    saveAuthorType(author, type, needDubbing, sourceLanguage, targetLanguage) {
      return postJson(`${apiBase}/submitter-author-types`, {
        author,
        type,
        needDubbing,
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
