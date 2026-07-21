export function parseJsonObject(value) {
  if (!value) return {}
  if (typeof value === 'object' && !Array.isArray(value)) return value
  try {
    const parsed = JSON.parse(value)
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
  } catch {
    return {}
  }
}

export function formatTags(value) {
  if (Array.isArray(value)) return value.filter(Boolean).join('、') || '-'
  if (!value) return '-'
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed.filter(Boolean).join('、') || '-' : String(parsed)
  } catch {
    return String(value)
  }
}

export async function copyText(value) {
  if (!value) return
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value)
    return
  }
  const textarea = document.createElement('textarea')
  textarea.value = value
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)
  textarea.select()
  document.execCommand('copy')
  textarea.remove()
}

export function promptWithRatio(prompt, ratio) {
  const value = String(prompt || '').trim()
  if (!value || value.includes(ratio)) return value
  return `${value.replace(/[。\s]+$/, '')}。严格使用 ${ratio} 比例构图。`
}

export function jobPrompt(jobs, jobName, fallbackPrompt, ratio) {
  const job = jobs.find(item => item.job_name === jobName)
  const input = parseJsonObject(job?.input_json)
  return String(input.prompt || '').trim() || promptWithRatio(fallbackPrompt, ratio)
}

export function jobResult(jobs, jobName) {
  const job = jobs.find(item => item.job_name === jobName && item.status === 'success')
  return parseJsonObject(job?.result_json)
}

export function jobOperatorOpId(jobs, jobName) {
  const candidates = [jobName, `${jobName}_query`, `${jobName}_submit`]
  for (const candidate of candidates) {
    const job = jobs.find(row => row.job_name === candidate || row.jobName === candidate)
    const opId = String(job?.operator_op_id || job?.operatorOpId || job?.operator_run_id || '').trim()
    if (opId) return opId
  }
  return ''
}

export function jobsNamed(jobs, names) {
  const accepted = new Set(names)
  return jobs.filter(job => accepted.has(job.job_name))
}
