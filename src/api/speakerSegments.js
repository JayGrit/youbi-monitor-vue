import { requestJson } from './http'

export function createSpeakerSegmentsApi(apiBase, service = 'monitor') {
  const base = `${apiBase}/speaker`
  const context = { service }
  const describe = summary => ({ ...context, summary })

  function queryString(params) {
    const search = new URLSearchParams()
    Object.entries(params || {}).forEach(([key, value]) => {
      if (value !== undefined && value !== null && String(value).trim() !== '') {
        search.set(key, String(value).trim())
      }
    })
    const text = search.toString()
    return text ? `?${text}` : ''
  }

  return {
    listSegments(params) {
      return requestJson(`${base}/segments${queryString(params)}`, undefined, describe('查询配音段队列'))
    },
  }
}
