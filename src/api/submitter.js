import { postJson, requestJson } from './http'

const RETRYABLE_SUBMITTER_ERROR = /deadlock|lock wait timeout|try restarting transaction/i

function wait(ms) {
  return new Promise(resolve => window.setTimeout(resolve, ms))
}

async function postSubmitterJson(url, body, context, { acceptAlreadySubmitted = false } = {}) {
  return requestJson(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }, {
    ...context,
    acceptResponse: (response, payload) => acceptAlreadySubmitted && response.status === 409 && payload?.already_submitted,
  })
}

async function postSubmitterJsonWithRetry(url, body, context, options) {
  try {
    return await postSubmitterJson(url, body, context, options)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    if (!RETRYABLE_SUBMITTER_ERROR.test(message)) throw err
    await wait(500)
    return postSubmitterJson(url, body, context, options)
  }
}

export function createSubmitterApi(submitterApiBase, service = 'submitter') {
  const context = { service }

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
      bilibiliExists,
    } = {}) {
      const params = new URLSearchParams()
      if (limit !== undefined && limit !== null) params.set('limit', String(limit))
      if (offset !== undefined && offset !== null) params.set('offset', String(offset))
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
      if (bilibiliExists && bilibiliExists !== 'all') {
        params.set('bilibili_exists', bilibiliExists === 'exists' ? '1' : '0')
      }
      const query = params.toString()
      return requestJson(`${submitterApiBase}/videos${query ? `?${query}` : ''}`, undefined, context)
    },

    listAuthors() {
      return requestJson(`${submitterApiBase}/authors`, undefined, context)
    },

    submitVideo(rowId, type) {
      return postSubmitterJsonWithRetry(
        `${submitterApiBase}/videos/${encodeURIComponent(rowId)}/submit`,
        { type },
        context,
        { acceptAlreadySubmitted: true },
      )
    },

    rejectVideo(rowId) {
      return postSubmitterJsonWithRetry(`${submitterApiBase}/videos/${encodeURIComponent(rowId)}/reject`, {}, context)
    },

    withdrawVideo(rowId) {
      return postSubmitterJsonWithRetry(`${submitterApiBase}/videos/${encodeURIComponent(rowId)}/withdraw`, {}, context)
    },

    createVideo(url) {
      return postJson(`${submitterApiBase}/videos`, { url }, context)
    },

    importAuthor(author, platform) {
      return postJson(`${submitterApiBase}/authors/import`, { author, platform }, context)
    },

    getImportStatus(batch) {
      return requestJson(`${submitterApiBase}/authors/import/${encodeURIComponent(batch)}`, undefined, context)
    },

    getVideo(id) {
      return requestJson(`${submitterApiBase}/videos/${encodeURIComponent(id)}`, undefined, context)
    },

    getAuthorType(author) {
      const params = new URLSearchParams({ author })
      return requestJson(`${submitterApiBase}/submitter-author-types?${params}`, undefined, context)
    },

    listAuthorTypes() {
      return requestJson(`${submitterApiBase}/submitter-author-types/all`, undefined, context)
    },

    listTaskTypes() {
      return requestJson(`${submitterApiBase}/submitter-author-types/task-types`, undefined, context)
    },

    saveAuthorType(author, type, taskType, hasBackgroundAudio, sourceLanguage, targetLanguage, resetCover, coverOrientation, fetchNewVideos, bilibiliExists) {
      return postJson(`${submitterApiBase}/submitter-author-types`, {
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
      }, context)
    },

    deleteAuthorType(author) {
      const params = new URLSearchParams({ author })
      return requestJson(`${submitterApiBase}/submitter-author-types?${params}`, { method: 'DELETE' }, context)
    },
  }
}
