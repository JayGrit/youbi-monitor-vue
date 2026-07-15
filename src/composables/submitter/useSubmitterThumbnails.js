export function useSubmitterThumbnails({ submitterVideos, submitterThumbUrls, cacheImageUrl, submitterFieldValue }) {
  function submitterVideoThumb(item) {
    return normalizeSubmitterThumbnailUrl(submitterFieldValue(item, 'thumbnail') || '')
  }

  function normalizeSubmitterThumbnailUrl(url) {
    const text = String(url || '').trim()
    if (!text) return ''
    try {
      const parsed = new URL(text)
      if (parsed.hostname === 'i.ytimg.com') {
        const match = parsed.pathname.match(/^\/vi_lc\/([^/]+)\/([^/]+)$/)
        if (match) {
          const [, videoId, fileName] = match
          parsed.pathname = `/vi/${videoId}/${fileName.replace(/_en(?=\.)/, '')}`
          return parsed.toString()
        }
      }
    } catch {
      return text
    }
    return text
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

  return {
    submitterVideoThumb,
    submitterCachedThumb,
    warmSubmitterThumbnails,
  }
}
