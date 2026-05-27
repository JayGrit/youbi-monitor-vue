import { ref } from 'vue'

export function useImageCache() {
  const brokenImageUrls = ref({})

  async function cacheImageUrl(url, cacheName, targetRef) {
    if (!url || targetRef.value[url]) return
    if (!('caches' in window)) return
    try {
      const cache = await caches.open(cacheName)
      const cached = await cache.match(url)
      if (cached) {
        const blob = await cached.blob()
        if (blob.size > 0) {
          targetRef.value = { ...targetRef.value, [url]: URL.createObjectURL(blob) }
          return
        }
      }
      const response = await fetch(url, { mode: 'cors', cache: 'force-cache' })
      if (!response.ok) return
      await cache.put(url, response.clone())
      const blob = await response.blob()
      if (blob.size > 0) {
        targetRef.value = { ...targetRef.value, [url]: URL.createObjectURL(blob) }
      }
    } catch (err) {
      // Fall back to the original URL when a thumbnail host does not allow CORS.
    }
  }

  function revokeCachedUrls(urls) {
    for (const url of Object.values(urls || {})) {
      if (String(url).startsWith('blob:')) URL.revokeObjectURL(url)
    }
  }

  return {
    brokenImageUrls,
    cacheImageUrl,
    revokeCachedUrls,
  }
}
