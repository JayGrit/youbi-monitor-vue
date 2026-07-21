const MINIO_PROXY_BASE = `${import.meta.env.BASE_URL}minio`
const MINIO_BUCKET = 'ydbi'
const MINIO_CONSOLE_BASE = 'http://120.53.92.66:9001/'
const API_BASE = `${import.meta.env.BASE_URL}api`

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
    const isTargetMinioUrl = parsed.origin !== window.location.origin
      && parsed.pathname.startsWith(`/${MINIO_BUCKET}/`)
      && (
        parsed.hostname === '120.53.92.66'
        || parsed.port === '9000'
      )
    if (isTargetMinioUrl) {
      return proxiedMinioPath(parsed.pathname.replace(/^\/+/, ''), parsed.search)
    }
    return parsed.href
  } catch {
    return text
  }
}

export function minioConsoleFolderUrl(url) {
  const text = String(url || '').trim()
  if (!text) return ''
  try {
    const parsed = new URL(text, window.location.origin)
    const parts = parsed.pathname.replace(/^\/+/, '').split('/').filter(Boolean)
    const bucketIndex = parts.indexOf(MINIO_BUCKET)
    if (bucketIndex < 0 || bucketIndex >= parts.length - 1) return ''
    const objectParts = parts.slice(bucketIndex + 1)
    const folder = objectParts.slice(0, -1).join('/')
    if (!folder) return ''
    return `${MINIO_CONSOLE_BASE}browser/${MINIO_BUCKET}/${encodeURIComponent(`${folder}/`)}`
  } catch {
    return ''
  }
}

export function diagnosticArtifactUrl(row, kind) {
  const id = row?.id
  if (!id) return ''
  const path = kind === 'html'
    ? row.htmlProxyPath || row.html_proxy_path
    : row.screenshotProxyPath || row.screenshot_proxy_path
  const normalizedPath = String(path || `operator/diagnostics/${encodeURIComponent(id)}/${kind}`).replace(/^\/+/, '')
  return `${API_BASE}/${normalizedPath}`
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
