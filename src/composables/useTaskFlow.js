import { computed, ref } from 'vue'
import {
  SPEECH_STAGE_KEY,
  SPEECH_STAGE_KEYS,
  stageNameText,
  uploadPlatformText,
} from '../domain/constants'
import { shortValue } from '../utils/jsonDisplay'
import { normalizeResourceUrl, youtubeThumbnailUrl } from '../utils/media'
import { createTaskFlowMedia } from './task-flow/taskFlowMedia'
import { useTaskFlowDiagnostics } from './task-flow/useTaskFlowDiagnostics'
import { useSpeechRows } from './task-flow/useSpeechRows'

export function useTaskFlow(taskFlowApi, publisherApi, brokenImageUrls) {
  const selectedTaskFlow = ref(null)
  const selectedTaskProgress = ref(null)
  const selectedStageKey = ref('downloader')
  const flowPageOpen = ref(false)
  const flowLoading = ref(false)
  const flowError = ref('')
  const speechEditKey = ref('')
  const speechEditDraft = ref('')
  const speechEditSaving = ref(false)
  const speechEditError = ref('')
  const whisperWordTimestampsByTask = ref({})
  const whisperProcessingByTask = ref({})
  let flowTimer = null
  let flowRequestId = 0
  let flowPollingActive = false
  const { stageMedia, demucsAudioMedia } = createTaskFlowMedia({ selectedTaskFlow })
  const {
    uploaderDiagnostics,
    uploaderDiagnosticsLoading,
    uploaderDiagnosticsError,
    resetDiagnosticsPolling,
    clearUploaderDiagnosticsPolling,
    loadSelectedUploaderDiagnostics,
    startUploaderDiagnosticsPolling,
  } = useTaskFlowDiagnostics({
    taskFlowApi,
    canPoll: () => flowPollingActive && flowPageOpen.value,
    currentStageKey: () => baseStageKey(selectedStageKey.value),
  })

  const selectedStage = computed(() => {
    const stages = selectedTaskFlow.value?.stages || []
    if (selectedStageKey.value === SPEECH_STAGE_KEY) {
      return speechStage.value
    }
    const stageKey = baseStageKey(selectedStageKey.value)
    return stages.find(stage => stage.key === stageKey) || stages[0] || null
  })

  const flowTabs = computed(() => {
    const stages = selectedTaskFlow.value?.stages || []
    const nonSpeechStages = stages.filter(stage => !SPEECH_STAGE_KEYS.includes(stage.key))
    const speechStages = stages.filter(stage => SPEECH_STAGE_KEYS.includes(stage.key))
    if (!speechStages.length) {
      return nonSpeechStages
    }
    const failed = speechStages.find(stage => stage.status === 'failed')
    const running = speechStages.find(stage => stage.status === 'running')
    const active = failed || running || speechStages[speechStages.length - 1]
    const ordered = [
      ...nonSpeechStages.filter(stage => stage.key === 'downloader'),
      ...nonSpeechStages.filter(stage => stage.key === 'publisher'),
      ...nonSpeechStages.filter(stage => stage.key === 'demucs' || stage.key === 'whisper'),
      {
        ...active,
        key: SPEECH_STAGE_KEY,
        label: stageNameText[SPEECH_STAGE_KEY],
        children: speechStages,
        elapsedSeconds: speechStages.reduce((sum, stage) => sum + Number(stage.elapsedSeconds || 0), 0),
      },
      ...nonSpeechStages.filter(stage => stage.key === 'asseter' || stage.key === 'combiner' || stage.key === 'uploader'),
    ]
    return ordered
  })

  const speechStage = computed(() => {
    const stages = selectedTaskFlow.value?.stages || []
    const children = stages.filter(stage => SPEECH_STAGE_KEYS.includes(stage.key))
    if (!children.length) return null
    const active = children.find(stage => stage.status === 'failed') || children.find(stage => stage.status === 'running') || children[children.length - 1]
    return {
      ...active,
      key: SPEECH_STAGE_KEY,
      label: stageNameText[SPEECH_STAGE_KEY],
      children,
      elapsedSeconds: children.reduce((sum, stage) => sum + Number(stage.elapsedSeconds || 0), 0),
    }
  })

  const whisperWordTimestamps = computed(() => {
    const taskId = selectedTaskFlow.value?.task?.id
    return taskId ? whisperWordTimestampsByTask.value[taskId] || [] : []
  })

  const whisperProcessing = computed(() => {
    const taskId = selectedTaskFlow.value?.task?.id
    return taskId ? whisperProcessingByTask.value[taskId] || null : null
  })

  async function openTaskFlow(task, stageKey = 'downloader', subStage = 'main') {
    if (!task?.taskId) return
    resetDiagnosticsPolling()
    flowPageOpen.value = true
    selectedStageKey.value = detailStageKey(stageKey, subStage)
    selectedTaskFlow.value = null
    selectedTaskProgress.value = null
    cancelSpeechEdit()
    await loadTaskFlowPage(task.taskId)
    startFlowPolling()
  }

  function startFlowPolling() {
    if (flowTimer) window.clearInterval(flowTimer)
    flowTimer = null
    if (!flowPollingActive || !flowPageOpen.value) return
    flowTimer = window.setInterval(() => {
      if (!selectedTaskFlow.value?.task?.id) return
      const status = selectedTaskFlow.value.task.status
      if (status === 'running' || status === 'ready') {
        loadTaskFlowPage(selectedTaskFlow.value.task.id, true)
      }
    }, 20000)
  }

  function setFlowPollingActive(active) {
    flowPollingActive = Boolean(active)
    if (!flowPollingActive) {
      clearFlowPolling()
      return
    }
    startFlowPolling()
    startUploaderDiagnosticsPolling()
  }

  async function loadTaskFlowPage(taskId, quiet = false) {
    if (!taskId) return
    const progressPromise = taskFlowApi.loadTaskProgress(taskId)
      .then(progress => { selectedTaskProgress.value = progress })
      .catch(err => { flowError.value = err instanceof Error ? err.message : String(err) })
    await Promise.all([
      progressPromise,
      loadTaskFlow(taskId, quiet),
    ])
  }

  async function loadTaskFlow(taskId, quiet = false) {
    if (!taskId) return
    const requestId = ++flowRequestId
    const detailStage = baseStageKey(selectedStageKey.value)
    if (!quiet) {
      flowLoading.value = true
    }
    try {
      const needsWhisperMetrics = ['demucs', 'whisper', 'translator', 'speaker', SPEECH_STAGE_KEY].includes(detailStage)
      const flowDetailStage = ['whisper', 'translator', 'speaker'].includes(detailStage) ? SPEECH_STAGE_KEY : detailStage
      const [flow, words, processing] = await Promise.all([
        taskFlowApi.loadTaskFlow(taskId, flowDetailStage),
        needsWhisperMetrics ? taskFlowApi.loadWhisperWordTimestamps(taskId).catch(() => []) : Promise.resolve(null),
        needsWhisperMetrics ? taskFlowApi.loadWhisperProcessing(taskId).catch(() => null) : Promise.resolve(null),
      ])
      if (requestId !== flowRequestId) return
      selectedTaskFlow.value = flow
      if (needsWhisperMetrics) {
        whisperWordTimestampsByTask.value = {
          ...whisperWordTimestampsByTask.value,
          [taskId]: Array.isArray(words) ? words : [],
        }
        whisperProcessingByTask.value = {
          ...whisperProcessingByTask.value,
          [taskId]: processing && typeof processing === 'object' ? processing : null,
        }
      }
      flowError.value = ''
    } catch (err) {
      if (requestId !== flowRequestId) return
      flowError.value = err instanceof Error ? err.message : String(err)
    } finally {
      if (requestId === flowRequestId) flowLoading.value = false
    }
  }

  async function selectTaskFlowStage(stageKey, subStage = 'main') {
    const taskId = selectedTaskFlow.value?.task?.id
    if (!taskId) return
    const normalized = detailStageKey(stageKey, subStage)
    if (normalized === selectedStageKey.value && selectedTaskFlow.value) return
    resetDiagnosticsPolling()
    selectedStageKey.value = normalized
    cancelSpeechEdit()
    selectedTaskFlow.value = { ...selectedTaskFlow.value, stages: [], minioObjects: [] }
    await loadTaskFlow(taskId)
  }

  function detailStageKey(stageKey, subStage = 'main') {
    if (stageKey === SPEECH_STAGE_KEY) return SPEECH_STAGE_KEY
    if (subStage && subStage !== 'main') return `${stageKey}:${subStage}`
    return stageKey
  }

  function baseStageKey(stageKey) {
    return String(stageKey || '').split(':', 1)[0]
  }

  function closeTaskFlow() {
    flowPageOpen.value = false
    selectedTaskFlow.value = null
    selectedTaskProgress.value = null
    flowError.value = ''
    cancelSpeechEdit()
    resetDiagnosticsPolling()
    clearFlowPolling()
  }

  function clearFlowPolling() {
    if (flowTimer) {
      window.clearInterval(flowTimer)
      flowTimer = null
    }
    clearUploaderDiagnosticsPolling()
  }

  function refreshTaskFlow() {
    const taskId = selectedTaskFlow.value?.task?.id
    if (taskId) {
      loadTaskFlowPage(taskId)
    }
  }

  async function submitNarrationSegments(response) {
    const taskId = selectedTaskFlow.value?.task?.id
    if (!taskId) throw new Error('缺少 task ID')
    const result = await publisherApi.submitNarrationSegments(taskId, response)
    await loadTaskFlow(taskId, true)
    return result
  }

  async function uploadNarrationImage(kind, file) {
    const taskId = selectedTaskFlow.value?.task?.id
    if (!taskId) throw new Error('缺少 task ID')
    const result = await publisherApi.uploadNarrationImage(taskId, kind, file)
    await loadTaskFlow(taskId, true)
    return result
  }

  function flowTaskTitle(flow) {
    const task = flow?.task || {}
    return task.title || flow?.videoInfo?.title || task.id || '任务详情'
  }

  function flowPrimaryCoverUrl(flow) {
    return normalizeResourceUrl(flow?.videoInfo?.source_thumbnail_url || flow?.task?.source_thumbnail_url || '')
  }

  function flowSourceUrl(flow) {
    return flow?.videoInfo?.source_webpage_url || flow?.videoInfo?.source_url || flow?.task?.source_url || ''
  }

  function flowCoverUrl(flow) {
    const primary = flowPrimaryCoverUrl(flow)
    if (primary && !brokenImageUrls.value[primary]) return primary
    return youtubeThumbnailUrl(flowSourceUrl(flow))
  }

  function flowDurationSeconds(flow) {
    const value = Number(flow?.videoInfo?.source_duration_seconds || flow?.task?.source_duration_seconds)
    return Number.isFinite(value) && value > 0 ? value : null
  }

  function tableColumns(table) {
    const columns = []
    const seen = new Set()
    for (const row of table?.rows || []) {
      for (const key of Object.keys(row || {})) {
        if (!seen.has(key) && !hiddenColumn(key)) {
          seen.add(key)
          columns.push(key)
        }
      }
    }
    return columns.sort((left, right) => columnRank(left) - columnRank(right))
  }

  function hiddenColumn(column) {
    return ['created_at', 'updated_at'].includes(column)
  }

  function columnRank(column) {
    if (column === 'item_index' || column === 'index') return -20
    if (column === 'id') return -10
    return 0
  }

  function tableCellText(column, value) {
    if (['start_time', 'end_time', 'actual_start_time', 'actual_end_time'].includes(column)) {
      return formatTimeline(value)
    }
    return shortValue(value, 90)
  }

  function tableCellSummary(column, value) {
    if (['start_time', 'end_time', 'actual_start_time', 'actual_end_time'].includes(column)) {
      return formatTimeline(value)
    }
    return shortValue(value, 70)
  }

  function tableRows(stage, tableName) {
    return stage?.tables?.find(table => table.name === tableName)?.rows || []
  }

  const {
    speechRows,
    speechColumns,
    showSpeechColumn,
    speechMoreRows,
    speechAudioAsset,
    speechTables,
  } = useSpeechRows({ selectedTaskFlow, tableRows })

  function uploadSubmissionRows(stage) {
    return tableRows(stage, 'uploader_task')
  }

  function publisherResultRows(stage) {
    return tableRows(stage, 'publisher_result').map(row => ({
      ...row,
      ...parseJsonObject(row.result_json),
    }))
  }

  function parseJsonObject(value) {
    if (!value) return {}
    if (typeof value === 'object' && !Array.isArray(value)) return value
    try {
      const parsed = JSON.parse(value)
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
    } catch {
      return {}
    }
  }

  function stageTableRows(stage, tableName) {
    return tableRows(stage, tableName)
  }

  function uploadPlatformName(platform) {
    return uploadPlatformText[platform] || platform || ''
  }

  function speechRowKey(row) {
    if (row?.row_key) return String(row.row_key)
    return row?.segment_id ? String(row.segment_id) : `index:${row?.item_index ?? ''}`
  }

  function canEditSpeechDstText(row) {
    return Boolean(selectedTaskFlow.value?.task?.id && (row?.segment_id || row?.translation_item_index != null))
  }

  function isEditingSpeechDstText(row) {
    return speechEditKey.value === speechRowKey(row)
  }

  function beginSpeechEdit(row) {
    if (!canEditSpeechDstText(row) || speechEditSaving.value) return
    speechEditKey.value = speechRowKey(row)
    speechEditDraft.value = row.dst_text || ''
    speechEditError.value = ''
  }

  function cancelSpeechEdit() {
    speechEditKey.value = ''
    speechEditDraft.value = ''
    speechEditError.value = ''
  }

  async function saveSpeechDstText(row) {
    const taskId = selectedTaskFlow.value?.task?.id
    if (!taskId || speechEditSaving.value) return
    speechEditSaving.value = true
    speechEditError.value = ''
    try {
      if (row?.segment_id) {
        await taskFlowApi.saveSpeakerSegmentDstText(taskId, row.segment_id, speechEditDraft.value)
      } else if (row?.translation_item_index != null) {
        await taskFlowApi.saveTranslatorSegmentDstText(taskId, row.translation_item_index, speechEditDraft.value)
      } else {
        return
      }
      cancelSpeechEdit()
      await loadTaskFlow(taskId, true)
    } catch (err) {
      speechEditError.value = err instanceof Error ? err.message : String(err)
    } finally {
      speechEditSaving.value = false
    }
  }

  function fieldRows(stage) {
    function normalizeField(field) {
      const asset = field.asset?.url
        ? { ...field.asset, url: normalizeResourceUrl(field.asset.url) }
        : field.asset
      return { ...field, asset }
    }
    return [
      ...(stage?.inputs || []).map(field => normalizeField({ ...field, direction: 'Input' })),
      ...(stage?.outputs || []).map(field => normalizeField({ ...field, direction: 'Output' })),
    ]
  }

  return {
    selectedTaskFlow,
    selectedTaskProgress,
    selectedStageKey,
    flowPageOpen,
    flowLoading,
    flowError,
    speechEditDraft,
    speechEditSaving,
    speechEditError,
    uploaderDiagnostics,
    uploaderDiagnosticsLoading,
    uploaderDiagnosticsError,
    whisperWordTimestamps,
    whisperProcessing,
    selectedStage,
    flowTabs,
    openTaskFlow,
    selectTaskFlowStage,
    loadTaskFlow,
    closeTaskFlow,
    clearFlowPolling,
    setFlowPollingActive,
    refreshTaskFlow,
    loadSelectedUploaderDiagnostics,
    submitNarrationSegments,
    uploadNarrationImage,
    flowTaskTitle,
    flowSourceUrl,
    flowCoverUrl,
    flowDurationSeconds,
    tableColumns,
    tableCellText,
    tableCellSummary,
    speechRows,
    uploadSubmissionRows,
    publisherResultRows,
    stageTableRows,
    uploadPlatformName,
    speechColumns,
    showSpeechColumn,
    speechMoreRows,
    canEditSpeechDstText,
    isEditingSpeechDstText,
    beginSpeechEdit,
    cancelSpeechEdit,
    saveSpeechDstText,
    speechAudioAsset,
    speechTables,
    stageMedia,
    demucsAudioMedia,
    fieldRows,
  }
}
