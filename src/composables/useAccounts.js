import { computed, ref } from 'vue'
import {
  formatTime,
  isSameDate,
  pad2,
  parseLocalDateTime,
} from '../utils/format'

import { normalizeAccountAvatarUrl } from '../utils/accountAvatar'

export function useAccounts(accountsApi, accountPlatforms, platformIconUrls) {
  const bilibiliAccount = ref(null)
  const bilibiliAccounts = ref([])
  const bilibiliRows = ref(accountRows([]))
  const bilibiliError = ref('')
  const bilibiliQrCode = ref(null)
  const bilibiliQrMessage = ref('')
  const bilibiliRenewing = ref(false)
  const bilibiliBusyKey = ref('')
  const xiaohongshuAccount = ref(null)
  const xiaohongshuAccounts = ref([])
  const xiaohongshuRows = ref(accountRows([]))
  const xiaohongshuError = ref('')
  const xiaohongshuQrCode = ref(null)
  const xiaohongshuQrMessage = ref('')
  const xiaohongshuBusyKey = ref('')
  const douyinAccount = ref(null)
  const douyinAccounts = ref([])
  const douyinRows = ref(accountRows([]))
  const douyinError = ref('')
  const douyinQrCode = ref(null)
  const douyinQrMessage = ref('')
  const douyinBusyKey = ref('')
  const shipinhaoAccount = ref(null)
  const shipinhaoAccounts = ref([])
  const shipinhaoRows = ref(accountRows([]))
  const shipinhaoError = ref('')
  const shipinhaoBusyKey = ref('')
  const kuaishouAccount = ref(null)
  const kuaishouAccounts = ref([])
  const kuaishouRows = ref(accountRows([]))
  const kuaishouError = ref('')
  const kuaishouBusyKey = ref('')
  const jinritoutiaoAccount = ref(null)
  const jinritoutiaoAccounts = ref([])
  const jinritoutiaoRows = ref(accountRows([]))
  const jinritoutiaoError = ref('')
  const jinritoutiaoBusyKey = ref('')
  const uploadBackfillOpen = ref(false)
  const uploadBackfillContext = ref(null)
  const uploadBackfillRows = ref([])
  const uploadBackfillLoading = ref(false)
  const uploadBackfillBusy = ref(false)
  const uploadBackfillSelectedIds = ref([])
  const uploadBackfillError = ref('')
  const uploaderPhoneMatrix = ref({ phones: [], platforms: [] })
  const uploaderPhoneLoading = ref(false)
  const uploaderPhoneSavingKey = ref('')
  const uploaderPhoneError = ref('')
  let accountTimer = null
  let bilibiliQrTimer = null
  let xiaohongshuQrTimer = null
  let douyinQrTimer = null

  const accountKeyGroups = computed(() => {
    const groups = new Map()
    for (const [type, rows] of [
      ['douyin', douyinRows.value],
      ['xiaohongshu', xiaohongshuRows.value],
      ['bilibili', bilibiliRows.value],
      ['shipinhao', shipinhaoRows.value],
      ['kuaishou', kuaishouRows.value],
      ['jinritoutiao', jinritoutiaoRows.value],
    ]) {
      for (const row of rows) {
        const key = String(row.accountKey || row.draftKey || '').trim()
        if (!key) continue
        if (!groups.has(key)) groups.set(key, { key, platforms: {} })
        groups.get(key).platforms[type] = row
      }
    }
    return [...groups.values()]
      .map(group => ({
        ...group,
        totalPlatformCount: accountPlatforms.length,
        rows: accountPlatforms
          .filter(platform => group.platforms[platform.type])
          .map(platform => ({
            ...platform,
            row: group.platforms[platform.type],
            configured: Boolean(group.platforms[platform.type]?.accountKey),
            exists: true,
          })),
      }))
      .sort((left, right) => right.rows.length - left.rows.length || left.key.localeCompare(right.key))
  })

  const uploadBackfillSelectedSet = computed(() => new Set(uploadBackfillSelectedIds.value))

  const uploadBackfillSelectableRows = computed(() => uploadBackfillRows.value.filter(row => row.selectable))

  const uploadBackfillAllSelected = computed(() => {
    const rows = uploadBackfillSelectableRows.value
    return rows.length > 0 && rows.every(row => uploadBackfillSelectedSet.value.has(row.taskId))
  })

  async function loadBiliupStatus() {
    try {
      await loadBilibiliAccounts()
      bilibiliAccount.value = bilibiliRows.value.find(row => row.accountKey) || bilibiliRows.value[0]
      bilibiliError.value = ''
    } catch (err) {
      bilibiliError.value = err instanceof Error ? err.message : String(err)
    }
  }

  async function loadAccountPage() {
    await Promise.allSettled([
      loadBiliupStatus(),
      loadXiaohongshuStatus(),
      loadDouyinStatus(),
      loadShipinhaoStatus(),
      loadKuaishouStatus(),
      loadJinritoutiaoStatus(),
      loadUploaderPhones(),
    ])
  }

  function startAccountPolling() {
    clearAccountPagePolling()
    loadAccountPage()
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
    if (bilibiliQrTimer) {
      window.clearInterval(bilibiliQrTimer)
      bilibiliQrTimer = null
    }
    if (xiaohongshuQrTimer) {
      window.clearInterval(xiaohongshuQrTimer)
      xiaohongshuQrTimer = null
    }
    if (douyinQrTimer) {
      window.clearInterval(douyinQrTimer)
      douyinQrTimer = null
    }
  }

  async function loadBilibiliAccounts() {
    bilibiliAccounts.value = await accountsApi.bilibili.list()
    bilibiliRows.value = accountRows(bilibiliAccounts.value)
  }

  async function loadXiaohongshuStatus() {
    try {
      await loadXiaohongshuAccounts()
      xiaohongshuAccount.value = xiaohongshuRows.value.find(row => row.accountKey) || xiaohongshuRows.value[0]
      xiaohongshuError.value = ''
    } catch (err) {
      xiaohongshuError.value = err instanceof Error ? err.message : String(err)
    }
  }

  async function loadXiaohongshuAccounts() {
    xiaohongshuAccounts.value = await accountsApi.xiaohongshu.list()
    xiaohongshuRows.value = accountRows(xiaohongshuAccounts.value)
  }

  async function loadDouyinStatus() {
    try {
      await loadDouyinAccounts()
      douyinAccount.value = douyinRows.value.find(row => row.accountKey) || douyinRows.value[0]
      douyinError.value = ''
    } catch (err) {
      douyinError.value = err instanceof Error ? err.message : String(err)
    }
  }

  async function loadDouyinAccounts() {
    douyinAccounts.value = await accountsApi.douyin.list()
    douyinRows.value = accountRows(douyinAccounts.value)
  }

  async function loadShipinhaoStatus() {
    try {
      await loadShipinhaoAccounts()
      shipinhaoAccount.value = shipinhaoRows.value.find(row => row.accountKey) || shipinhaoRows.value[0]
      shipinhaoError.value = ''
    } catch (err) {
      shipinhaoError.value = err instanceof Error ? err.message : String(err)
    }
  }

  async function loadShipinhaoAccounts() {
    shipinhaoAccounts.value = await accountsApi.shipinhao.list()
    shipinhaoRows.value = accountRows(shipinhaoAccounts.value)
  }

  async function loadKuaishouStatus() {
    try {
      await loadKuaishouAccounts()
      kuaishouAccount.value = kuaishouRows.value.find(row => row.accountKey) || kuaishouRows.value[0]
      kuaishouError.value = ''
    } catch (err) {
      kuaishouError.value = err instanceof Error ? err.message : String(err)
    }
  }

  async function loadKuaishouAccounts() {
    kuaishouAccounts.value = await accountsApi.kuaishou.list()
    kuaishouRows.value = accountRows(kuaishouAccounts.value)
  }

  async function loadJinritoutiaoStatus() {
    try {
      await loadJinritoutiaoAccounts()
      jinritoutiaoAccount.value = jinritoutiaoRows.value.find(row => row.accountKey) || jinritoutiaoRows.value[0]
      jinritoutiaoError.value = ''
    } catch (err) {
      jinritoutiaoError.value = err instanceof Error ? err.message : String(err)
    }
  }

  async function loadJinritoutiaoAccounts() {
    jinritoutiaoAccounts.value = await accountsApi.jinritoutiao.list()
    jinritoutiaoRows.value = accountRows(jinritoutiaoAccounts.value)
  }

  async function loadUploaderPhones() {
    uploaderPhoneLoading.value = true
    try {
      const payload = await accountsApi.uploaderPhones()
      uploaderPhoneMatrix.value = {
        phones: payload?.phones || [],
        platforms: payload?.platforms || [],
      }
      uploaderPhoneError.value = ''
    } catch (err) {
      uploaderPhoneError.value = err instanceof Error ? err.message : String(err)
    } finally {
      uploaderPhoneLoading.value = false
    }
  }

  async function saveUploaderPhoneAccount(phone, platform, accountId) {
    if (!phone?.id || !platform) return
    const normalizedAccountId = Number(accountId || 0)
    const savingKey = `${phone.id}:${platform}`
    uploaderPhoneSavingKey.value = savingKey
    try {
      const payload = await accountsApi.updateUploaderPhoneAccount(
        phone.id,
        platform,
        Number.isFinite(normalizedAccountId) && normalizedAccountId > 0 ? normalizedAccountId : null,
      )
      mergeUploaderPhone(payload)
      uploaderPhoneError.value = ''
    } catch (err) {
      uploaderPhoneError.value = err instanceof Error ? err.message : String(err)
    } finally {
      if (uploaderPhoneSavingKey.value === savingKey) {
        uploaderPhoneSavingKey.value = ''
      }
    }
  }

  function mergeUploaderPhone(payload) {
    if (!payload?.id) return
    uploaderPhoneMatrix.value = {
      ...uploaderPhoneMatrix.value,
      phones: uploaderPhoneMatrix.value.phones.map(phone => {
        if (phone.id !== payload.id) return phone
        return payload
      }),
    }
  }

  async function openUploadBackfill(platform, platformLabel, accountKey, type) {
    const normalizedAccountKey = String(accountKey || '').trim()
    const normalizedType = String(type || '').trim()
    if (!platform || !normalizedAccountKey || !normalizedType) return
    uploadBackfillContext.value = {
      platform,
      platformLabel: platformLabel || platform,
      accountKey: normalizedAccountKey,
      type: normalizedType,
    }
    uploadBackfillOpen.value = true
    uploadBackfillSelectedIds.value = []
    await loadUploadBackfillCandidates()
  }

  function closeUploadBackfill() {
    uploadBackfillOpen.value = false
    uploadBackfillContext.value = null
    uploadBackfillRows.value = []
    uploadBackfillSelectedIds.value = []
    uploadBackfillError.value = ''
  }

  async function loadUploadBackfillCandidates() {
    const context = uploadBackfillContext.value
    if (!context || uploadBackfillLoading.value) return
    uploadBackfillLoading.value = true
    try {
      const payload = await accountsApi.uploadBackfillCandidates(context.platform, context.accountKey, context.type)
      uploadBackfillRows.value = payload.rows || []
      uploadBackfillSelectedIds.value = uploadBackfillSelectedIds.value.filter(id => {
        return uploadBackfillRows.value.some(row => row.taskId === id && row.selectable)
      })
      uploadBackfillError.value = ''
    } catch (err) {
      uploadBackfillError.value = err instanceof Error ? err.message : String(err)
    } finally {
      uploadBackfillLoading.value = false
    }
  }

  function toggleUploadBackfillRow(row) {
    if (!row?.taskId || !row.selectable) return
    const selected = uploadBackfillSelectedSet.value
    uploadBackfillSelectedIds.value = selected.has(row.taskId)
      ? uploadBackfillSelectedIds.value.filter(id => id !== row.taskId)
      : [...uploadBackfillSelectedIds.value, row.taskId]
  }

  function toggleUploadBackfillAll() {
    if (uploadBackfillAllSelected.value) {
      uploadBackfillSelectedIds.value = []
      return
    }
    uploadBackfillSelectedIds.value = uploadBackfillSelectableRows.value.map(row => row.taskId)
  }

  async function registerSelectedUploadBackfill() {
    const context = uploadBackfillContext.value
    if (!context || uploadBackfillSelectedIds.value.length === 0 || uploadBackfillBusy.value) return
    const confirmed = window.confirm(`确认注册 ${uploadBackfillSelectedIds.value.length} 个历史视频到 ${context.platformLabel}/${context.accountKey}？`)
    if (!confirmed) return
    uploadBackfillBusy.value = true
    try {
      await accountsApi.registerUploadBackfill(
        context.platform,
        context.accountKey,
        context.type,
        [...uploadBackfillSelectedIds.value],
      )
      uploadBackfillSelectedIds.value = []
      await Promise.allSettled([loadUploadBackfillCandidates(), loadAccountPage()])
      uploadBackfillError.value = ''
    } catch (err) {
      uploadBackfillError.value = err instanceof Error ? err.message : String(err)
    } finally {
      uploadBackfillBusy.value = false
    }
  }

  async function startBilibiliQrLogin(row) {
    try {
      const key = row?.accountKey || '_auto'
      bilibiliBusyKey.value = rowKey(row)
      bilibiliQrCode.value = await accountsApi.bilibili.startQrLogin(key)
      bilibiliQrMessage.value = '等待扫码确认'
      pollBilibiliQrCode()
    } catch (err) {
      bilibiliError.value = err instanceof Error ? err.message : String(err)
    } finally {
      bilibiliBusyKey.value = ''
    }
  }

  async function pollBilibiliQrCode() {
    if (!bilibiliQrCode.value?.authCode) return
    if (bilibiliQrTimer) window.clearInterval(bilibiliQrTimer)
    await refreshBilibiliQrCode()
    bilibiliQrTimer = window.setInterval(refreshBilibiliQrCode, 1500)
  }

  async function refreshBilibiliQrCode() {
    if (!bilibiliQrCode.value?.authCode) return
    try {
      const key = bilibiliQrCode.value.accountKey || '_auto'
      const payload = await accountsApi.bilibili.pollQrLogin(key, bilibiliQrCode.value.authCode)
      bilibiliQrMessage.value = payload.message || '等待扫码确认'
      if (payload.loggedIn) {
        bilibiliAccount.value = payload.account
        await loadBilibiliAccounts()
        bilibiliQrCode.value = null
        if (bilibiliQrTimer) {
          window.clearInterval(bilibiliQrTimer)
          bilibiliQrTimer = null
        }
      }
    } catch (err) {
      bilibiliError.value = err instanceof Error ? err.message : String(err)
    }
  }

  async function renewBilibiliAccount(row) {
    if (!row?.accountKey) return
    bilibiliRenewing.value = true
    bilibiliBusyKey.value = rowKey(row)
    try {
      bilibiliAccount.value = await accountsApi.bilibili.renew(row.accountKey)
      await loadBilibiliAccounts()
      bilibiliError.value = ''
    } catch (err) {
      bilibiliError.value = err instanceof Error ? err.message : String(err)
    } finally {
      bilibiliRenewing.value = false
      bilibiliBusyKey.value = ''
    }
  }

  async function refreshBilibiliRow(row) {
    if (!row?.accountKey) return
    try {
      const account = await accountsApi.bilibili.refresh(row.accountKey)
      mergeAccountRow(account)
      bilibiliAccount.value = account
      bilibiliError.value = ''
    } catch (err) {
      bilibiliError.value = err instanceof Error ? err.message : String(err)
    }
  }

  async function saveBilibiliKey(row) {
    if (!row?.accountKey) return
    const nextKey = (row.draftKey || '').trim()
    if (!nextKey || nextKey === row.accountKey) return
    try {
      const payload = await accountsApi.bilibili.saveKey(row.accountKey, nextKey)
      mergeAccountRow(payload, row.slot)
      await loadBilibiliAccounts()
      bilibiliError.value = ''
    } catch (err) {
      bilibiliError.value = err instanceof Error ? err.message : String(err)
    }
  }

  async function startXiaohongshuQrLogin(row) {
    try {
      const key = row?.accountKey || '_auto'
      xiaohongshuBusyKey.value = rowKey(row)
      const payload = await accountsApi.xiaohongshu.startQrLogin(key)
      xiaohongshuQrCode.value = payload
      xiaohongshuQrMessage.value = '等待扫码确认'
      pollXiaohongshuQrCode()
    } catch (err) {
      xiaohongshuError.value = err instanceof Error ? err.message : String(err)
    } finally {
      xiaohongshuBusyKey.value = ''
    }
  }

  async function pollXiaohongshuQrCode() {
    if (!xiaohongshuQrCode.value?.authCode) return
    if (xiaohongshuQrTimer) window.clearInterval(xiaohongshuQrTimer)
    await refreshXiaohongshuQrCode()
    xiaohongshuQrTimer = window.setInterval(refreshXiaohongshuQrCode, 1500)
  }

  async function refreshXiaohongshuQrCode() {
    if (!xiaohongshuQrCode.value?.authCode) return
    try {
      const key = xiaohongshuQrCode.value.accountKey || '_auto'
      const payload = await accountsApi.xiaohongshu.pollQrLogin(key, xiaohongshuQrCode.value.authCode)
      xiaohongshuQrMessage.value = payload.message || '等待扫码确认'
      if (payload.loggedIn) {
        xiaohongshuAccount.value = payload.account
        await loadXiaohongshuAccounts()
        xiaohongshuQrCode.value = null
        if (xiaohongshuQrTimer) {
          window.clearInterval(xiaohongshuQrTimer)
          xiaohongshuQrTimer = null
        }
      }
    } catch (err) {
      xiaohongshuError.value = err instanceof Error ? err.message : String(err)
    }
  }

  async function refreshXiaohongshuRow(row) {
    if (!row?.accountKey) return
    try {
      const account = await accountsApi.xiaohongshu.refresh(row.accountKey)
      mergeXiaohongshuRow(account)
      xiaohongshuAccount.value = account
      xiaohongshuError.value = ''
    } catch (err) {
      xiaohongshuError.value = err instanceof Error ? err.message : String(err)
    }
  }

  async function saveXiaohongshuKey(row) {
    if (!row?.accountKey) return
    const nextKey = (row.draftKey || '').trim()
    if (!nextKey || nextKey === row.accountKey) return
    try {
      const payload = await accountsApi.xiaohongshu.saveKey(row.accountKey, nextKey)
      mergeXiaohongshuRow(payload, row.slot)
      await loadXiaohongshuAccounts()
      xiaohongshuError.value = ''
    } catch (err) {
      xiaohongshuError.value = err instanceof Error ? err.message : String(err)
    }
  }

  async function startDouyinQrLogin(row) {
    try {
      const key = row?.accountKey || '_auto'
      douyinBusyKey.value = rowKey(row)
      const payload = await accountsApi.douyin.startQrLogin(key)
      douyinQrCode.value = payload
      douyinQrMessage.value = '等待扫码确认'
      pollDouyinQrCode()
    } catch (err) {
      douyinError.value = err instanceof Error ? err.message : String(err)
    } finally {
      douyinBusyKey.value = ''
    }
  }

  async function pollDouyinQrCode() {
    if (!douyinQrCode.value?.authCode) return
    if (douyinQrTimer) window.clearInterval(douyinQrTimer)
    await refreshDouyinQrCode()
    douyinQrTimer = window.setInterval(refreshDouyinQrCode, 1500)
  }

  async function refreshDouyinQrCode() {
    if (!douyinQrCode.value?.authCode) return
    try {
      const key = douyinQrCode.value.accountKey || '_auto'
      const payload = await accountsApi.douyin.pollQrLogin(key, douyinQrCode.value.authCode)
      douyinQrMessage.value = payload.message || '等待扫码确认'
      if (payload.code === 'expired') {
        if (douyinQrTimer) {
          window.clearInterval(douyinQrTimer)
          douyinQrTimer = null
        }
      }
      if (payload.loggedIn) {
        douyinAccount.value = payload.account
        await loadDouyinAccounts()
        douyinQrCode.value = null
        if (douyinQrTimer) {
          window.clearInterval(douyinQrTimer)
          douyinQrTimer = null
        }
      }
    } catch (err) {
      douyinError.value = err instanceof Error ? err.message : String(err)
    }
  }

  async function refreshDouyinRow(row) {
    if (!row?.accountKey) return
    try {
      const account = await accountsApi.douyin.refresh(row.accountKey)
      mergeDouyinRow(account)
      douyinAccount.value = account
      douyinError.value = ''
    } catch (err) {
      douyinError.value = err instanceof Error ? err.message : String(err)
    }
  }

  async function saveDouyinKey(row) {
    if (!row?.accountKey) return
    const nextKey = (row.draftKey || '').trim()
    if (!nextKey || nextKey === row.accountKey) return
    try {
      const payload = await accountsApi.douyin.saveKey(row.accountKey, nextKey)
      mergeDouyinRow(payload, row.slot)
      await loadDouyinAccounts()
      douyinError.value = ''
    } catch (err) {
      douyinError.value = err instanceof Error ? err.message : String(err)
    }
  }

  async function saveKuaishouKey(row) {
    if (!row?.accountKey) return
    const nextKey = (row.draftKey || '').trim()
    if (!nextKey || nextKey === row.accountKey) return
    try {
      const payload = await accountsApi.kuaishou.saveKey(row.accountKey, nextKey)
      mergeKuaishouRow(payload, row.slot)
      await loadKuaishouAccounts()
      kuaishouError.value = ''
    } catch (err) {
      kuaishouError.value = err instanceof Error ? err.message : String(err)
    }
  }

  async function saveShipinhaoKey(row) {
    if (!row?.accountKey) return
    const nextKey = (row.draftKey || '').trim()
    if (!nextKey || nextKey === row.accountKey) return
    try {
      const payload = await accountsApi.shipinhao.saveKey(row.accountKey, nextKey)
      mergeShipinhaoRow(payload, row.slot)
      await loadShipinhaoAccounts()
      shipinhaoError.value = ''
    } catch (err) {
      shipinhaoError.value = err instanceof Error ? err.message : String(err)
    }
  }

  async function saveJinritoutiaoKey(row) {
    if (!row?.accountKey) return
    const nextKey = (row.draftKey || '').trim()
    if (!nextKey || nextKey === row.accountKey) return
    try {
      const payload = await accountsApi.jinritoutiao.saveKey(row.accountKey, nextKey)
      mergeJinritoutiaoRow(payload, row.slot)
      await loadJinritoutiaoAccounts()
      jinritoutiaoError.value = ''
    } catch (err) {
      jinritoutiaoError.value = err instanceof Error ? err.message : String(err)
    }
  }

  async function togglePlatformEnabled(platform, row) {
    if (!row?.accountKey) return
    const nextEnabled = row.enabled === false
    const previousEnabled = row.enabled
    row.enabled = nextEnabled
    if (platform === 'bilibili') bilibiliBusyKey.value = rowKey(row)
    if (platform === 'xiaohongshu') xiaohongshuBusyKey.value = rowKey(row)
    if (platform === 'douyin') douyinBusyKey.value = rowKey(row)
    if (platform === 'shipinhao') shipinhaoBusyKey.value = rowKey(row)
    if (platform === 'kuaishou') kuaishouBusyKey.value = rowKey(row)
    if (platform === 'jinritoutiao') jinritoutiaoBusyKey.value = rowKey(row)
    try {
      const account = await accountsApi[platform].setEnabled(row.accountKey, nextEnabled)
      if (platform === 'bilibili') {
        mergeAccountRow(account, row.slot)
        bilibiliError.value = ''
      } else if (platform === 'xiaohongshu') {
        mergeXiaohongshuRow(account, row.slot)
        xiaohongshuError.value = ''
      } else if (platform === 'douyin') {
        mergeDouyinRow(account, row.slot)
        douyinError.value = ''
      } else if (platform === 'shipinhao') {
        mergeShipinhaoRow(account, row.slot)
        shipinhaoError.value = ''
      } else if (platform === 'kuaishou') {
        mergeKuaishouRow(account, row.slot)
        kuaishouError.value = ''
      } else if (platform === 'jinritoutiao') {
        mergeJinritoutiaoRow(account, row.slot)
        jinritoutiaoError.value = ''
      }
    } catch (err) {
      row.enabled = previousEnabled
      const message = err instanceof Error ? err.message : String(err)
      if (platform === 'bilibili') bilibiliError.value = message
      if (platform === 'xiaohongshu') xiaohongshuError.value = message
      if (platform === 'douyin') douyinError.value = message
      if (platform === 'shipinhao') shipinhaoError.value = message
      if (platform === 'kuaishou') kuaishouError.value = message
      if (platform === 'jinritoutiao') jinritoutiaoError.value = message
    } finally {
      if (platform === 'bilibili') bilibiliBusyKey.value = ''
      if (platform === 'xiaohongshu') xiaohongshuBusyKey.value = ''
      if (platform === 'douyin') douyinBusyKey.value = ''
      if (platform === 'shipinhao') shipinhaoBusyKey.value = ''
      if (platform === 'kuaishou') kuaishouBusyKey.value = ''
      if (platform === 'jinritoutiao') jinritoutiaoBusyKey.value = ''
    }
  }

  async function savePlatformCooldown(platform, row) {
    if (!row?.accountKey) return
    const minMinutes = Number(row.draftCooldownMinMinutes)
    const maxMinutes = Number(row.draftCooldownMaxMinutes)
    if (!Number.isFinite(minMinutes) || !Number.isFinite(maxMinutes) || minMinutes < 0 || maxMinutes < minMinutes) {
      setPlatformError(platform, '冷却时间范围无效')
      return
    }
    setPlatformBusyKey(platform, rowKey(row))
    try {
      const account = await accountsApi[platform].setCooldown(
        row.accountKey,
        Math.round(minMinutes * 60),
        Math.round(maxMinutes * 60),
      )
      if (platform === 'bilibili') {
        mergeAccountRow(account, row.slot)
        await loadBilibiliAccounts()
        bilibiliError.value = ''
      } else if (platform === 'xiaohongshu') {
        mergeXiaohongshuRow(account, row.slot)
        await loadXiaohongshuAccounts()
        xiaohongshuError.value = ''
      } else if (platform === 'douyin') {
        mergeDouyinRow(account, row.slot)
        await loadDouyinAccounts()
        douyinError.value = ''
      } else if (platform === 'shipinhao') {
        mergeShipinhaoRow(account, row.slot)
        await loadShipinhaoAccounts()
        shipinhaoError.value = ''
      } else if (platform === 'kuaishou') {
        mergeKuaishouRow(account, row.slot)
        await loadKuaishouAccounts()
        kuaishouError.value = ''
      } else if (platform === 'jinritoutiao') {
        mergeJinritoutiaoRow(account, row.slot)
        await loadJinritoutiaoAccounts()
        jinritoutiaoError.value = ''
      }
    } catch (err) {
      setPlatformError(platform, err instanceof Error ? err.message : String(err))
    } finally {
      setPlatformBusyKey(platform, '')
    }
  }

  async function savePlatformProfile(platform, row) {
    if (!row?.accountKey) return null
    const displayName = String(row.draftDisplayName || '').trim()
    setPlatformBusyKey(platform, rowKey(row))
    try {
      const profile = await accountsApi[platform].updateProfile(row.accountKey, displayName)
      row.displayName = profile?.displayName || ''
      row.display_name = profile?.displayName || ''
      row.draftDisplayName = row.displayName || accountDisplay(row, platform)
      setPlatformError(platform, '')
      return profile
    } catch (err) {
      setPlatformError(platform, err instanceof Error ? err.message : String(err))
      throw err
    } finally {
      setPlatformBusyKey(platform, '')
    }
  }

  async function uploadPlatformAvatar(platform, row, file) {
    if (!row?.accountKey || !file) return null
    setPlatformBusyKey(platform, rowKey(row))
    try {
      const profile = await accountsApi[platform].uploadAvatar(row.accountKey, file)
      row.avatarUrl = profile?.avatarUrl || ''
      row.avatar_url = profile?.avatarUrl || ''
      row.draftAvatarUrl = row.avatarUrl
      setPlatformError(platform, '')
      return profile
    } catch (err) {
      setPlatformError(platform, err instanceof Error ? err.message : String(err))
      throw err
    } finally {
      setPlatformBusyKey(platform, '')
    }
  }

  function accountRows(accounts) {
    return accounts.map((account, index) => ({
      ...account,
      slot: index + 1,
      draftKey: account.accountKey || '',
      draftCooldownMinMinutes: cooldownMinutes(account.uploadCooldownMinSeconds, 60),
      draftCooldownMaxMinutes: cooldownMinutes(account.uploadCooldownMaxSeconds, 120),
      draftEnabled: account.enabled !== false,
      draftDisplayName: '',
      draftAvatarUrl: account.avatarUrl || account.avatar_url || '',
    }))
  }

  function cooldownMinutes(seconds, fallback) {
    const value = Number(seconds)
    return Number.isFinite(value) ? String(Math.round(value / 60)) : String(fallback)
  }

  function cooldownText(account) {
    const min = cooldownMinutes(account?.uploadCooldownMinSeconds, 60)
    const max = cooldownMinutes(account?.uploadCooldownMaxSeconds, 120)
    return min === max ? `${min} 分钟` : `${min}-${max} 分钟`
  }

  function nextSendText(account) {
    if (account?.enabled === false) {
      return '已禁用'
    }
    if (Number(account?.uploadRunningCount || 0) > 0) {
      return '发送中'
    }
    const next = parseLocalDateTime(account?.nextUploadAllowedAt)
    if (!next || next.getTime() <= Date.now()) {
      return '可发送'
    }
    const now = new Date()
    const tomorrow = new Date(now)
    tomorrow.setDate(now.getDate() + 1)
    if (isSameDate(next, now)) {
      return formatTime(next)
    }
    if (isSameDate(next, tomorrow)) {
      return `明天${formatTime(next)}`
    }
    return `${pad2(next.getMonth() + 1)}-${pad2(next.getDate())} ${formatTime(next)}`
  }

  function accountCountText(value) {
    const count = Number(value || 0)
    return Number.isFinite(count) ? String(Math.max(0, Math.trunc(count))) : '0'
  }

  function mergeAccountRow(account, preferredSlot) {
    const rows = [...bilibiliRows.value]
    let index = rows.findIndex(row => row.accountKey === account.accountKey)
    if (index < 0 && preferredSlot) {
      index = rows.findIndex(row => row.slot === preferredSlot)
    }
    if (index < 0) {
      index = rows.findIndex(row => !row.accountKey)
    }
    if (index < 0) {
      index = 0
    }
    rows[index] = {
      ...account,
      slot: rows[index]?.slot || index + 1,
      draftKey: account.accountKey || '',
    }
    bilibiliRows.value = accountRows(rows.filter(row => row.accountKey))
  }

  function mergeXiaohongshuRow(account, preferredSlot) {
    const rows = [...xiaohongshuRows.value]
    let index = rows.findIndex(row => row.accountKey === account.accountKey)
    if (index < 0 && preferredSlot) {
      index = rows.findIndex(row => row.slot === preferredSlot)
    }
    if (index < 0) {
      index = rows.findIndex(row => !row.accountKey)
    }
    if (index < 0) {
      index = 0
    }
    rows[index] = {
      ...account,
      slot: rows[index]?.slot || index + 1,
      draftKey: account.accountKey || '',
    }
    xiaohongshuRows.value = accountRows(rows.filter(row => row.accountKey))
  }

  function mergeDouyinRow(account, preferredSlot) {
    const rows = [...douyinRows.value]
    let index = rows.findIndex(row => row.accountKey === account.accountKey)
    if (index < 0 && preferredSlot) {
      index = rows.findIndex(row => row.slot === preferredSlot)
    }
    if (index < 0) {
      index = rows.findIndex(row => !row.accountKey)
    }
    if (index < 0) {
      index = 0
    }
    rows[index] = {
      ...account,
      slot: rows[index]?.slot || index + 1,
      draftKey: account.accountKey || '',
    }
    douyinRows.value = accountRows(rows.filter(row => row.accountKey))
  }

  function mergeShipinhaoRow(account, preferredSlot) {
    const rows = [...shipinhaoRows.value]
    let index = rows.findIndex(row => row.accountKey === account.accountKey)
    if (index < 0 && preferredSlot) {
      index = rows.findIndex(row => row.slot === preferredSlot)
    }
    if (index < 0) {
      index = rows.findIndex(row => !row.accountKey)
    }
    if (index < 0) {
      index = 0
    }
    rows[index] = {
      ...account,
      slot: rows[index]?.slot || index + 1,
      draftKey: account.accountKey || '',
    }
    shipinhaoRows.value = accountRows(rows.filter(row => row.accountKey))
  }

  function mergeKuaishouRow(account, preferredSlot) {
    const rows = [...kuaishouRows.value]
    let index = rows.findIndex(row => row.accountKey === account.accountKey)
    if (index < 0 && preferredSlot) {
      index = rows.findIndex(row => row.slot === preferredSlot)
    }
    if (index < 0) {
      index = rows.findIndex(row => !row.accountKey)
    }
    if (index < 0) {
      index = 0
    }
    rows[index] = {
      ...account,
      slot: rows[index]?.slot || index + 1,
      draftKey: account.accountKey || '',
    }
    kuaishouRows.value = accountRows(rows.filter(row => row.accountKey))
  }

  function mergeJinritoutiaoRow(account, preferredSlot) {
    const rows = [...jinritoutiaoRows.value]
    let index = rows.findIndex(row => row.accountKey === account.accountKey)
    if (index < 0 && preferredSlot) {
      index = rows.findIndex(row => row.slot === preferredSlot)
    }
    if (index < 0) {
      index = rows.findIndex(row => !row.accountKey)
    }
    if (index < 0) {
      index = 0
    }
    rows[index] = {
      ...account,
      slot: rows[index]?.slot || index + 1,
      draftKey: account.accountKey || '',
    }
    jinritoutiaoRows.value = accountRows(rows.filter(row => row.accountKey))
  }

  function rowKey(row) {
    return row?.accountKey || `slot_${row?.slot || 0}`
  }

  function rowStatus(row) {
    if (!row.accountKey) return '空'
    if (row.valid === true) return '已登录'
    if (row.valid === false) return '未登录'
    return row.message || '已保存'
  }

  function accountDisplay(row, platform) {
    if (!row.accountKey) return ''
    const commonName = row.displayName || row.display_name || row.accountName || row.account_name || row.name
    if (commonName) {
      return commonName
    }
    if (platform === 'bilibili') {
      return row.uname || row.accountKey
    }
    return row.nickname || row.accountKey
  }

  function accountAvatarUrl(row) {
    return normalizeAccountAvatarUrl(
      row?.avatarUrl
      || row?.avatar_url
      || row?.avatar
      || row?.face
      || row?.headUrl
      || row?.head_url
      || '',
    )
  }

  function accountAvatarInitial(row, platform) {
    const name = accountDisplay(row, platform) || row?.accountKey || '?'
    return String(name).trim().slice(0, 1).toUpperCase() || '?'
  }

  function platformBusyKey(platform) {
    if (platform === 'bilibili') return bilibiliBusyKey.value
    if (platform === 'xiaohongshu') return xiaohongshuBusyKey.value
    if (platform === 'douyin') return douyinBusyKey.value
    if (platform === 'shipinhao') return shipinhaoBusyKey.value
    if (platform === 'kuaishou') return kuaishouBusyKey.value
    if (platform === 'jinritoutiao') return jinritoutiaoBusyKey.value
    return ''
  }

  function platformErrorText() {
    return [
      douyinError.value,
      xiaohongshuError.value,
      bilibiliError.value,
      shipinhaoError.value,
      kuaishouError.value,
      jinritoutiaoError.value,
    ].filter(Boolean).join('；')
  }

  function setPlatformError(platform, message) {
    if (platform === 'bilibili') bilibiliError.value = message
    if (platform === 'xiaohongshu') xiaohongshuError.value = message
    if (platform === 'douyin') douyinError.value = message
    if (platform === 'shipinhao') shipinhaoError.value = message
    if (platform === 'kuaishou') kuaishouError.value = message
    if (platform === 'jinritoutiao') jinritoutiaoError.value = message
  }

  function setPlatformBusyKey(platform, value) {
    if (platform === 'bilibili') bilibiliBusyKey.value = value
    if (platform === 'xiaohongshu') xiaohongshuBusyKey.value = value
    if (platform === 'douyin') douyinBusyKey.value = value
    if (platform === 'shipinhao') shipinhaoBusyKey.value = value
    if (platform === 'kuaishou') kuaishouBusyKey.value = value
    if (platform === 'jinritoutiao') jinritoutiaoBusyKey.value = value
  }

  function startPlatformLogin(platform, row) {
    if (platform === 'bilibili') return startBilibiliQrLogin(row)
    if (platform === 'xiaohongshu') return startXiaohongshuQrLogin(row)
    if (platform === 'douyin') return startDouyinQrLogin(row)
    return null
  }

  function savePlatformKey(platform, row) {
    if (platform === 'bilibili') return saveBilibiliKey(row)
    if (platform === 'xiaohongshu') return saveXiaohongshuKey(row)
    if (platform === 'douyin') return saveDouyinKey(row)
    if (platform === 'shipinhao') return saveShipinhaoKey(row)
    if (platform === 'kuaishou') return saveKuaishouKey(row)
    if (platform === 'jinritoutiao') return saveJinritoutiaoKey(row)
    return null
  }

  function savePlatformAccountProfile(platform, row) {
    return savePlatformProfile(platform, row)
  }

  function uploadPlatformAccountAvatar(platform, row, file) {
    return uploadPlatformAvatar(platform, row, file)
  }

  async function warmPlatformIcons() {
    const urls = Object.values(platformIconUrls)
    for (const url of urls) {
      const image = new Image()
      image.decoding = 'async'
      image.src = url
    }
    if (!('caches' in window)) return
    try {
      const cache = await caches.open('youbi-platform-icons-v1')
      await Promise.allSettled(urls.map(async url => {
        const cached = await cache.match(url)
        if (!cached) await cache.add(url)
      }))
    } catch {
      // Browser image cache still handles these icons when Cache API is unavailable.
    }
  }

  function qrImageUrl(url) {
    if (!url) return ''
    return `https://api.qrserver.com/v1/create-qr-code/?size=184x184&data=${encodeURIComponent(url)}`
  }

  return {
    bilibiliAccount,
    bilibiliAccounts,
    bilibiliRows,
    bilibiliError,
    bilibiliQrCode,
    bilibiliQrMessage,
    bilibiliRenewing,
    bilibiliBusyKey,
    xiaohongshuAccount,
    xiaohongshuAccounts,
    xiaohongshuRows,
    xiaohongshuError,
    xiaohongshuQrCode,
    xiaohongshuQrMessage,
    xiaohongshuBusyKey,
    douyinAccount,
    douyinAccounts,
    douyinRows,
    douyinError,
    douyinQrCode,
    douyinQrMessage,
    douyinBusyKey,
    shipinhaoAccount,
    shipinhaoAccounts,
    shipinhaoRows,
    shipinhaoError,
    shipinhaoBusyKey,
    kuaishouAccount,
    kuaishouAccounts,
    kuaishouRows,
    kuaishouError,
    kuaishouBusyKey,
    jinritoutiaoAccount,
    jinritoutiaoAccounts,
    jinritoutiaoRows,
    jinritoutiaoError,
    jinritoutiaoBusyKey,
    accountKeyGroups,
    uploadBackfillOpen,
    uploadBackfillContext,
    uploadBackfillRows,
    uploadBackfillLoading,
    uploadBackfillBusy,
    uploadBackfillSelectedIds,
    uploadBackfillSelectedSet,
    uploadBackfillAllSelected,
    uploadBackfillError,
    uploaderPhoneMatrix,
    uploaderPhoneLoading,
    uploaderPhoneSavingKey,
    uploaderPhoneError,
    loadBiliupStatus,
    loadAccountPage,
    startAccountPolling,
    clearAccountPagePolling,
    clearAccountPolling,
    loadBilibiliAccounts,
    loadXiaohongshuStatus,
    loadXiaohongshuAccounts,
    loadDouyinStatus,
    loadDouyinAccounts,
    loadShipinhaoStatus,
    loadShipinhaoAccounts,
    loadKuaishouStatus,
    loadKuaishouAccounts,
    loadJinritoutiaoStatus,
    loadJinritoutiaoAccounts,
    loadUploaderPhones,
    saveUploaderPhoneAccount,
    startBilibiliQrLogin,
    renewBilibiliAccount,
    refreshBilibiliRow,
    saveBilibiliKey,
    startXiaohongshuQrLogin,
    refreshXiaohongshuRow,
    saveXiaohongshuKey,
    startDouyinQrLogin,
    refreshDouyinRow,
    saveDouyinKey,
    saveShipinhaoKey,
    saveKuaishouKey,
    saveJinritoutiaoKey,
    togglePlatformEnabled,
    savePlatformCooldown,
    savePlatformAccountProfile,
    uploadPlatformAccountAvatar,
    openUploadBackfill,
    closeUploadBackfill,
    loadUploadBackfillCandidates,
    toggleUploadBackfillRow,
    toggleUploadBackfillAll,
    registerSelectedUploadBackfill,
    accountRows,
    nextSendText,
    accountCountText,
    cooldownText,
    rowKey,
    rowStatus,
    accountDisplay,
    accountAvatarUrl,
    accountAvatarInitial,
    platformBusyKey,
    platformErrorText,
    startPlatformLogin,
    savePlatformKey,
    warmPlatformIcons,
    qrImageUrl,
  }
}
