import { createAccountsApi } from '../api/accounts'
import { createAgentApi } from '../api/agent'
import { createDistributorApi } from '../api/distributor'
import { createMonitorApi } from '../api/monitor'
import { createOperatorDiagnosticsApi } from '../api/operatorDiagnostics'
import { createQueueMonitorApi } from '../api/queueMonitor'
import { createServerApi } from '../api/server'
import { createSubmitterApi } from '../api/submitter'
import { createAccountPlatforms, createPlatformIconUrls } from '../domain/constants'
import { useImageCache } from '../composables/useImageCache'

export function useAppServices() {
  const apiBase = `${import.meta.env.BASE_URL}api`
  const distributorApiBase = `${import.meta.env.BASE_URL}distributor-api`
  const submitterApiBase = `${import.meta.env.BASE_URL}submitter-api`
  const backupperApiBase = `${import.meta.env.BASE_URL}backupper-api`
  const monitorApi = createMonitorApi(apiBase)
  const distributorApi = createDistributorApi(distributorApiBase)
  const operatorDiagnosticsApi = createOperatorDiagnosticsApi(apiBase)
  const ffmpegerApi = createQueueMonitorApi(apiBase, 'ffmpeger')
  const airouterApi = createQueueMonitorApi(apiBase, 'airouter')
  const accountsApi = createAccountsApi(apiBase, distributorApiBase)
  const serverApi = createServerApi(backupperApiBase)
  const agentApi = createAgentApi()
  const submitterApi = createSubmitterApi(submitterApiBase)
  const PLATFORM_ICON_URLS = createPlatformIconUrls(import.meta.env.BASE_URL)
  const ACCOUNT_PLATFORMS = createAccountPlatforms(PLATFORM_ICON_URLS)
  const { brokenImageUrls, cacheImageUrl, revokeCachedUrls } = useImageCache()

  return {
    monitorApi,
    distributorApi,
    operatorDiagnosticsApi,
    ffmpegerApi,
    airouterApi,
    accountsApi,
    serverApi,
    agentApi,
    submitterApi,
    PLATFORM_ICON_URLS,
    ACCOUNT_PLATFORMS,
    accountPlatforms: ACCOUNT_PLATFORMS,
    platformIconUrls: PLATFORM_ICON_URLS,
    brokenImageUrls,
    cacheImageUrl,
    revokeCachedUrls,
  }
}
