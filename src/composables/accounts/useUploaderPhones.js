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

export function useUploaderPhones(accountsApi, agentApi, operatorApi) {
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
    const action = row.exists ? 'open' : 'new'
    const topic = row.topic || (row.platform === 'chatgpt' ? 'default' : 'server-profile')
    standaloneAccountBusyKey.value = row.platform
    try {
      await runUploaderPhoneAccountScript(row.platform, action, topic)
    } finally {
      standaloneAccountBusyKey.value = ''
    }
  }

  async function runUploaderPhoneAccountScript(platform, action, topic) {
    const busyKey = `${platform}:${action}:${topic}`
    uploaderPhoneAgentBusyKey.value = busyKey
    try {
      const payload = await agentApi.runAccountScript(platform, action, topic)
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

  async function waitAccountScript(platform, action, topic) {
    for (let attempt = 0; attempt < 90; attempt += 1) {
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
    if (!operatorApi || !FOLLOWER_PROFILE_PLATFORMS.has(platform) || !topic) return null
    const busyKey = `${platform}:follower-profile:${topic}`
    uploaderPhoneAgentBusyKey.value = busyKey
    try {
      const accepted = await operatorApi.submitTask({
        platform,
        action: 'get_follower_count',
        topic,
        taskId: `monitor-follower-profile-${platform}-${topic}-${Date.now()}`,
        payload: { topic },
      })
      const opId = accepted?.opId
      if (!opId) throw new Error('operator 未返回 opId')
      const task = await waitOperatorTask(opId)
      const result = task?.result || {}
      const username = String(result.username || result.accountName || '').trim()
      const avatarUrl = String(result.avatarMinioUrl || result.avatar_minio_url || '').trim()
      if (!username && !avatarUrl) {
        throw new Error('operator 结果没有账号名或头像')
      }
      uploaderPhoneError.value = ''
      return { opId, username, avatarUrl, result }
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

  async function waitOperatorTask(opId) {
    for (let attempt = 0; attempt < 30; attempt += 1) {
      if (attempt > 0) await sleep(10000)
      const payload = await operatorApi.task(opId)
      const status = String(payload?.status || '').toLowerCase()
      if (status === 'success') return payload
      if (status === 'failed') {
        throw new Error(payload?.error?.message || 'operator 任务失败')
      }
    }
    throw new Error('operator 任务超时，请稍后查看任务结果')
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
