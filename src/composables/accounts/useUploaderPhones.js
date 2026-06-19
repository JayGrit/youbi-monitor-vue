import { ref } from 'vue'

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
    const action = row.exists ? 'open' : 'new'
    const accountKey = row.accountKey || (row.platform === 'chatgpt' ? 'default' : 'server-profile')
    standaloneAccountBusyKey.value = row.platform
    try {
      await runUploaderPhoneAccountScript(row.platform, action, accountKey)
    } finally {
      standaloneAccountBusyKey.value = ''
    }
  }

  async function runUploaderPhoneAccountScript(platform, action, accountKey) {
    const busyKey = `${platform}:${action}:${accountKey}`
    uploaderPhoneAgentBusyKey.value = busyKey
    try {
      const payload = await agentApi.runAccountScript(platform, action, accountKey)
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
    loadStandaloneAccounts,
    runStandaloneAccount,
  }
}
