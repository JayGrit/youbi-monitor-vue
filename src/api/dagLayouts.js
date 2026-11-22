const requests = new Map()
const base = `${import.meta.env.BASE_URL}distributor-api/dag-layouts`

async function request(path, taskType, options) {
  const query = taskType ? `?${new URLSearchParams({ taskType })}` : ''
  const response = await fetch(base + path + query, options)
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(payload.message || `布局请求失败（HTTP ${response.status}）`)
  return payload
}

export function loadDagLayout(taskType) {
  const cached = requests.get(taskType)
  if (cached && cached.expires > Date.now()) return cached.promise
  const entry = { expires: Date.now() + 30000 }
  entry.promise = request('', taskType).then(payload => payload.layout).catch(() => {
    if (requests.get(taskType) === entry) requests.delete(taskType)
    return null
  })
  requests.set(taskType, entry)
  return entry.promise
}

export function loadDagLayoutTypes() {
  return request('/types')
}

export function loadDagLayoutTemplate(taskType) {
  return request('/template', taskType)
}

export async function saveDagLayout(taskType, layout) {
  const payload = await request('', taskType, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(layout),
  })
  requests.set(taskType, { expires: Date.now() + 30000, promise: Promise.resolve(payload.layout) })
  return payload.layout
}
