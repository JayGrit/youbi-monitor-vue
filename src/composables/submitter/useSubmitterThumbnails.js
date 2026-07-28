import { normalizeResourceUrl } from '../../utils/media'

export function useSubmitterThumbnails({ submitterVideos, submitterThumbUrls, cacheImageUrl, submitterFieldValue }) {
  function submitterVideoThumb(item) {
    return normalizeSubmitterThumbnailUrl(submitterFieldValue(item, 'thumbnail') || '')
  }

  function normalizeSubmitterThumbnailUrl(url) {
    const text = String(url || '').trim()
    if (!text) return ''
    try {
      const parsed = new URL(text, window.location.origin)
      const isSubmitterMinioAsset = parsed.pathname.includes('/assets/submitter-thumbnails/')
        && (parsed.hostname === '120.53.92.66' || parsed.port === '9000' || parsed.origin === window.location.origin)
      return isSubmitterMinioAsset ? normalizeResourceUrl(text) : ''
    } catch {
      return ''
    }
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
