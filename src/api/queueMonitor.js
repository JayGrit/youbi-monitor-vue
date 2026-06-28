import { requestJson } from './http'

export function createQueueMonitorApi(apiBase, serviceName) {
  const base = `${apiBase}/${serviceName}`

  function queryString(params) {
    const search = new URLSearchParams()
    Object.entries(params || {}).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        value.filter(Boolean).forEach(item => search.append(key, item))
      } else if (value !== undefined && value !== null && String(value).trim() !== '') {
        search.set(key, String(value).trim())
      }
    })
    const text = search.toString()
    return text ? `?${text}` : ''
  }

  return {
    listQueue(params) {
      return requestJson(`${base}/queue${queryString(params)}`)
    },
  }
}
