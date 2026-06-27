import { postJson, requestJson } from './http'

function genericPlatformAccountApi(apiBase, platform) {
  const base = `${apiBase}/accounts/${platform}`
  return {
    refresh(accountKey) {
      return requestJson(`${base}/${encodeURIComponent(accountKey)}`)
    },
    saveKey(accountKey, newAccountKey) {
      return postJson(`${base}/${encodeURIComponent(accountKey)}/key`, { newAccountKey })
    },
    setEnabled(accountKey, enabled) {
      return postJson(`${base}/${encodeURIComponent(accountKey)}/enabled`, { enabled })
    },
    setCooldown(accountKey, minSeconds, maxSeconds) {
      return postJson(`${base}/${encodeURIComponent(accountKey)}/cooldown`, { minSeconds, maxSeconds })
    },
    setNextUploadAllowedAt(accountKey, nextUploadAllowedAt) {
      return postJson(`${base}/${encodeURIComponent(accountKey)}/next-upload-allowed-at`, { nextUploadAllowedAt })
    },
    setQuietTime(accountKey, startTime, endTime) {
      return postJson(`${base}/${encodeURIComponent(accountKey)}/quiet-time`, { startTime, endTime })
    },
    setDownloaderMaxStagedCount(accountKey, maxStagedCount) {
      return postJson(`${base}/${encodeURIComponent(accountKey)}/downloader-max-staged-count`, { maxStagedCount })
    },
    updateProfile(accountKey, displayName) {
      return postJson(`${base}/${encodeURIComponent(accountKey)}/profile`, { displayName })
    },
    uploadAvatar(accountKey, file) {
      const form = new FormData()
      form.append('file', file)
      return requestJson(`${base}/${encodeURIComponent(accountKey)}/avatar`, {
        method: 'POST',
        body: form,
      })
    },
  }
}

export function createAccountsApi(apiBase, distributorApiBase = apiBase) {
  const managedAccountApi = platform => genericPlatformAccountApi(apiBase, platform)

  return {
    overview() {
      return requestJson(`${apiBase}/accounts/overview`)
    },
    backupperStatus() {
      return requestJson(`${apiBase}/accounts/backupper-status`)
    },
    uploadBackfillCandidates(platform, accountKey, type) {
      const params = new URLSearchParams({ platform, accountKey, type })
      return requestJson(`${distributorApiBase}/upload-backfill/candidates?${params.toString()}`)
    },
    registerUploadBackfill(platform, accountKey, type, taskIds) {
      return postJson(`${distributorApiBase}/upload-backfill/register`, { platform, accountKey, type, taskIds })
    },
    uploaderPhones() {
      return requestJson(`${apiBase}/uploader-phones`)
    },
    updateUploaderPhoneAccount(phoneId, platform, accountId, note, disabled = false) {
      return postJson(`${apiBase}/uploader-phones/${encodeURIComponent(phoneId)}/platform/${encodeURIComponent(platform)}`, { accountId, note, disabled })
    },
    bilibili: managedAccountApi('bilibili'),
    xiaohongshu: managedAccountApi('xiaohongshu'),
    shipinhao: managedAccountApi('shipinhao'),
    douyin: managedAccountApi('douyin'),
    kuaishou: managedAccountApi('kuaishou'),
    jinritoutiao: managedAccountApi('jinritoutiao'),
    x: managedAccountApi('x'),
    youtube: managedAccountApi('youtube'),
  }
}
