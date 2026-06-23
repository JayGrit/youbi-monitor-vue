import { isLongValue, shortValue } from '../../../utils/jsonDisplay'
import { kindForField, normalizeResourceUrl } from '../../../utils/media'

export const COMBINER_TABLES = {
  jobs: ['combiner_jobs', 'combiner_job'],
  result: ['combiner_result', 'combiner_results'],
  audio: ['combiner_audio_mix', 'combiner_audio', 'combiner_audio_segment', 'combiner_tts_segment', 'combiner_mix'],
  subtitle: ['combiner_subtitle', 'combiner_subtitles', 'combiner_caption', 'combiner_captions'],
  finalVideo: ['combiner_final_video', 'combiner_video', 'combiner_publish_metadata', 'combiner_metadata', 'uploader_default_metadata'],
}

const COLUMN_RANK = {
  item_index: -40,
  index: -35,
  id: -30,
  job_name: -25,
  status: -20,
  file_type: -15,
  language: -14,
  src_lang: -13,
  dst_lang: -12,
  start_time: -11,
  end_time: -10,
  output_url: 20,
  final_video_url: 21,
  subtitle_url: 22,
  error_message: 90,
}

const HIDDEN_COLUMNS = new Set(['created_at', 'updated_at'])

export function tableRows(stage, names) {
  const accepted = new Set(Array.isArray(names) ? names : [names])
  return (stage?.tables || [])
    .filter(table => accepted.has(table.name))
    .flatMap(table => table.rows || [])
}

export function tablesMatching(stage, pattern) {
  return (stage?.tables || [])
    .filter(table => pattern.test(String(table.name || '')))
    .flatMap(table => (table.rows || []).map(row => ({ ...row, table_name: table.name })))
}

export function tableNames(stage) {
  return (stage?.tables || []).map(table => table.name).filter(Boolean)
}

export function columnsForRows(rows) {
  const seen = new Set()
  const columns = []
  for (const row of rows || []) {
    for (const key of Object.keys(row || {})) {
      if (HIDDEN_COLUMNS.has(key) || seen.has(key)) continue
      seen.add(key)
      columns.push(key)
    }
  }
  const sorted = columns.sort((left, right) => columnRank(left) - columnRank(right) || left.localeCompare(right))
  return sorted.length || !rows?.length ? sorted : ['value']
}

export function rowKey(row, index) {
  return row?.id ?? row?.row_key ?? row?.item_index ?? row?.index ?? index
}

export function cellText(value, max = 100) {
  return shortValue(value, max)
}

export function longCell(value) {
  return isLongValue(value)
}

export function statusClass(status) {
  return `status-${status || 'pending'}`
}

export function fieldEntries(row, preferred = []) {
  const keys = [
    ...preferred,
    ...Object.keys(row || {}).filter(key => !preferred.includes(key)),
  ].filter(key => !HIDDEN_COLUMNS.has(key) && row?.[key] !== undefined && row?.[key] !== null && row?.[key] !== '')
  return keys.map(key => ({
    name: key,
    value: row[key],
    asset: assetForField(key, row[key]),
  }))
}

export function assetForField(name, value) {
  const url = normalizeResourceUrl(value)
  if (!isUsableUrl(url)) return null
  return {
    name,
    kind: kindForField(name, url),
    url,
  }
}

export function isUsableUrl(value) {
  const text = String(value || '').trim()
  return /^(https?:|\/monitor\/minio\/|\/minio\/|s3:\/\/)/.test(text)
}

export function mediaByKind(media, acceptedKinds) {
  const accepted = new Set(acceptedKinds)
  return (media || []).filter(item => accepted.has(item.kind))
}

export function rowsWithAnyField(rows, pattern) {
  return (rows || []).filter(row => Object.entries(row || {}).some(([key, value]) => {
    if (value === null || value === undefined || value === '') return false
    return pattern.test(`${key} ${String(value)}`)
  }))
}

export function jobsMatching(jobs, pattern) {
  return (jobs || []).filter(job => pattern.test(`${job.job_name || ''} ${job.status || ''} ${job.input_json || ''} ${job.result_json || ''}`))
}

function columnRank(column) {
  return COLUMN_RANK[column] ?? 0
}
