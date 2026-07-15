import { SPEECH_STAGE_KEYS } from '../../domain/constants'
import { normalizeResourceUrl } from '../../utils/media'

export function useSpeechRows({ selectedTaskFlow, tableRows }) {
  function speechRows(view = 'whisper') {
    if (view === 'translator-chunk') {
      return translatorChunkRows()
    }
    const stages = selectedTaskFlow.value?.stages || []
    const whisper = stages.find(stage => stage.key === 'whisper')
    const speaker = stages.find(stage => stage.key === 'speaker') || stages.find(stage => stage.key === 'translator')
    const asrSegments = tableRows(whisper, 'whisper_asr_segment')
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
    const chunkRows = translatorChunkTableRows(translator)
    const translatorByIndex = rowsByIndex(tableRows(translator, 'translator_segment'))
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
        const translation = translatorByIndex[itemIndex] || {}
        const segment = speakerByIndex[itemIndex] || {}
        return {
          row_key: `translator-chunk:${row.chunk_index}:${row.row_order}:${itemIndex}`,
          speech_view: 'translator-chunk',
          segment_id: segment.id || '',
          translation_item_index: itemIndex,
          item_index: itemIndex,
          start_time: segment.start_time ?? translation.start_time ?? row.start_time,
          end_time: segment.end_time ?? translation.end_time ?? row.end_time,
          asr_text: row.text || '',
          src_text: segment.src_text || translation.src_text || row.text || '',
          source_text: segment.src_text || translation.src_text || row.text || '',
          dst_text: segment.dst_text || translation.dst_text || '',
          speaker: segment.speaker || translation.speaker || '',
          status: segment.status || '',
          attempt_count: segment.attempt_count ?? '',
          speed_ratio: formatRatio(segment.speed_ratio),
          actual_start_time: segment.actual_start_time ?? '',
          actual_end_time: segment.actual_end_time ?? '',
          src_lang: segment.src_lang || translation.src_lang || '',
          dst_lang: segment.dst_lang || translation.dst_lang || '',
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

  function translatorChunkTableRows(stage) {
    const currentRows = tableRows(stage, 'translator_chunk')
    return currentRows.length ? currentRows : tableRows(stage, 'translator-chunk')
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

  return {
    speechRows,
    speechColumns,
    showSpeechColumn,
    speechMoreRows,
    speechAudioAsset,
    speechTables,
  }
}

function formatRatio(value) {
  if (value === null || value === undefined || value === '') return ''
  const number = Number(value)
  return Number.isFinite(number) ? number.toFixed(2) : String(value)
}

function formatTimeline(value) {
  if (value === null || value === undefined || value === '') return '-'
  const totalMs = Math.max(0, Number(value || 0))
  if (!Number.isFinite(totalMs)) return String(value)
  const minutes = Math.floor(totalMs / 60000)
  const seconds = (totalMs % 60000) / 1000
  return `${minutes}:${seconds.toFixed(3).padStart(6, '0')}`
}
