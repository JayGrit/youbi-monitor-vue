import { computed, ref } from 'vue'
import {
  ACCOUNT_PLATFORM_TYPES,
  QR_LOGIN_PLATFORM_TYPES,
  accountDisplay,
  accountRows,
  rowKey,
} from './accountUtils'

export function usePlatformAccounts(accountsApi, accountPlatforms) {
  const platformState = Object.fromEntries(ACCOUNT_PLATFORM_TYPES.map(platform => [platform, createPlatformState()]))
  const bilibiliRenewing = ref(false)
  const qrTimers = Object.fromEntries(QR_LOGIN_PLATFORM_TYPES.map(platform => [platform, null]))

  const accountKeyGroups = computed(() => {
    const groups = new Map()
    for (const platform of accountPlatforms) {
      const rows = platformState[platform.type]?.rows.value || []
      for (const row of rows) {
        const key = String(row.accountKey || row.draftKey || '').trim()
        if (!key) continue
        if (!groups.has(key)) groups.set(key, { key, platforms: {} })
        groups.get(key).platforms[platform.type] = row
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

  async function loadAccountOverview() {
    try {
      const payload = await accountsApi.overview()
      for (const platform of ACCOUNT_PLATFORM_TYPES) {
        const state = platformState[platform]
        state.accounts.value = payload?.[platform] || []
        state.rows.value = accountRows(state.accounts.value)
        state.account.value = state.rows.value.find(row => row.accountKey) || state.rows.value[0]
        state.error.value = ''
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      for (const platform of ACCOUNT_PLATFORM_TYPES) {
        platformState[platform].error.value = message
      }
    }
  }

  function clearQrPolling() {
    for (const platform of QR_LOGIN_PLATFORM_TYPES) {
      clearQrTimer(platform)
    }
  }

  function resumeQrPolling() {
    for (const platform of QR_LOGIN_PLATFORM_TYPES) {
      if (platformState[platform].qrCode.value?.authCode && !qrTimers[platform]) {
        pollQrCode(platform)
      }
    }
  }

  async function startPlatformLogin(platform, row) {
    if (!QR_LOGIN_PLATFORM_TYPES.includes(platform)) return null
    try {
      const key = row?.accountKey || '_auto'
      setPlatformBusy(platform, rowKey(row), 'login')
      const payload = await accountsApi[platform].startQrLogin(key)
      platformState[platform].qrCode.value = payload
      platformState[platform].qrMessage.value = '等待扫码确认'
      pollQrCode(platform)
    } catch (err) {
      setPlatformError(platform, err instanceof Error ? err.message : String(err))
    } finally {
      clearPlatformBusy(platform)
    }
  }

  async function pollQrCode(platform) {
    if (!platformState[platform].qrCode.value?.authCode) return
    clearQrTimer(platform)
    await refreshQrCode(platform)
    qrTimers[platform] = window.setInterval(() => refreshQrCode(platform), 1500)
  }

  async function refreshQrCode(platform) {
    const state = platformState[platform]
    if (!state.qrCode.value?.authCode) return
    try {
      const key = state.qrCode.value.accountKey || '_auto'
      const payload = await accountsApi[platform].pollQrLogin(key, state.qrCode.value.authCode)
      state.qrMessage.value = payload.message || '等待扫码确认'
      if (payload.code === 'expired') {
        clearQrTimer(platform)
      }
      if (payload.loggedIn) {
        state.account.value = payload.account
        await loadAccountOverview()
        state.qrCode.value = null
        clearQrTimer(platform)
      }
    } catch (err) {
      setPlatformError(platform, err instanceof Error ? err.message : String(err))
    }
  }

  async function renewBilibiliAccount(row) {
    if (!row?.accountKey) return
    bilibiliRenewing.value = true
    setPlatformBusy('bilibili', rowKey(row), 'renew')
    try {
      platformState.bilibili.account.value = await accountsApi.bilibili.renew(row.accountKey)
      await loadAccountOverview()
      platformState.bilibili.error.value = ''
    } catch (err) {
      platformState.bilibili.error.value = err instanceof Error ? err.message : String(err)
    } finally {
      bilibiliRenewing.value = false
      clearPlatformBusy('bilibili')
    }
  }

  async function refreshPlatformRow(platform, row) {
    if (!row?.accountKey) return
    try {
      const account = await accountsApi[platform].refresh(row.accountKey)
      mergePlatformRow(platform, account)
      platformState[platform].account.value = account
      platformState[platform].error.value = ''
    } catch (err) {
      platformState[platform].error.value = err instanceof Error ? err.message : String(err)
    }
  }

  async function savePlatformKey(platform, row) {
    if (!row?.accountKey) return null
    const nextKey = (row.draftKey || '').trim()
    if (!nextKey || nextKey === row.accountKey) return null
    setPlatformBusy(platform, rowKey(row), 'key')
    try {
      const payload = await accountsApi[platform].saveKey(row.accountKey, nextKey)
      mergePlatformRow(platform, payload, row.slot)
      await loadAccountOverview()
      platformState[platform].error.value = ''
      return payload
    } catch (err) {
      platformState[platform].error.value = err instanceof Error ? err.message : String(err)
      return null
    } finally {
      clearPlatformBusy(platform)
    }
  }

  async function togglePlatformEnabled(platform, row) {
    if (!row?.accountKey) return
    const nextEnabled = row.draftEnabled !== false
    const previousEnabled = row.enabled
    row.enabled = nextEnabled
    setPlatformBusy(platform, rowKey(row), 'enabled')
    try {
      const account = await accountsApi[platform].setEnabled(row.accountKey, nextEnabled)
      mergePlatformRow(platform, account, row.slot)
      setPlatformError(platform, '')
    } catch (err) {
      row.enabled = previousEnabled
      row.draftEnabled = previousEnabled !== false
      setPlatformError(platform, err instanceof Error ? err.message : String(err))
    } finally {
      clearPlatformBusy(platform)
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
    setPlatformBusy(platform, rowKey(row), 'cooldown')
    try {
      const account = await accountsApi[platform].setCooldown(
        row.accountKey,
        Math.round(minMinutes * 60),
        Math.round(maxMinutes * 60),
      )
      mergePlatformRow(platform, account, row.slot)
      setPlatformError(platform, '')
    } catch (err) {
      setPlatformError(platform, err instanceof Error ? err.message : String(err))
    } finally {
      clearPlatformBusy(platform)
    }
  }

  async function savePlatformDownloaderMaxStagedCount(platform, row) {
    if (!row?.accountKey) return
    const maxStagedCount = Number(row.draftDownloaderMaxStagedCount)
    if (!Number.isInteger(maxStagedCount) || maxStagedCount < 0 || maxStagedCount > 100) {
      setPlatformError(platform, '最大暂存个数范围无效')
      return
    }
    setPlatformBusy(platform, rowKey(row), 'downloaderMaxStagedCount')
    try {
      const account = await accountsApi[platform].setDownloaderMaxStagedCount(row.accountKey, maxStagedCount)
      mergePlatformRow(platform, account, row.slot)
      setPlatformError(platform, '')
    } catch (err) {
      setPlatformError(platform, err instanceof Error ? err.message : String(err))
    } finally {
      clearPlatformBusy(platform)
    }
  }

  async function savePlatformNextUploadAllowedAt(platform, row) {
    if (!row?.accountKey) return
    const nextUploadAllowedAt = String(row.draftNextUploadAllowedAt ?? '').trim()
    setPlatformBusy(platform, rowKey(row), 'nextUploadAllowedAt')
    try {
      const account = await accountsApi[platform].setNextUploadAllowedAt(row.accountKey, nextUploadAllowedAt || null)
      mergePlatformRow(platform, account, row.slot)
      setPlatformError(platform, '')
    } catch (err) {
      setPlatformError(platform, err instanceof Error ? err.message : String(err))
    } finally {
      clearPlatformBusy(platform)
    }
  }

  async function savePlatformQuietTime(platform, row) {
    if (!row?.accountKey) return
    const startTime = normalizeTimeInput(row.draftUploadQuietStartTime)
    const endTime = normalizeTimeInput(row.draftUploadQuietEndTime)
    if (!startTime || !endTime) {
      setPlatformError(platform, '禁发时间格式无效')
      return
    }
    setPlatformBusy(platform, rowKey(row), 'quietTime')
    try {
      const account = await accountsApi[platform].setQuietTime(row.accountKey, startTime, endTime)
      mergePlatformRow(platform, account, row.slot)
      setPlatformError(platform, '')
    } catch (err) {
      setPlatformError(platform, err instanceof Error ? err.message : String(err))
    } finally {
      clearPlatformBusy(platform)
    }
  }

  function normalizeTimeInput(value) {
    const text = String(value ?? '').trim()
    const match = text.match(/^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/)
    if (!match) return ''
    return `${match[1]}:${match[2]}:${match[3] || '00'}`
  }

  async function savePlatformAccountProfile(platform, row) {
    if (!row?.accountKey) return null
    const displayName = String(row.draftDisplayName || '').trim()
    setPlatformBusy(platform, rowKey(row), 'profile')
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
      clearPlatformBusy(platform)
    }
  }

  async function uploadPlatformAccountAvatar(platform, row, file) {
    if (!row?.accountKey || !file) return null
    setPlatformBusy(platform, rowKey(row), 'avatar')
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
      clearPlatformBusy(platform)
    }
  }

  function mergePlatformRow(platform, account, preferredSlot) {
    const state = platformState[platform]
    const rows = [...state.rows.value]
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
    rows[index] = accountRows([{ ...rows[index], ...account }])[0]
    state.rows.value = accountRows(rows.filter(row => row.accountKey))
  }

  function platformBusyKey(platform) {
    return platformState[platform]?.busyKey.value || ''
  }

  function platformBusyAction(platform) {
    return platformState[platform]?.busyAction.value || ''
  }

  function platformErrorText() {
    return ACCOUNT_PLATFORM_TYPES
      .map(platform => platformState[platform].error.value)
      .filter(Boolean)
      .join('；')
  }

  function setPlatformError(platform, message) {
    if (platformState[platform]) {
      platformState[platform].error.value = message
    }
  }

  function setPlatformBusy(platform, key, action) {
    if (platformState[platform]) {
      platformState[platform].busyKey.value = key
      platformState[platform].busyAction.value = action
    }
  }

  function clearPlatformBusy(platform) {
    setPlatformBusy(platform, '', '')
  }

  function clearQrTimer(platform) {
    if (qrTimers[platform]) {
      window.clearInterval(qrTimers[platform])
      qrTimers[platform] = null
    }
  }

  return {
    platformState,
    accountKeyGroups,
    bilibiliRenewing,
    loadAccountOverview,
    clearQrPolling,
    resumeQrPolling,
    startPlatformLogin,
    renewBilibiliAccount,
    refreshPlatformRow,
    savePlatformKey,
    togglePlatformEnabled,
    savePlatformCooldown,
    savePlatformQuietTime,
    savePlatformDownloaderMaxStagedCount,
    savePlatformNextUploadAllowedAt,
    savePlatformAccountProfile,
    uploadPlatformAccountAvatar,
    platformBusyKey,
    platformBusyAction,
    platformErrorText,
  }
}

function createPlatformState() {
  return {
    account: ref(null),
    accounts: ref([]),
    rows: ref(accountRows([])),
    error: ref(''),
    qrCode: ref(null),
    qrMessage: ref(''),
    busyKey: ref(''),
    busyAction: ref(''),
  }
}
