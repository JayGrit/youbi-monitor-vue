export function formatJson(value) {
  if (value === null || value === undefined || value === '') return ''
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return ''
    try {
      return JSON.stringify(JSON.parse(trimmed), null, 2)
    } catch {
      return trimmed
    }
  }
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

export function fieldValueText(value) {
  if (value === null || value === undefined || value === '') return '-'
  if (typeof value === 'object') return formatJson(value)
  return String(value)
}

export function shortValue(value, max = 180) {
  const text = fieldValueText(value)
  return text.length > max ? `${text.slice(0, max)}...` : text
}

export function looksJson(value) {
  const text = String(value || '').trim()
  return (text.startsWith('{') && text.endsWith('}')) || (text.startsWith('[') && text.endsWith(']'))
}

export function isLongValue(value) {
  const text = fieldValueText(value)
  return text.length > 120 || text.includes('\n') || looksJson(text)
}
