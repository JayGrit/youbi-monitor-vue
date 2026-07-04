import { postJson, requestJson } from './http'

function genericPlatformAccountApi(apiBase, platform, context) {
  const base = `${apiBase}/accounts/${platform}`
  return {
    refresh(accountKey) {
      return requestJson(`${base}/${encodeURIComponent(accountKey)}`, undefined, context)
    },
    saveKey(accountKey, newAccountKey) {
      return postJson(`${base}/${encodeURIComponent(accountKey)}/key`, { newAccountKey }, context)
    },
    setEnabled(accountKey, enabled) {
      return postJson(`${base}/${encodeURIComponent(accountKey)}/enabled`, { enabled }, context)
    },
    setCooldown(accountKey, minSeconds, maxSeconds) {
      return postJson(`${base}/${encodeURIComponent(accountKey)}/cooldown`, { minSeconds, maxSeconds }, context)
    },
    setNextUploadAllowedAt(accountKey, nextUploadAllowedAt) {
      return postJson(`${base}/${encodeURIComponent(accountKey)}/next-upload-allowed-at`, { nextUploadAllowedAt }, context)
    },
    setQuietTime(accountKey, startTime, endTime) {
      return postJson(`${base}/${encodeURIComponent(accountKey)}/quiet-time`, { startTime, endTime }, context)
    },
    setDownloaderMaxStagedCount(accountKey, maxStagedCount) {
      return postJson(`${base}/${encodeURIComponent(accountKey)}/downloader-max-staged-count`, { maxStagedCount }, context)
    },
    updateProfile(accountKey, displayName) {
      return postJson(`${base}/${encodeURIComponent(accountKey)}/profile`, { displayName }, context)
    },
    uploadAvatar(accountKey, file) {
      const form = new FormData()
      form.append('file', file)
      return requestJson(`${base}/${encodeURIComponent(accountKey)}/avatar`, {
        method: 'POST',
        body: form,
      }, context)
    },
  }
}

export function createAccountsApi(apiBase, distributorApiBase = apiBase, services = {}) {
  const monitorContext = { service: services.monitor || 'monitor' }
  const distributorContext = { service: services.distributor || 'distributor' }
  const managedAccountApi = platform => genericPlatformAccountApi(apiBase, platform, monitorContext)

  return {
    overview() {
      return requestJson(`${apiBase}/accounts/overview`, undefined, monitorContext)
    },
    overviewStats() {
      return requestJson(`${apiBase}/accounts/overview/stats`, undefined, monitorContext)
    },
    backupperStatus() {
      return requestJson(`${apiBase}/accounts/backupper-status`, undefined, monitorContext)
    },
    uploadBackfillCandidates(platform, accountKey, type) {
      const params = new URLSearchParams({ platform, accountKey, type })
      return requestJson(`${distributorApiBase}/upload-backfill/candidates?${params.toString()}`, undefined, distributorContext)
    },
    registerUploadBackfill(platform, accountKey, type, taskIds) {
      return postJson(`${distributorApiBase}/upload-backfill/register`, { platform, accountKey, type, taskIds }, distributorContext)
    },
    uploaderPhones() {
      return requestJson(`${apiBase}/uploader-phones`, undefined, monitorContext)
    },
    updateUploaderPhoneAccount(phoneId, platform, accountId, note, disabled = false) {
      return postJson(`${apiBase}/uploader-phones/${encodeURIComponent(phoneId)}/platform/${encodeURIComponent(platform)}`, { accountId, note, disabled }, monitorContext)
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
