import { requestJson } from './http'

export function loadNewYouthOverview() {
  return requestJson(`${import.meta.env.BASE_URL}api/newyouth/overview`, undefined, {
    service: 'monitor',
    summary: '查询新青年播客增长',
  })
}
