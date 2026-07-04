import { postJson, requestJson } from './http'

function genericPlatformAccountApi(apiBase, platform, context) {
  const base = `${apiBase}/accounts/${platform}`
  const describe = summary => ({ ...context, summary })
  return {
    refresh(accountKey) {
      return requestJson(`${base}/${encodeURIComponent(accountKey)}`, undefined, describe('刷新平台账号'))
    },
    saveKey(accountKey, newAccountKey) {
      return postJson(`${base}/${encodeURIComponent(accountKey)}/key`, { newAccountKey }, describe('保存账号密钥'))
    },
    setEnabled(accountKey, enabled) {
      return postJson(`${base}/${encodeURIComponent(accountKey)}/enabled`, { enabled }, describe('切换账号启用'))
    },
    setCooldown(accountKey, minSeconds, maxSeconds) {
      return postJson(`${base}/${encodeURIComponent(accountKey)}/cooldown`, { minSeconds, maxSeconds }, describe('设置账号冷却'))
    },
    setNextUploadAllowedAt(accountKey, nextUploadAllowedAt) {
      return postJson(`${base}/${encodeURIComponent(accountKey)}/next-upload-allowed-at`, { nextUploadAllowedAt }, describe('设置下次投稿'))
    },
    setQuietTime(accountKey, startTime, endTime) {
      return postJson(`${base}/${encodeURIComponent(accountKey)}/quiet-time`, { startTime, endTime }, describe('设置静默时段'))
    },
    setDownloaderMaxStagedCount(accountKey, maxStagedCount) {
      return postJson(`${base}/${encodeURIComponent(accountKey)}/downloader-max-staged-count`, { maxStagedCount }, describe('设置暂存上限'))
    },
    updateProfile(accountKey, displayName) {
      return postJson(`${base}/${encodeURIComponent(accountKey)}/profile`, { displayName }, describe('更新账号资料'))
    },
    uploadAvatar(accountKey, file) {
      const form = new FormData()
      form.append('file', file)
      return requestJson(`${base}/${encodeURIComponent(accountKey)}/avatar`, {
        method: 'POST',
        body: form,
      }, describe('上传账号头像'))
    },
  }
}

export function createAccountsApi(apiBase, distributorApiBase = apiBase, services = {}) {
  const monitorContext = { service: services.monitor || 'monitor' }
  const distributorContext = { service: services.distributor || 'distributor' }
  const monitor = summary => ({ ...monitorContext, summary })
  const distributor = summary => ({ ...distributorContext, summary })
  const managedAccountApi = platform => genericPlatformAccountApi(apiBase, platform, monitorContext)

  return {
    overview() {
      return requestJson(`${apiBase}/accounts/overview`, undefined, monitor('加载账号总览'))
    },
    overviewStats() {
      return requestJson(`${apiBase}/accounts/overview/stats`, undefined, monitor('加载账号统计'))
    },
    backupperStatus() {
      return requestJson(`${apiBase}/accounts/backupper-status`, undefined, monitor('加载备份状态'))
    },
    uploadBackfillCandidates(platform, accountKey, type) {
      const params = new URLSearchParams({ platform, accountKey, type })
      return requestJson(`${distributorApiBase}/upload-backfill/candidates?${params.toString()}`, undefined, distributor('加载补投候选'))
    },
    registerUploadBackfill(platform, accountKey, type, taskIds) {
      return postJson(`${distributorApiBase}/upload-backfill/register`, { platform, accountKey, type, taskIds }, distributor('注册补投任务'))
    },
    uploaderPhones() {
      return requestJson(`${apiBase}/uploader-phones`, undefined, monitor('加载手机账号'))
    },
    updateUploaderPhoneAccount(phoneId, platform, accountId, note, disabled = false) {
      return postJson(`${apiBase}/uploader-phones/${encodeURIComponent(phoneId)}/platform/${encodeURIComponent(platform)}`, { accountId, note, disabled }, monitor('更新手机账号'))
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
