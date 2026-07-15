import {
  accountAvatarInitial,
  accountAvatarUrl,
  accountCountText,
  accountDisplay,
  accountRows,
  cooldownText,
  nextSendText,
  qrImageUrl,
  rowKey,
  rowStatus,
} from './accounts/accountUtils'
import { usePlatformAccounts } from './accounts/usePlatformAccounts'
import { usePlatformIcons } from './accounts/usePlatformIcons'
import { useUploadBackfill } from './accounts/useUploadBackfill'
import { useUploaderPhones } from './accounts/useUploaderPhones'
import { ref } from 'vue'

export function useAccounts(accountsApi, agentApi, accountPlatforms, platformIconUrls, serverApi = null) {
  let accountTimer = null

  const platformAccounts = usePlatformAccounts(accountsApi, accountPlatforms)
  const uploaderPhones = useUploaderPhones(accountsApi, agentApi)
  const backupperDiskStatus = ref(null)
  const backupperDiskStatusText = ref('')
  const uploadIncompleteReport = ref(null)
  const uploadIncompleteReportLoading = ref(false)
  const uploadIncompleteReportError = ref('')

  async function loadAccountPage() {
    await Promise.allSettled([
      platformAccounts.loadAccountOverview(),
      uploaderPhones.loadUploaderPhones(),
      uploaderPhones.loadStandaloneAccounts(),
      loadBackupperStatus(),
    ])
  }

  async function loadBackupperStatus() {
    const status = await accountsApi.backupperStatus()
    backupperDiskStatus.value = status || null
    backupperDiskStatusText.value = status?.statusText || ''
  }

  async function generateUploadIncompleteReport() {
    if (!serverApi?.generateUploadIncompleteReport) return
    uploadIncompleteReportLoading.value = true
    uploadIncompleteReportError.value = ''
    try {
      uploadIncompleteReport.value = await serverApi.generateUploadIncompleteReport()
    } catch (err) {
      uploadIncompleteReportError.value = err instanceof Error ? err.message : String(err)
    } finally {
      uploadIncompleteReportLoading.value = false
    }
  }

  function startAccountPolling() {
    clearAccountPagePolling()
    loadAccountPage()
    platformAccounts.resumeQrPolling()
    accountTimer = window.setInterval(loadAccountPage, 30000)
  }

  function clearAccountPagePolling() {
    if (accountTimer) {
      window.clearInterval(accountTimer)
      accountTimer = null
    }
  }

  function clearAccountPolling() {
    clearAccountPagePolling()
    platformAccounts.clearQrPolling()
  }

  const uploadBackfill = useUploadBackfill(accountsApi, loadAccountPage)
  const { warmPlatformIcons } = usePlatformIcons(platformIconUrls)
  const { platformState } = platformAccounts

  return {
    bilibiliAccount: platformState.bilibili.account,
    bilibiliAccounts: platformState.bilibili.accounts,
    bilibiliRows: platformState.bilibili.rows,
    bilibiliError: platformState.bilibili.error,
    bilibiliQrCode: platformState.bilibili.qrCode,
    bilibiliQrMessage: platformState.bilibili.qrMessage,
    bilibiliRenewing: platformAccounts.bilibiliRenewing,
    bilibiliBusyKey: platformState.bilibili.busyKey,
    xiaohongshuAccount: platformState.xiaohongshu.account,
    xiaohongshuAccounts: platformState.xiaohongshu.accounts,
    xiaohongshuRows: platformState.xiaohongshu.rows,
    xiaohongshuError: platformState.xiaohongshu.error,
    xiaohongshuQrCode: platformState.xiaohongshu.qrCode,
    xiaohongshuQrMessage: platformState.xiaohongshu.qrMessage,
    xiaohongshuBusyKey: platformState.xiaohongshu.busyKey,
    douyinAccount: platformState.douyin.account,
    douyinAccounts: platformState.douyin.accounts,
    douyinRows: platformState.douyin.rows,
    douyinError: platformState.douyin.error,
    douyinQrCode: platformState.douyin.qrCode,
    douyinQrMessage: platformState.douyin.qrMessage,
    douyinBusyKey: platformState.douyin.busyKey,
    shipinhaoAccount: platformState.shipinhao.account,
    shipinhaoAccounts: platformState.shipinhao.accounts,
    shipinhaoRows: platformState.shipinhao.rows,
    shipinhaoError: platformState.shipinhao.error,
    shipinhaoBusyKey: platformState.shipinhao.busyKey,
    kuaishouAccount: platformState.kuaishou.account,
    kuaishouAccounts: platformState.kuaishou.accounts,
    kuaishouRows: platformState.kuaishou.rows,
    kuaishouError: platformState.kuaishou.error,
    kuaishouBusyKey: platformState.kuaishou.busyKey,
    jinritoutiaoAccount: platformState.jinritoutiao.account,
    jinritoutiaoAccounts: platformState.jinritoutiao.accounts,
    jinritoutiaoRows: platformState.jinritoutiao.rows,
    jinritoutiaoError: platformState.jinritoutiao.error,
    jinritoutiaoBusyKey: platformState.jinritoutiao.busyKey,
    accountKeyGroups: platformAccounts.accountKeyGroups,
    backupperDiskStatus,
    backupperDiskStatusText,
    uploadIncompleteReport,
    uploadIncompleteReportLoading,
    uploadIncompleteReportError,
    generateUploadIncompleteReport,
    ...uploadBackfill,
    ...uploaderPhones,
    loadAccountPage,
    startAccountPolling,
    clearAccountPagePolling,
    clearAccountPolling,
    loadUploaderPhones: uploaderPhones.loadUploaderPhones,
    saveUploaderPhoneAccount: uploaderPhones.saveUploaderPhoneAccount,
    runUploaderPhoneAccountScript: uploaderPhones.runUploaderPhoneAccountScript,
    startBilibiliQrLogin: row => platformAccounts.startPlatformLogin('bilibili', row),
    renewBilibiliAccount: platformAccounts.renewBilibiliAccount,
    refreshBilibiliRow: row => platformAccounts.refreshPlatformRow('bilibili', row),
    saveBilibiliKey: row => platformAccounts.savePlatformKey('bilibili', row),
    startXiaohongshuQrLogin: row => platformAccounts.startPlatformLogin('xiaohongshu', row),
    refreshXiaohongshuRow: row => platformAccounts.refreshPlatformRow('xiaohongshu', row),
    saveXiaohongshuKey: row => platformAccounts.savePlatformKey('xiaohongshu', row),
    startDouyinQrLogin: row => platformAccounts.startPlatformLogin('douyin', row),
    refreshDouyinRow: row => platformAccounts.refreshPlatformRow('douyin', row),
    saveDouyinKey: row => platformAccounts.savePlatformKey('douyin', row),
    saveShipinhaoKey: row => platformAccounts.savePlatformKey('shipinhao', row),
    saveKuaishouKey: row => platformAccounts.savePlatformKey('kuaishou', row),
    saveJinritoutiaoKey: row => platformAccounts.savePlatformKey('jinritoutiao', row),
    togglePlatformEnabled: platformAccounts.togglePlatformEnabled,
    savePlatformCooldown: platformAccounts.savePlatformCooldown,
    savePlatformQuietTime: platformAccounts.savePlatformQuietTime,
    savePlatformDownloaderMaxStagedCount: platformAccounts.savePlatformDownloaderMaxStagedCount,
    savePlatformNextUploadAllowedAt: platformAccounts.savePlatformNextUploadAllowedAt,
    savePlatformAccountProfile: platformAccounts.savePlatformAccountProfile,
    uploadPlatformAccountAvatar: platformAccounts.uploadPlatformAccountAvatar,
    accountRows,
    nextSendText,
    accountCountText,
    cooldownText,
    rowKey,
    rowStatus,
    accountDisplay,
    accountAvatarUrl,
    accountAvatarInitial,
    platformBusyKey: platformAccounts.platformBusyKey,
    platformBusyAction: platformAccounts.platformBusyAction,
    platformErrorText: platformAccounts.platformErrorText,
    startPlatformLogin: platformAccounts.startPlatformLogin,
    savePlatformKey: platformAccounts.savePlatformKey,
    warmPlatformIcons,
    qrImageUrl,
  }
}
