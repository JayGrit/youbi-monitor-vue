import { computed, ref } from 'vue'
import {
  SPEECH_STAGE_KEY,
  SPEECH_STAGE_KEYS,
  stageNameText,
  uploadPlatformText,
} from '../domain/constants'
import { shortValue } from '../utils/jsonDisplay'
import { kindForField, kindForName, normalizeResourceUrl, youtubeThumbnailUrl } from '../utils/media'

export function useTaskFlow(monitorApi, brokenImageUrls) {
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
  const uploaderDiagnosticsByTask = ref({})
  const uploaderDiagnosticsLoading = ref(false)
  const uploaderDiagnosticsLoadingTask = ref('')
  const uploaderDiagnosticsError = ref('')
  const whisperWordTimestampsByTask = ref({})
  const whisperProcessingByTask = ref({})
  let flowTimer = null
  let uploaderDiagnosticsTimer = null
  let flowRequestId = 0

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

  const uploaderDiagnostics = computed(() => {
    const taskId = selectedTaskFlow.value?.task?.id
    return taskId ? uploaderDiagnosticsByTask.value[taskId] || [] : []
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
    clearUploaderDiagnosticsPolling()
    flowPageOpen.value = true
    selectedStageKey.value = detailStageKey(stageKey, subStage)
    selectedTaskFlow.value = null
    selectedTaskProgress.value = null
    cancelSpeechEdit()
    await loadTaskFlowPage(task.taskId)
    clearFlowPolling()
    flowTimer = window.setInterval(() => {
      if (!selectedTaskFlow.value?.task?.id) return
      const status = selectedTaskFlow.value.task.status
      if (status === 'running' || status === 'ready') {
        loadTaskFlowPage(selectedTaskFlow.value.task.id, true)
      }
    }, 5000)
  }

  async function loadTaskFlowPage(taskId, quiet = false) {
    if (!taskId) return
    const progressPromise = monitorApi.loadTaskProgress(taskId)
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
      const needsWhisperMetrics = ['demucs', 'whisper', SPEECH_STAGE_KEY].includes(detailStage)
      const [flow, words, processing] = await Promise.all([
        monitorApi.loadTaskFlow(taskId, detailStage),
        needsWhisperMetrics ? monitorApi.loadWhisperWordTimestamps(taskId).catch(() => []) : Promise.resolve(null),
        needsWhisperMetrics ? monitorApi.loadWhisperProcessing(taskId).catch(() => null) : Promise.resolve(null),
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
    selectedStageKey.value = normalized
    cancelSpeechEdit()
    selectedTaskFlow.value = { ...selectedTaskFlow.value, stages: [], minioObjects: [] }
    await loadTaskFlow(taskId)
  }

  function detailStageKey(stageKey, subStage = 'main') {
    if (SPEECH_STAGE_KEYS.includes(stageKey)) return SPEECH_STAGE_KEY
    if (stageKey === 'publisher' && subStage && subStage !== 'main') return `${stageKey}:${subStage}`
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
    clearFlowPolling()
  }

  function clearFlowPolling() {
    if (flowTimer) {
      window.clearInterval(flowTimer)
      flowTimer = null
    }
    clearUploaderDiagnosticsPolling()
  }

  function clearUploaderDiagnosticsPolling() {
    if (uploaderDiagnosticsTimer) {
      window.clearInterval(uploaderDiagnosticsTimer)
      uploaderDiagnosticsTimer = null
    }
  }

  function refreshTaskFlow() {
    const taskId = selectedTaskFlow.value?.task?.id
    if (taskId) {
      loadTaskFlowPage(taskId)
    }
  }

  async function loadUploaderDiagnostics(taskId, force = false) {
    if (!taskId || (!force && uploaderDiagnosticsByTask.value[taskId]) || uploaderDiagnosticsLoadingTask.value === taskId) return
    uploaderDiagnosticsLoading.value = true
    uploaderDiagnosticsLoadingTask.value = taskId
    uploaderDiagnosticsError.value = ''
    try {
      const rows = await monitorApi.loadUploaderDiagnostics(taskId)
      uploaderDiagnosticsByTask.value = {
        ...uploaderDiagnosticsByTask.value,
        [taskId]: Array.isArray(rows) ? rows : [],
      }
    } catch (err) {
      uploaderDiagnosticsError.value = err instanceof Error ? err.message : String(err)
    } finally {
      if (uploaderDiagnosticsLoadingTask.value === taskId) {
        uploaderDiagnosticsLoading.value = false
        uploaderDiagnosticsLoadingTask.value = ''
      }
    }
  }

  function loadSelectedUploaderDiagnostics() {
    const taskId = selectedTaskFlow.value?.task?.id
    if (taskId) {
      loadUploaderDiagnostics(taskId, true)
      if (!uploaderDiagnosticsTimer) {
        uploaderDiagnosticsTimer = window.setInterval(() => {
          const currentTaskId = selectedTaskFlow.value?.task?.id
          if (currentTaskId) {
            loadUploaderDiagnostics(currentTaskId, true)
          }
        }, 5000)
      }
    }
  }

  async function submitNarrationSegments(response) {
    const taskId = selectedTaskFlow.value?.task?.id
    if (!taskId) throw new Error('缺少 task ID')
    const result = await monitorApi.submitNarrationSegments(taskId, response)
    await loadTaskFlow(taskId, true)
    return result
  }

  async function uploadNarrationImage(kind, file) {
    const taskId = selectedTaskFlow.value?.task?.id
    if (!taskId) throw new Error('缺少 task ID')
    const result = await monitorApi.uploadNarrationImage(taskId, kind, file)
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

  function speechRows(view = 'whisper') {
    if (view === 'translator-chunk') {
      return translatorChunkRows()
    }
    const stages = selectedTaskFlow.value?.stages || []
    const whisper = stages.find(stage => stage.key === 'whisper')
    const speaker = stages.find(stage => stage.key === 'speaker') || stages.find(stage => stage.key === 'translator')
    const asrSegments = tableRows(whisper, 'asr_segment')
    const asrByIndex = rowsByIndex(asrSegments)
    const speakerByIndex = rowsByIndex(tableRows(speaker, 'speaker_segment'))
    const indexes = [...new Set([...Object.keys(asrByIndex), ...Object.keys(speakerByIndex)])]
      .map(index => Number(index))
      .filter(index => Number.isFinite(index))
      .sort((left, right) => left - right)
    return indexes.map(index => {
      const asr = asrByIndex[index] || {}
      const segment = speakerByIndex[index] || {}
      return {
        row_key: `whisper:${index}`,
        speech_view: 'whisper',
        segment_id: segment.id || '',
        item_index: index,
        start_time: segment.start_time ?? asr.start_time,
        end_time: segment.end_time ?? asr.end_time,
        asr_text: asr.text || '',
        src_text: segment.src_text || '',
        source_text: segment.src_text || asr.text || '',
        dst_text: segment.dst_text || '',
        speaker: segment.speaker || asr.speaker || '',
        status: segment.status || '',
        attempt_count: segment.attempt_count ?? '',
        speed_ratio: formatRatio(segment.speed_ratio),
        actual_start_time: segment.actual_start_time ?? '',
        actual_end_time: segment.actual_end_time ?? '',
        src_lang: segment.src_lang || '',
        dst_lang: segment.dst_lang || '',
        reference_wav_url: segment.reference_wav_url || '',
        tts_wav_url: segment.tts_wav_url || '',
        error_message: segment.error_message || '',
      }
    })
  }

  function translatorChunkRows() {
    const stages = selectedTaskFlow.value?.stages || []
    const translator = stages.find(stage => stage.key === 'translator')
    const speaker = stages.find(stage => stage.key === 'speaker') || translator
    const chunkRows = tableRows(translator, 'translator-chunk')
    const speakerByIndex = rowsByIndex(tableRows(speaker, 'speaker_segment'))
    return [...chunkRows]
      .filter(row => {
        const role = row.row_role || (row.is_reference ? 'reference' : 'normal')
        return !Boolean(Number(row.is_reference || 0)) && role === 'normal'
      })
      .sort((left, right) => {
        const leftChunk = Number(left.chunk_index ?? 0)
        const rightChunk = Number(right.chunk_index ?? 0)
        const leftOrder = Number(left.row_order ?? 0)
        const rightOrder = Number(right.row_order ?? 0)
        return leftChunk - rightChunk || leftOrder - rightOrder || Number(left.id || 0) - Number(right.id || 0)
      })
      .map(row => {
        const itemIndex = Number(row.item_index)
        const segment = speakerByIndex[itemIndex] || {}
        return {
          row_key: `translator-chunk:${row.chunk_index}:${row.row_order}:${itemIndex}`,
          speech_view: 'translator-chunk',
          segment_id: segment.id || '',
          item_index: itemIndex,
          start_time: row.start_time,
          end_time: row.end_time,
          asr_text: row.text || '',
          src_text: segment.src_text || row.text || '',
          source_text: row.text || segment.src_text || '',
          dst_text: segment.dst_text || '',
          speaker: segment.speaker || '',
          status: segment.status || '',
          attempt_count: segment.attempt_count ?? '',
          speed_ratio: formatRatio(segment.speed_ratio),
          actual_start_time: segment.actual_start_time ?? '',
          actual_end_time: segment.actual_end_time ?? '',
          src_lang: segment.src_lang || '',
          dst_lang: segment.dst_lang || '',
          reference_wav_url: segment.reference_wav_url || '',
          tts_wav_url: segment.tts_wav_url || '',
          error_message: segment.error_message || '',
          chunk_index: row.chunk_index,
          row_order: row.row_order,
          row_role: 'normal',
          is_reference: false,
          normal_text_len: row.normal_text_len,
          normal_item_count: row.normal_item_count,
          chunk_start_time: row.chunk_start_time,
          chunk_end_time: row.chunk_end_time,
          gap_before_ms: row.gap_before_ms,
          gap_after_ms: row.gap_after_ms,
        }
      })
  }

  function tableRows(stage, tableName) {
    return stage?.tables?.find(table => table.name === tableName)?.rows || []
  }

  function uploadSubmissionRows(stage) {
    return [
      ...tableRows(stage, 'uploader_task_bilibili'),
      ...tableRows(stage, 'uploader_task_douyin'),
      ...tableRows(stage, 'uploader_task_xiaohongshu'),
      ...tableRows(stage, 'uploader_task_shipinhao'),
      ...tableRows(stage, 'uploader_task_kuaishou'),
      ...tableRows(stage, 'uploader_task_jinritoutiao'),
    ]
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

  function rowsByIndex(rows) {
    const byIndex = {}
    for (const row of rows || []) {
      const index = Number(row.item_index ?? row.index)
      if (Number.isFinite(index)) {
        byIndex[index] = row
      }
    }
    return byIndex
  }

  function speechColumns() {
    return [
      'text',
      'more_info',
    ]
  }

  function showSpeechColumn(row, column) {
    return true
  }

  function sameText(left, right) {
    return normalizeText(left) !== '' && normalizeText(left) === normalizeText(right)
  }

  function normalizeText(value) {
    return String(value || '').trim().replace(/\s+/g, ' ')
  }

  function speechMoreRows(row) {
    const rows = [
      ['segment_id', row.segment_id || '-'],
      ['chunk_index', row.chunk_index ?? '-'],
      ['row_role', row.row_role || '-'],
      ['row_order', row.row_order ?? '-'],
      ['start_time', formatTimeline(row.start_time)],
      ['end_time', formatTimeline(row.end_time)],
      ['actual_start_time', formatTimeline(row.actual_start_time)],
      ['actual_end_time', formatTimeline(row.actual_end_time)],
      ['src_lang', row.src_lang || '-'],
      ['dst_lang', row.dst_lang || '-'],
      ['speaker', row.speaker || '-'],
      ['status', row.status || '-'],
      ['attempt_count', row.attempt_count === '' ? '-' : row.attempt_count],
      ['speed_ratio', row.speed_ratio || '-'],
      ['error_message', row.error_message || '-'],
    ]
    if (row.speech_view === 'translator-chunk') {
      rows.push(
        ['normal_text_len', row.normal_text_len ?? '-'],
        ['normal_item_count', row.normal_item_count ?? '-'],
        ['chunk_start_time', formatTimeline(row.chunk_start_time)],
        ['chunk_end_time', formatTimeline(row.chunk_end_time)],
        ['gap_before_ms', row.gap_before_ms ?? '-'],
        ['gap_after_ms', row.gap_after_ms ?? '-'],
      )
    }
    return rows
  }

  function speechRowKey(row) {
    if (row?.row_key) return String(row.row_key)
    return row?.segment_id ? String(row.segment_id) : `index:${row?.item_index ?? ''}`
  }

  function canEditSpeechDstText(row) {
    return Boolean(selectedTaskFlow.value?.task?.id && row?.segment_id)
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
    if (!taskId || !row?.segment_id || speechEditSaving.value) return
    speechEditSaving.value = true
    speechEditError.value = ''
    try {
      await monitorApi.saveSpeakerSegmentDstText(taskId, row.segment_id, speechEditDraft.value)
      cancelSpeechEdit()
      await loadTaskFlow(taskId, true)
    } catch (err) {
      speechEditError.value = err instanceof Error ? err.message : String(err)
    } finally {
      speechEditSaving.value = false
    }
  }

  function formatRatio(value) {
    if (value === null || value === undefined || value === '') return ''
    const number = Number(value)
    return Number.isFinite(number) ? number.toFixed(2) : String(value)
  }

  function speechAudioAsset(row, column) {
    const url = normalizeResourceUrl(row?.[column])
    if (!url) return null
    return {
      name: column,
      kind: 'audio',
      url,
    }
  }

  function speechTables() {
    const stages = selectedTaskFlow.value?.stages || []
    return stages
      .filter(stage => SPEECH_STAGE_KEYS.includes(stage.key))
      .flatMap(stage => stage.tables || [])
  }

  function formatTimeline(value) {
    if (value === null || value === undefined || value === '') return '-'
    const totalMs = Math.max(0, Number(value || 0))
    if (!Number.isFinite(totalMs)) return String(value)
    const minutes = Math.floor(totalMs / 60000)
    const seconds = (totalMs % 60000) / 1000
    return `${minutes}:${seconds.toFixed(3).padStart(6, '0')}`
  }

  function stageMedia(stage) {
    const items = []
    const seen = new Map()
    function add(asset, fallbackName, value) {
      if (!asset?.url) return
      const url = normalizeResourceUrl(asset.url)
      if (!url) return
      const name = asset.name || fallbackName
      const existing = seen.get(url)
      if (existing) {
        if (name && !existing.names.includes(name)) {
          existing.names.push(name)
          existing.name = existing.names.join(' ')
        }
        return
      }
      const item = {
        name: asset.name || fallbackName,
        names: name ? [name] : [],
        kind: asset.kind || kindForName(asset.url || value),
        url,
        objectName: asset.objectName || '',
      }
      seen.set(url, item)
      items.push(item)
    }
    for (const field of [...(stage?.inputs || []), ...(stage?.outputs || [])]) {
      add(field.asset, field.name, field.value)
    }
    for (const table of stage?.tables || []) {
      for (const row of table.rows || []) {
        for (const [key, value] of Object.entries(row || {})) {
          const asset = assetFromValue(key, value, stage.key)
          add(asset, key, value)
        }
      }
    }
    const stageKeys = stage?.key === SPEECH_STAGE_KEY
      ? SPEECH_STAGE_KEYS
      : [stage?.key]
    for (const asset of selectedTaskFlow.value?.minioObjects || []) {
      if (stageKeys.includes(asset.stage)) {
        add(asset, asset.name, asset.url || asset.objectName)
      }
    }
    return items.filter(item => item.kind !== 'error').slice(0, 60)
  }

  function demucsAudioMedia(stage) {
    const candidates = stageMedia(stage).filter(item => item.kind === 'audio')
    const slots = [
      { key: 'vocals', exactNames: ['audio_vocals_url', 'audio_vocals_path'], patterns: [/vocal/i, /voice/i, /人声/] },
      { key: 'bgm', exactNames: ['audio_bgm_url', 'audio_bgm_path'], patterns: [/bgm/i, /background/i, /no[_-]?vocals/i, /accompaniment/i, /背景/] },
    ]
    return slots.map(slot => {
      const exactAsset = candidates.find(item => (item.names || [item.name]).some(name => slot.exactNames.includes(name || '')))
      const asset = exactAsset || candidates.find(item => {
        const haystack = `${item.name || ''} ${(item.names || []).join(' ')} ${item.objectName || ''} ${item.url || ''}`
        return slot.patterns.some(pattern => pattern.test(haystack))
      })
      return asset ? { ...asset, key: slot.key } : null
    }).filter(Boolean)
  }

  function assetFromValue(name, value, stageKey) {
    const text = String(value || '').trim()
    if (!text || text.startsWith('db://')) return null
    if (text.startsWith('http://') || text.startsWith('https://') || text.startsWith('s3://')) {
      const url = normalizeResourceUrl(text)
      return { name, stage: stageKey, kind: kindForField(name, url), url }
    }
    return null
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
