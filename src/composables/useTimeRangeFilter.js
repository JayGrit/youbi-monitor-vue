import { pad2 } from '../utils/format'

export const recentTimeRanges = [
  { value: 'recent', label: '近3小时' },
  { value: 'today', label: '今天' },
  { value: 'yesterday', label: '昨天' },
  { value: 'beforeYesterday', label: '前天' },
]

export function timeRangeParams(range) {
  const now = new Date()
  if (range === 'today') return dayRange(now)
  if (range === 'yesterday') return dayRange(addDays(now, -1))
  if (range === 'beforeYesterday') return dayRange(addDays(now, -2))
  const from = new Date(now.getTime() - 3 * 60 * 60 * 1000)
  return {
    createdFrom: localDateTime(from),
    createdTo: localDateTime(now),
  }
}

function dayRange(date) {
  const from = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const to = new Date(from)
  to.setDate(to.getDate() + 1)
  return {
    createdFrom: localDateTime(from),
    createdTo: localDateTime(to),
  }
}

function addDays(date, days) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

function localDateTime(date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())} ${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}`
}
