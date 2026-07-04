import { postJson, requestJson } from './http'

const DEFAULT_AGENT_BASE_URL = 'http://127.0.0.1:8765'

export function createAgentApi(baseUrl = import.meta.env.VITE_AGENT_BASE_URL || DEFAULT_AGENT_BASE_URL, service = 'agent') {
  const normalizedBaseUrl = String(baseUrl).replace(/\/+$/, '')
  const context = { service }
  const describe = summary => ({ ...context, summary })

  return {
    standaloneAccounts() {
      return requestJson(`${normalizedBaseUrl}/api/accounts/standalone`, undefined, describe('加载本机账号'))
    },
    runAccountScript(platform, action, accountKey) {
      return postJson(
        `${normalizedBaseUrl}/api/accounts/${encodeURIComponent(platform)}/${encodeURIComponent(action)}`,
        { accountKey },
        describe('执行账号脚本'),
      )
    },
  }
}
