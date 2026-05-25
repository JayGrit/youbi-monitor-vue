export function pad2(value) {
  return String(value).padStart(2, '0')
}

export function formatDuration(seconds) {
  const total = Math.max(0, Math.round(Number(seconds || 0)))
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const secs = total % 60
  if (hours > 0) {
    return `${hours}:${pad2(minutes)}:${pad2(secs)}`
  }
  return `${minutes}:${pad2(secs)}`
}

export function formatDateTime(value) {
  if (!value) return '-'
  return String(value).replace('T', ' ').slice(0, 19)
}

export function formatNumber(value) {
  const number = Number(value)
  if (!Number.isFinite(number)) return '-'
  return new Intl.NumberFormat('zh-CN').format(number)
}

export function parseLocalDateTime(value) {
  if (!value) {
    return null
  }
  const normalized = typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)
    ? value
    : String(value).replace(' ', 'T')
  const date = new Date(normalized)
  return Number.isNaN(date.getTime()) ? null : date
}

export function isSameDate(left, right) {
  return left.getFullYear() === right.getFullYear()
    && left.getMonth() === right.getMonth()
    && left.getDate() === right.getDate()
}

export function formatTime(date) {
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`
}
