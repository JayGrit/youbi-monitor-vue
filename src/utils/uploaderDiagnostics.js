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
  if (!runId) return null

  if (platform && accountKey) {
    const suffix = `-${platform}-${accountKey}-`
    const suffixIndex = runId.lastIndexOf(suffix)
    if (suffixIndex > 0) {
      const attemptText = runId.slice(suffixIndex + suffix.length)
      const attempt = positiveInteger(attemptText)
      if (attempt !== null) return attempt
    }
  }

  const taskId = row?.taskId || row?.task_id || ''
  const taskAttempt = taskId.match(/-upload-video-(\d+)$/)?.[1]
  return positiveInteger(taskAttempt)
}

function positiveInteger(value) {
  if (!/^\d+$/.test(value || '')) return null
  const attempt = Number(value)
  return Number.isSafeInteger(attempt) && attempt > 0 ? attempt : null
}

export function diagnosticRunOptions(rows) {
  if (!rows.length) return []

  const byRunId = new Map()
  for (const row of rows) {
    const runId = diagnosticRunId(row)
    if (!runId) continue
    const current = byRunId.get(runId)
    const sortTime = diagnosticCreatedAt(row)
    if (!current) {
      byRunId.set(runId, {
        runId,
        attempt: diagnosticAttempt(row),
        createdAt: row?.createdAt || row?.created_at || '',
        firstSortTime: sortTime,
        sortTime,
      })
      continue
    }
    current.firstSortTime = Math.min(current.firstSortTime, sortTime)
    if (sortTime > current.sortTime) {
      current.createdAt = row?.createdAt || row?.created_at || ''
      current.sortTime = sortTime
    }
    if (current.attempt === null) {
      current.attempt = diagnosticAttempt(row)
    }
  }

  const chronological = [...byRunId.values()].sort((left, right) => {
    return left.firstSortTime - right.firstSortTime
      || left.runId.localeCompare(right.runId)
  })
  const usedAttempts = new Set(chronological.map(option => option.attempt).filter(attempt => attempt !== null))
  let nextAttempt = 1
  for (const option of chronological) {
    if (option.attempt !== null) continue
    while (usedAttempts.has(nextAttempt)) nextAttempt += 1
    option.attempt = nextAttempt
    usedAttempts.add(nextAttempt)
    nextAttempt += 1
  }

  return chronological.sort((left, right) => {
    return right.attempt - left.attempt
      || right.sortTime - left.sortTime
      || right.runId.localeCompare(left.runId)
  })
}
