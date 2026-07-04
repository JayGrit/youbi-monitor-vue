import { postJson, requestJson } from './http'

function genericPlatformAccountApi(apiBase, platform, context) {
  const base = `${apiBase}/accounts/${platform}`
  const describe = summary => ({ ...context, summary })
  return {
    refresh(accountKey) {
      return requestJson(`${base}/${encodeURIComponent(accountKey)}`, undefined, describe('刷新平台账号实时状态'))
    },
    saveKey(accountKey, newAccountKey) {
      return postJson(`${base}/${encodeURIComponent(accountKey)}/key`, { newAccountKey }, describe('保存平台账号登录标识'))
    },
    setEnabled(accountKey, enabled) {
      return postJson(`${base}/${encodeURIComponent(accountKey)}/enabled`, { enabled }, describe('切换平台账号启用状态'))
    },
    setCooldown(accountKey, minSeconds, maxSeconds) {
      return postJson(`${base}/${encodeURIComponent(accountKey)}/cooldown`, { minSeconds, maxSeconds }, describe('保存账号投稿冷却区间'))
    },
    setNextUploadAllowedAt(accountKey, nextUploadAllowedAt) {
      return postJson(`${base}/${encodeURIComponent(accountKey)}/next-upload-allowed-at`, { nextUploadAllowedAt }, describe('保存账号下次可投时间'))
    },
    setQuietTime(accountKey, startTime, endTime) {
      return postJson(`${base}/${encodeURIComponent(accountKey)}/quiet-time`, { startTime, endTime }, describe('保存账号静默投稿时段'))
    },
    setDownloaderMaxStagedCount(accountKey, maxStagedCount) {
      return postJson(`${base}/${encodeURIComponent(accountKey)}/downloader-max-staged-count`, { maxStagedCount }, describe('保存下载暂存任务上限'))
    },
    updateProfile(accountKey, displayName) {
      return postJson(`${base}/${encodeURIComponent(accountKey)}/profile`, { displayName }, describe('更新平台账号展示名'))
    },
    uploadAvatar(accountKey, file) {
      const form = new FormData()
      form.append('file', file)
      return requestJson(`${base}/${encodeURIComponent(accountKey)}/avatar`, {
        method: 'POST',
        body: form,
      }, describe('上传平台账号头像文件'))
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
      return requestJson(`${apiBase}/accounts/overview`, undefined, monitor('查询平台账号总览矩阵'))
    },
    overviewStats() {
      return requestJson(`${apiBase}/accounts/overview/stats`, undefined, monitor('查询平台账号统计汇总'))
    },
    backupperStatus() {
      return requestJson(`${apiBase}/accounts/backupper-status`, undefined, monitor('查询账号备份服务状态'))
    },
    uploadBackfillCandidates(platform, accountKey, type) {
      const params = new URLSearchParams({ platform, accountKey, type })
      return requestJson(`${distributorApiBase}/upload-backfill/candidates?${params.toString()}`, undefined, distributor('查询账号补投候选任务'))
    },
    registerUploadBackfill(platform, accountKey, type, taskIds) {
      return postJson(`${distributorApiBase}/upload-backfill/register`, { platform, accountKey, type, taskIds }, distributor('登记账号补投任务'))
    },
    uploaderPhones() {
      return requestJson(`${apiBase}/uploader-phones`, undefined, monitor('查询上传手机账号矩阵'))
    },
    updateUploaderPhoneAccount(phoneId, platform, accountId, note, disabled = false) {
      return postJson(`${apiBase}/uploader-phones/${encodeURIComponent(phoneId)}/platform/${encodeURIComponent(platform)}`, { accountId, note, disabled }, monitor('保存手机平台账号绑定'))
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
