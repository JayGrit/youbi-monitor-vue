import { createAccountsApi } from '../api/accounts'
import { createAgentApi } from '../api/agent'
import { createDistributorApi } from '../api/distributor'
import { createFailureLogsApi } from '../api/failureLogs'
import { createOperatorDiagnosticsApi } from '../api/operatorDiagnostics'
import { createPublisherApi } from '../api/publisher'
import { createQueueMonitorApi } from '../api/queueMonitor'
import { createServerApi } from '../api/server'
import { createSpeakerSegmentsApi } from '../api/speakerSegments'
import { createStaticAssetsApi } from '../api/staticAssets'
import { createSubmitterApi } from '../api/submitter'
import { createTaskFlowApi } from '../api/taskFlow'
import { createTasksApi } from '../api/tasks'
import { createAccountPlatforms, createPlatformIconUrls } from '../domain/constants'
import { useImageCache } from '../composables/useImageCache'

export function useAppServices() {
  const apiBase = `${import.meta.env.BASE_URL}api`
  const distributorApiBase = `${import.meta.env.BASE_URL}distributor-api`
  const submitterApiBase = `${import.meta.env.BASE_URL}submitter-api`
  const backupperApiBase = `${import.meta.env.BASE_URL}backupper-api`
  const tasksApi = createTasksApi(apiBase, 'monitor')
  const taskFlowApi = createTaskFlowApi(apiBase, 'monitor')
  const publisherApi = createPublisherApi(apiBase, 'monitor')
  const staticAssetsApi = createStaticAssetsApi(apiBase, 'monitor')
  const failureLogsApi = createFailureLogsApi(apiBase, 'monitor')
  const distributorApi = createDistributorApi(distributorApiBase, 'distributor')
  const operatorDiagnosticsApi = createOperatorDiagnosticsApi(apiBase, 'monitor')
  const speakerSegmentsApi = createSpeakerSegmentsApi(apiBase, 'monitor')
  const ffmpegerApi = createQueueMonitorApi(apiBase, 'ffmpeger', 'monitor')
  const airouterApi = createQueueMonitorApi(apiBase, 'airouter', 'monitor')
  const accountsApi = createAccountsApi(apiBase, distributorApiBase, { monitor: 'monitor', distributor: 'distributor' })
  const serverApi = createServerApi(backupperApiBase, 'backupper')
  const agentApi = createAgentApi(undefined, 'agent')
  const submitterApi = createSubmitterApi(submitterApiBase, 'submitter')
  const PLATFORM_ICON_URLS = createPlatformIconUrls(import.meta.env.BASE_URL)
  const ACCOUNT_PLATFORMS = createAccountPlatforms(PLATFORM_ICON_URLS)
  const { brokenImageUrls, cacheImageUrl, revokeCachedUrls } = useImageCache()

  return {
    tasksApi,
    taskFlowApi,
    publisherApi,
    staticAssetsApi,
    failureLogsApi,
    distributorApi,
    operatorDiagnosticsApi,
    speakerSegmentsApi,
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
