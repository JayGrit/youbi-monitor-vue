import { postJson, requestJson } from './http'

export function createOperatorApi(baseUrl, service = 'operator') {
  const normalizedBaseUrl = String(baseUrl || '').replace(/\/+$/, '')
  const context = { service }
  const describe = summary => ({ ...context, summary })

  return {
    submitTask(payload) {
      return postJson(
        `${normalizedBaseUrl}/tasks`,
        payload,
        describe('提交 operator 任务'),
      )
    },
    task(opId) {
      return requestJson(
        `${normalizedBaseUrl}/tasks/${encodeURIComponent(opId)}`,
        undefined,
        describe('查询 operator 任务状态'),
      )
    },
  }
}
