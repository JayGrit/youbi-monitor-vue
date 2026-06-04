export function usePlatformIcons(platformIconUrls) {
  async function warmPlatformIcons() {
    const urls = Object.values(platformIconUrls)
    for (const url of urls) {
      const image = new Image()
      image.decoding = 'async'
      image.src = url
    }
    if (!('caches' in window)) return
    try {
      const cache = await caches.open('youbi-platform-icons-v1')
      await Promise.allSettled(urls.map(async url => {
        const cached = await cache.match(url)
        if (!cached) await cache.add(url)
      }))
    } catch {
      // Browser image cache still handles these icons when Cache API is unavailable.
    }
  }

  return { warmPlatformIcons }
}
