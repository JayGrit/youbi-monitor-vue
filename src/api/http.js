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
  return payload?.message || payload?.detail || payload?.error || payload?.title || `HTTP ${status}`
}

export async function requestJson(url, options) {
  const response = await fetch(url, options)
  const payload = await readJsonResponse(response)
  if (!response.ok) {
    throw new Error(apiErrorMessage(payload, response.status))
  }
  return payload
}

export async function postJson(url, body) {
  return requestJson(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}
