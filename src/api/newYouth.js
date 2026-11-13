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

export function loadScheduledNewYouthUploads() {
  return requestJson(`${import.meta.env.BASE_URL}distributor-api/uploads/scheduled?taskType=podcast_new`, undefined, {
    service: 'distributor', summary: '查询定时发表视频',
  })
}

export function scheduleNewYouthUpload(taskId, startAt) {
  return requestJson(`${import.meta.env.BASE_URL}distributor-api/tasks/${encodeURIComponent(taskId)}/upload-schedule`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ startAt }),
  }, { service: 'distributor', summary: '设置定时发表' })
}

export function cancelNewYouthUploadSchedule(taskId) {
  return requestJson(`${import.meta.env.BASE_URL}distributor-api/tasks/${encodeURIComponent(taskId)}/upload-schedule`, {
    method: 'DELETE',
  }, { service: 'distributor', summary: '取消定时发表' })
}
