import { ref } from 'vue'

function sleep(ms) {
  return new Promise(resolve => window.setTimeout(resolve, ms))
}

const FOLLOWER_PROFILE_PLATFORMS = new Set([
  'bilibili',
  'douyin',
  'jinritoutiao',
  'kuaishou',
  'shipinhao',
  'youtube',
])

export function useUploaderPhones(accountsApi, agentApi) {
  const uploaderPhoneMatrix = ref({ phones: [], platforms: [] })
  const uploaderPhoneLoading = ref(false)
  const uploaderPhoneSavingKey = ref('')
  const uploaderPhoneAgentBusyKey = ref('')
  const uploaderPhoneError = ref('')
  const standaloneAccounts = ref([])
  const standaloneAccountLoading = ref(false)
  const standaloneAccountBusyKey = ref('')

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

  async function loadStandaloneAccounts() {
    standaloneAccountLoading.value = true
    try {
      const payload = await agentApi.standaloneAccounts()
      standaloneAccounts.value = payload?.accounts || []
    } catch (err) {
      if (!(err instanceof TypeError)) {
        uploaderPhoneError.value = err instanceof Error ? err.message : String(err)
      }
    } finally {
      standaloneAccountLoading.value = false
    }
  }

  async function runStandaloneAccount(row) {
    if (!row?.platform || standaloneAccountBusyKey.value) return
    const action = row.exists
      ? (row.available === false && ['x', 'youtube', 'notebooklm'].includes(row.platform) ? 'renew' : 'open')
      : 'new'
    const topic = row.exists
      ? row.topic
      : window.prompt('请输入新账号 topic', row.platform === 'notebooklm' ? `profile-${row.profileKey}` : row.platform === 'x' ? 'x-new' : 'default')?.trim()
    if (!topic) return
    standaloneAccountBusyKey.value = row.platform
    try {
      const accepted = await runUploaderPhoneAccountScript(row.platform, action, topic, row.profileKey || '')
      if (accepted) {
        await waitAccountScript(row.platform, action, topic, 900)
        await loadStandaloneAccounts()
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      uploaderPhoneError.value = message
      window.alert(message)
    } finally {
      standaloneAccountBusyKey.value = ''
    }
  }

  async function runUploaderPhoneAccountScript(platform, action, topic, profileKey = '', phoneId = null, sourceTopic = '') {
    const busyKey = `${platform}:${action}:${topic}`
    uploaderPhoneAgentBusyKey.value = busyKey
    try {
      const payload = await agentApi.runAccountScript(platform, action, topic, profileKey, phoneId, sourceTopic)
      if (platform === 'bilibili' && action === 'new') {
        await waitAccountScript(platform, action, topic)
        await loadUploaderPhones()
      }
      uploaderPhoneError.value = ''
      return payload
    } catch (err) {
      if (err instanceof TypeError) {
        window.alert('agent 没有启动，请先在本地启动 services/agent。')
      } else {
        const message = err instanceof Error ? err.message : String(err)
        uploaderPhoneError.value = message
        window.alert(message)
      }
      return null
    } finally {
      if (uploaderPhoneAgentBusyKey.value === busyKey) {
        uploaderPhoneAgentBusyKey.value = ''
      }
    }
  }

  async function updateYoutubeDownloaderCookies() {
    const busyKey = 'youtube:cookies:default'
    uploaderPhoneAgentBusyKey.value = busyKey
    try {
      await agentApi.updateYoutubeCookies()
      const payload = await waitAccountScript('youtube', 'cookies', 'default')
      uploaderPhoneError.value = ''
      window.alert('YouTube 下载 Cookie 已更新')
      return payload
    } catch (err) {
      if (err instanceof TypeError) {
        window.alert('agent 没有启动，请先在本地启动 services/agent。')
      } else {
        const message = err instanceof Error ? err.message : String(err)
        uploaderPhoneError.value = message
        window.alert(message)
      }
      return null
    } finally {
      if (uploaderPhoneAgentBusyKey.value === busyKey) {
        uploaderPhoneAgentBusyKey.value = ''
      }
    }
  }

  async function waitAccountScript(platform, action, topic, maxAttempts = 90) {
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const payload = await agentApi.accountScriptStatus(platform, action, topic)
      if (payload?.status === 'success') return payload
      if (payload?.status === 'failed') {
        throw new Error(payload.message || '脚本执行失败')
      }
      await sleep(1000)
    }
    throw new Error('脚本执行超时，请查看本地 agent 日志')
  }

  async function fetchFollowerProfile(platform, topic) {
    if (!FOLLOWER_PROFILE_PLATFORMS.has(platform) || !topic || !accountsApi?.[platform]?.syncProfile) return null
    const busyKey = `${platform}:follower-profile:${topic}`
    uploaderPhoneAgentBusyKey.value = busyKey
    try {
      const accepted = await accountsApi[platform].syncProfile(topic)
      uploaderPhoneError.value = ''
      return accepted
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      uploaderPhoneError.value = message
      window.alert(message)
      return null
    } finally {
      if (uploaderPhoneAgentBusyKey.value === busyKey) {
        uploaderPhoneAgentBusyKey.value = ''
      }
    }
  }

  async function saveUploaderPhoneAccount(phone, platform, accountId, note = '', disabled = false) {
    if (!phone?.id || !platform) return
    const normalizedAccountId = Number(accountId || 0)
    const savingKey = `${phone.id}:${platform}`
    uploaderPhoneSavingKey.value = savingKey
    try {
      const payload = await accountsApi.updateUploaderPhoneAccount(
        phone.id,
        platform,
        Number.isFinite(normalizedAccountId) && normalizedAccountId > 0 ? normalizedAccountId : null,
        String(note || '').trim(),
        Boolean(disabled),
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

  return {
    uploaderPhoneMatrix,
    uploaderPhoneLoading,
    uploaderPhoneSavingKey,
    uploaderPhoneAgentBusyKey,
    uploaderPhoneError,
    standaloneAccounts,
    standaloneAccountLoading,
    standaloneAccountBusyKey,
    loadUploaderPhones,
    saveUploaderPhoneAccount,
    runUploaderPhoneAccountScript,
    fetchFollowerProfile,
    updateYoutubeDownloaderCookies,
    loadStandaloneAccounts,
    runStandaloneAccount,
  }
}
