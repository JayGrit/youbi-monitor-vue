export function diagnosticRunId(row) {
  return row?.runId || row?.run_id || ''
}

export function diagnosticCreatedAt(row) {
  return Date.parse(row?.createdAt || row?.created_at || '') || 0
}

export function diagnosticAttempt(row) {
  const runId = diagnosticRunId(row)
  const platform = row?.platform || ''
  const accountKey = row?.accountKey || row?.account_key || ''
  if (!runId || !platform || !accountKey) return null

  const suffix = `-${platform}-${accountKey}-`
  const suffixIndex = runId.lastIndexOf(suffix)
  if (suffixIndex <= 0) return null

  const attemptText = runId.slice(suffixIndex + suffix.length)
  if (!/^\d+$/.test(attemptText)) return null

  const attempt = Number(attemptText)
  return Number.isSafeInteger(attempt) && attempt > 0 ? attempt : null
}

export function diagnosticRunOptions(rows) {
  if (!rows.length || rows.some(row => diagnosticAttempt(row) === null)) return []

  const byRunId = new Map()
  for (const row of rows) {
    const runId = diagnosticRunId(row)
    const current = byRunId.get(runId)
    const sortTime = diagnosticCreatedAt(row)
    if (!current || sortTime > current.sortTime) {
      byRunId.set(runId, {
        runId,
        attempt: diagnosticAttempt(row),
        createdAt: row?.createdAt || row?.created_at || '',
        sortTime,
      })
    }
  }

  return [...byRunId.values()].sort((left, right) => {
    return right.attempt - left.attempt
      || right.sortTime - left.sortTime
      || right.runId.localeCompare(left.runId)
  })
}
