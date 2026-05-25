import { postJson, requestJson } from './http'

function platformAccountApi(apiBase, platform, accountsPath) {
  const base = `${apiBase}/${platform}`

  return {
    list() {
      return requestJson(`${apiBase}/${accountsPath}`)
    },

    startQrLogin(accountKey) {
      return requestJson(`${base}/account/qrcode?accountKey=${encodeURIComponent(accountKey)}`, { method: 'POST' })
    },

    pollQrLogin(accountKey, authCode) {
      return requestJson(
        `${base}/account/${encodeURIComponent(accountKey)}/qrcode/${encodeURIComponent(authCode)}/poll`,
        { method: 'POST' },
      )
    },

    refresh(accountKey) {
      return requestJson(`${base}/account?accountKey=${encodeURIComponent(accountKey)}`)
    },

    saveKey(accountKey, newAccountKey) {
      return postJson(`${base}/account/${encodeURIComponent(accountKey)}/key`, { newAccountKey })
    },
  }
}

export function createAccountsApi(apiBase) {
  return {
    bilibili: {
      ...platformAccountApi(apiBase, 'bilibili', 'bilibili/accounts'),
      renew(accountKey) {
        return requestJson(`${apiBase}/bilibili/account/renew?accountKey=${encodeURIComponent(accountKey)}`, { method: 'POST' })
      },
    },
    xiaohongshu: platformAccountApi(apiBase, 'xiaohongshu', 'xiaohongshu/accounts'),
    douyin: {
      ...platformAccountApi(apiBase, 'douyin', 'douyin/cdp-sessions'),
      saveCdpSession(payload) {
        return postJson(`${apiBase}/douyin/cdp-sessions`, payload)
      },
    },
  }
}
