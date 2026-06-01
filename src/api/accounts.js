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

    setEnabled(accountKey, enabled) {
      return postJson(`${base}/account/${encodeURIComponent(accountKey)}/enabled`, { enabled })
    },

    setCooldown(accountKey, minSeconds, maxSeconds) {
      return postJson(`${base}/account/${encodeURIComponent(accountKey)}/cooldown`, { minSeconds, maxSeconds })
    },

    updateProfile(accountKey, displayName) {
      return postJson(`${base}/account/${encodeURIComponent(accountKey)}/profile`, { displayName })
    },

    uploadAvatar(accountKey, file) {
      const form = new FormData()
      form.append('file', file)
      return requestJson(`${base}/account/${encodeURIComponent(accountKey)}/avatar`, {
        method: 'POST',
        body: form,
      })
    },
  }
}

export function createAccountsApi(apiBase) {
  return {
    uploadBackfillCandidates(platform, accountKey, type) {
      const params = new URLSearchParams({ platform, accountKey, type })
      return requestJson(`${apiBase}/upload-backfill/candidates?${params.toString()}`)
    },
    registerUploadBackfill(platform, accountKey, type, taskIds) {
      return postJson(`${apiBase}/upload-backfill/register`, { platform, accountKey, type, taskIds })
    },
    bilibili: {
      ...platformAccountApi(apiBase, 'bilibili', 'bilibili/accounts'),
      renew(accountKey) {
        return requestJson(`${apiBase}/bilibili/account/renew?accountKey=${encodeURIComponent(accountKey)}`, { method: 'POST' })
      },
    },
    xiaohongshu: platformAccountApi(apiBase, 'xiaohongshu', 'xiaohongshu/accounts'),
    shipinhao: platformAccountApi(apiBase, 'shipinhao', 'shipinhao/accounts'),
    douyin: platformAccountApi(apiBase, 'douyin', 'douyin/accounts'),
    kuaishou: platformAccountApi(apiBase, 'kuaishou', 'kuaishou/accounts'),
    jinritoutiao: platformAccountApi(apiBase, 'jinritoutiao', 'jinritoutiao/accounts'),
  }
}
