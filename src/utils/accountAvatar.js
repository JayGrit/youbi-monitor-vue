const MINIO_PROXY_BASE = `${import.meta.env.BASE_URL}minio`
const MINIO_AVATAR_PATH = /^\/[^/]+\/account-avatars\//

export function normalizeAccountAvatarUrl(url) {
  const text = String(url || '').trim()
  if (!text) return ''
  try {
    const parsed = new URL(text, window.location.origin)
    if (parsed.origin !== window.location.origin && MINIO_AVATAR_PATH.test(parsed.pathname)) {
      return `${MINIO_PROXY_BASE}${parsed.pathname}${parsed.search}`
    }
  } catch {
    return text
  }
  return text
}
