const MINIO_PROXY_BASE = `${import.meta.env.BASE_URL}minio`
const MINIO_BUCKET = 'ydbi'

function encodePath(path) {
  return String(path || '')
    .split('/')
    .map(part => {
      try {
        return encodeURIComponent(decodeURIComponent(part))
      } catch {
        return encodeURIComponent(part)
      }
    })
    .join('/')
}

function proxiedMinioPath(path, search = '') {
  const normalized = String(path || '').replace(/^\/+/, '')
  if (!normalized) return ''
  return `${MINIO_PROXY_BASE}/${encodePath(normalized)}${search || ''}`
}

export function normalizeResourceUrl(url) {
  const text = String(url || '').trim()
  if (!text) return ''
  if (text.startsWith('db://') || text.startsWith('local:')) return text

  try {
    const parsed = new URL(text, window.location.origin)
    const isTargetMinioUrl = parsed.protocol === 'http:'
      && parsed.hostname === '120.53.92.66'
      && parsed.port === '9000'
      && parsed.pathname.startsWith(`/${MINIO_BUCKET}/`)
    if (isTargetMinioUrl) {
      return proxiedMinioPath(parsed.pathname.replace(/^\/+/, ''), parsed.search)
    }
    return parsed.href
  } catch {
    return text
  }
}

export function youtubeThumbnailUrl(sourceUrl) {
  try {
    const parsed = new URL(sourceUrl)
    let videoId = ''
    if (['youtube.com', 'www.youtube.com', 'm.youtube.com'].includes(parsed.hostname)) {
      videoId = parsed.searchParams.get('v') || ''
    } else if (['youtu.be', 'www.youtu.be'].includes(parsed.hostname)) {
      videoId = parsed.pathname.replace(/^\/+/, '').split('/')[0] || ''
    }
    return videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : ''
  } catch {
    return ''
  }
}

export function isWatchUrl(value) {
  try {
    const parsed = new URL(value)
    return ['youtube.com', 'www.youtube.com', 'm.youtube.com'].includes(parsed.hostname) && parsed.pathname === '/watch'
  } catch {
    return /^https?:\/\/(www\.)?youtube\.com\/watch\b/.test(value)
  }
}

export function kindForName(name) {
  const lower = String(name || '').toLowerCase().split('?')[0]
  if (/\.(mp4|mov|m4v|webm)$/.test(lower)) return 'video'
  if (/\.(wav|mp3|m4a|aac|flac|ogg|webm)$/.test(lower)) return 'audio'
  if (/\.(png|jpg|jpeg|webp|gif)$/.test(lower)) return 'image'
  if (/\.json$/.test(lower)) return 'json'
  return 'file'
}

export function kindForField(fieldName, name) {
  const lowerField = String(fieldName || '').toLowerCase()
  if (lowerField.includes('audio') || lowerField.includes('wav')) return 'audio'
  if (lowerField.includes('video')) return 'video'
  if (lowerField.includes('thumbnail') || lowerField.includes('cover')) return 'image'
  return kindForName(name)
}
