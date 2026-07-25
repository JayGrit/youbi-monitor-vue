export async function readJsonResponse(response) {
  const text = await response.text()
  try {
    return text ? JSON.parse(text) : null
  } catch (err) {
    const preview = text.replace(/\s+/g, ' ').trim().slice(0, 180)
    throw new Error(preview || `HTTP ${response.status}`)
  }
}

export function apiErrorMessage(payload, status) {
  if (payload?.error && typeof payload.error === 'object') {
    return [payload.error.code, payload.error.message].filter(Boolean).join(' ') || `HTTP ${status}`
  }
  return payload?.message || payload?.detail || payload?.error || payload?.title || `HTTP ${status}`
}

function padTimePart(value) {
  return String(value).padStart(2, '0')
}

function formatLogTime(date = new Date()) {
  return [
    padTimePart(date.getHours()),
    padTimePart(date.getMinutes()),
    padTimePart(date.getSeconds()),
  ].join(':')
}

function inferServiceName(url) {
  const text = String(url || '')
  if (text.includes('/monitor/distributor-api')) return 'distributor'
  if (text.includes('/monitor/submitter-api')) return 'submitter'
  if (text.includes('/monitor/backupper-api')) return 'backupper'
  if (text.includes('/monitor/api')) return 'monitor'
  if (text.includes('127.0.0.1:8765') || text.includes('localhost:8765')) return 'agent'
  return 'backend'
}

function logTitle(prefix, summary) {
  return `${prefix} ${summary || '后端请求'}`
}

function logRequestStart({ service, url, startTime, summary }) {
  console.info(logTitle('[backend-request]', summary), {
    service,
    url,
    startTime,
  })
}

function logRequestEnd({ service, url, endTime, durationMs, status, ok, errorMessage, summary }) {
  const logger = ok ? console.info : console.error
  const details = {
    service,
    status,
    url,
    result: ok ? 'success' : 'failure',
    endTime,
    durationMs,
  }
  if (errorMessage) details.errorMessage = errorMessage
  logger(logTitle('[backend-response]', summary), details)
}

export async function requestJson(url, options = {}, context = {}) {
  const service = context.service || inferServiceName(url)
  const summary = context.summary || ''
  const startedAt = performance.now()
  logRequestStart({ service, url, startTime: formatLogTime(), summary })

  let response = null
  let payload = null
  try {
    response = await fetch(url, options)
    payload = await readJsonResponse(response)
    const accepted = typeof context.acceptResponse === 'function'
      ? Boolean(context.acceptResponse(response, payload))
      : false
    if (!response.ok && !accepted) {
      throw new Error(apiErrorMessage(payload, response.status))
    }
    logRequestEnd({
      service,
      url,
      endTime: formatLogTime(),
      durationMs: Math.round(performance.now() - startedAt),
      status: response.status,
      ok: true,
      summary,
    })
    return payload
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err)
    logRequestEnd({
      service,
      url,
      endTime: formatLogTime(),
      durationMs: Math.round(performance.now() - startedAt),
      status: response?.status || 0,
      ok: false,
      errorMessage,
      summary,
    })
    throw err
  }
}

export async function postJson(url, body, context) {
  return requestJson(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }, context)
}
