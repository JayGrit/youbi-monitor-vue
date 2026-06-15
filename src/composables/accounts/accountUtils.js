import {
  formatTime,
  isSameDate,
  pad2,
  parseLocalDateTime,
} from '../../utils/format'
import { normalizeAccountAvatarUrl } from '../../utils/accountAvatar'

export const ACCOUNT_PLATFORM_TYPES = [
  'bilibili',
  'xiaohongshu',
  'douyin',
  'shipinhao',
  'kuaishou',
  'jinritoutiao',
  'x',
  'youtube',
]

export const QR_LOGIN_PLATFORM_TYPES = ['bilibili', 'xiaohongshu', 'douyin']

export function accountRows(accounts) {
  return accounts.map((account, index) => ({
    ...account,
    slot: index + 1,
    draftKey: account.accountKey || '',
    draftCooldownMinMinutes: cooldownMinutes(account.uploadCooldownMinSeconds, 60),
    draftCooldownMaxMinutes: cooldownMinutes(account.uploadCooldownMaxSeconds, 120),
    draftUploadQuietStartTime: timeInputValue(account.uploadQuietStartTime, '01:00'),
    draftUploadQuietEndTime: timeInputValue(account.uploadQuietEndTime, '07:00'),
    draftNextUploadAllowedAt: dateTimeLocalValue(account.nextUploadAllowedAt),
    draftEnabled: account.enabled !== false,
    draftDisplayName: '',
    draftAvatarUrl: account.avatarUrl || account.avatar_url || '',
  }))
}

function dateTimeLocalValue(value) {
  const date = parseLocalDateTime(value)
  if (!date) return ''
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}T${pad2(date.getHours())}:${pad2(date.getMinutes())}`
}

export function cooldownMinutes(seconds, fallback) {
  const value = Number(seconds)
  return Number.isFinite(value) ? String(Math.round(value / 60)) : String(fallback)
}

export function timeInputValue(value, fallback) {
  const text = String(value || '').trim()
  const match = text.match(/^(\d{2}:\d{2})(?::\d{2})?$/)
  return match ? match[1] : fallback
}

export function cooldownText(account) {
  const min = cooldownMinutes(account?.uploadCooldownMinSeconds, 60)
  const max = cooldownMinutes(account?.uploadCooldownMaxSeconds, 120)
  return min === max ? `${min} 分钟` : `${min}-${max} 分钟`
}

export function nextSendText(account) {
  if (account?.enabled === false) {
    return '已禁用'
  }
  if (account?.uploadRunningTaskId || Number(account?.uploadRunningCount || 0) > 0) {
    return '发送中'
  }
  const next = parseLocalDateTime(account?.nextUploadAllowedAt)
  if (!next || next.getTime() <= Date.now()) {
    return '可发送'
  }
  const now = new Date()
  const tomorrow = new Date(now)
  tomorrow.setDate(now.getDate() + 1)
  if (isSameDate(next, now)) {
    return formatTime(next)
  }
  if (isSameDate(next, tomorrow)) {
    return `明天${formatTime(next)}`
  }
  return `${pad2(next.getMonth() + 1)}-${pad2(next.getDate())} ${formatTime(next)}`
}

export function accountCountText(value) {
  const count = Number(value || 0)
  return Number.isFinite(count) ? String(Math.max(0, Math.trunc(count))) : '0'
}

export function rowKey(row) {
  return row?.accountKey || `slot_${row?.slot || 0}`
}

export function rowStatus(row) {
  if (!row.accountKey) return '空'
  if (row.valid === true) return '已登录'
  if (row.valid === false) return '未登录'
  return row.message || '已保存'
}

export function accountDisplay(row, platform) {
  if (!row.accountKey) return ''
  const commonName = row.displayName || row.display_name || row.accountName || row.account_name || row.name
  if (commonName) {
    return commonName
  }
  if (platform === 'bilibili') {
    return row.uname || row.accountKey
  }
  return row.nickname || row.accountKey
}

export function accountAvatarUrl(row) {
  return normalizeAccountAvatarUrl(
    row?.avatarUrl
    || row?.avatar_url
    || row?.avatar
    || row?.face
    || row?.headUrl
    || row?.head_url
    || '',
  )
}

export function accountAvatarInitial(row, platform) {
  const name = accountDisplay(row, platform) || row?.accountKey || '?'
  return String(name).trim().slice(0, 1).toUpperCase() || '?'
}

export function qrImageUrl(url) {
  if (!url) return ''
  return `https://api.qrserver.com/v1/create-qr-code/?size=184x184&data=${encodeURIComponent(url)}`
}
