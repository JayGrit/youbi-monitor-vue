import { postJson } from './http'

const DEFAULT_AGENT_BASE_URL = 'http://127.0.0.1:8765'

export function createAgentApi(baseUrl = import.meta.env.VITE_AGENT_BASE_URL || DEFAULT_AGENT_BASE_URL) {
  const normalizedBaseUrl = String(baseUrl).replace(/\/+$/, '')

  return {
    runAccountScript(platform, action, accountKey) {
      return postJson(
        `${normalizedBaseUrl}/api/accounts/${encodeURIComponent(platform)}/${encodeURIComponent(action)}`,
        { accountKey },
      )
    },
  }
}
