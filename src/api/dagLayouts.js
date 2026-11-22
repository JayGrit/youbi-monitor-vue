const requests = new Map()

export function loadDagLayout(taskType) {
  if (!requests.has(taskType)) {
    const query = new URLSearchParams({ taskType })
    const request = fetch(`${import.meta.env.BASE_URL}distributor-api/dag-layouts?${query}`)
      .then(response => {
        if (!response.ok) throw new Error(`DAG layout HTTP ${response.status}`)
        return response.json()
      })
      .then(payload => payload.layout)
      .catch(() => {
        requests.delete(taskType)
        return null
      })
    requests.set(taskType, request)
  }
  return requests.get(taskType)
}
