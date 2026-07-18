import { postJson, requestJson } from './http'

const DEFAULT_AGENT_BASE_URL = 'http://127.0.0.1:8765'

export function createAgentApi(baseUrl = import.meta.env.VITE_AGENT_BASE_URL || DEFAULT_AGENT_BASE_URL, service = 'agent') {
  const normalizedBaseUrl = String(baseUrl).replace(/\/+$/, '')
  const context = { service }
  const describe = summary => ({ ...context, summary })
  const accountScriptUrl = (platform, action) => `${normalizedBaseUrl}/api/accounts/${encodeURIComponent(platform)}/${encodeURIComponent(action)}`

  return {
    standaloneAccounts() {
      return requestJson(`${normalizedBaseUrl}/api/accounts/standalone`, undefined, describe('查询本机独立账号状态'))
    },
    runAccountScript(platform, action, topic) {
      return postJson(
        accountScriptUrl(platform, action),
        { topic },
        describe('执行本机账号维护脚本'),
      )
    },
    accountScriptStatus(platform, action, topic) {
      const query = new URLSearchParams({ topic: String(topic || '') })
      return requestJson(
        `${accountScriptUrl(platform, action)}/status?${query.toString()}`,
        undefined,
        describe('查询本机账号维护脚本状态'),
      )
    },
    updateYoutubeCookies() {
      return postJson(
        accountScriptUrl('youtube', 'cookies'),
        { topic: 'default' },
        describe('更新 YouTube 下载 Cookie'),
      )
    },
  }
}
