import { requestJson } from './http'

export function loadNewYouthOverview() {
  return requestJson(`${import.meta.env.BASE_URL}api/newyouth/overview`, undefined, {
    service: 'monitor',
    summary: '查询新青年播客增长',
  })
}

export function loadPendingNewYouthUploads() {
  return requestJson(`${import.meta.env.BASE_URL}distributor-api/uploads/pending?taskType=podcast_new`, undefined, {
    service: 'distributor',
    summary: '查询待发表新青年视频',
  })
}

export function releaseNewYouthUpload(taskId) {
  return requestJson(`${import.meta.env.BASE_URL}distributor-api/tasks/${encodeURIComponent(taskId)}/release-upload`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
  }, { service: 'distributor', summary: '发表选中的新青年视频' })
}
