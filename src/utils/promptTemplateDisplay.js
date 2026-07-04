const PROMPT_PARAM_LABELS = ['目标语言', '视频标题', '作者', '描述', '摘要', '热词', '纠错']
const MULTILINE_PARAM_LABELS = new Set(['描述'])

export function buildPromptTemplateDisplay(value) {
  const parsed = parseJsonValue(value)
  if (!parsed.ok) return null

  const messages = findMessages(parsed.value)
  if (!messages.length) return null

  const params = []
  const blocks = messages.map((message, index) => {
    const role = message && typeof message === 'object' ? String(message.role || `message_${index + 1}`) : `message_${index + 1}`
    const content = message && typeof message === 'object' ? message.content : message
    return {
      role,
      tokens: templateTokensForMessage(role, content, params),
    }
  })

  return {
    kind: 'prompt-template',
    metaText: requestMetaText(parsed.value),
    blocks,
    params,
  }
}

function parseJsonValue(value) {
  if (value === null || value === undefined || value === '') return { ok: false, value: null }
  if (typeof value !== 'string') return { ok: true, value }

  const trimmed = value.trim()
  if (!trimmed) return { ok: false, value: null }

  try {
    return { ok: true, value: JSON.parse(trimmed) }
  } catch {
    return { ok: false, value: null }
  }
}

function findMessages(value) {
  if (Array.isArray(value)) return isMessageList(value) ? value : []
  if (!value || typeof value !== 'object') return []

  const candidates = [
    value.messages,
    value.body?.messages,
    value.request?.messages,
    value.request?.body?.messages,
    value.payload?.messages,
    value.input?.messages,
  ]
  return candidates.find(isMessageList) || []
}

function isMessageList(value) {
  return Array.isArray(value) && value.some(item => item && typeof item === 'object' && 'content' in item)
}

function requestMetaText(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return ''
  const clone = { ...value }
  delete clone.messages
  if (!Object.keys(clone).length) return ''
  try {
    return JSON.stringify(clone, null, 2)
  } catch {
    return ''
  }
}

function templateTokensForMessage(role, content, params) {
  const text = contentToText(content)
  if (!text) return [{ text: '' }]

  if (role === 'system') {
    const tokens = tokenizeSystemPrompt(text, params)
    if (tokens.some(token => token.placeholder)) return tokens
  }

  const placeholder = addParam(params, `${role}内容`, text)
  return [{ text: placeholder, placeholder: true }]
}

function contentToText(content) {
  if (content === null || content === undefined) return ''
  if (typeof content === 'string') return decodeEscapedText(content)
  try {
    return JSON.stringify(content, null, 2)
  } catch {
    return String(content)
  }
}

function decodeEscapedText(text) {
  if (!/\\(?:u[0-9a-fA-F]{4}|["\\/bfnrt])/.test(text)) return text
  return text.replace(/\\(u[0-9a-fA-F]{4}|["\\/bfnrt])/g, (match, escaped) => {
    try {
      return JSON.parse(`"\\${escaped}"`)
    } catch {
      return match
    }
  })
}

function tokenizeSystemPrompt(text, params) {
  const lines = text.match(/[^\n]*(?:\n|$)/g).filter(line => line.length > 0)
  const tokens = []

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]
    const newline = line.endsWith('\n') ? '\n' : ''
    const body = newline ? line.slice(0, -1) : line
    const match = body.match(/^(\s*)(目标语言|视频标题|作者|描述|摘要|热词|纠错)([：:])([\s\S]*)$/)

    if (!match) {
      tokens.push({ text: line })
      continue
    }

    const [, indent, label, separator, firstValue] = match
    let actual = firstValue

    if (MULTILINE_PARAM_LABELS.has(label)) {
      while (index + 1 < lines.length && !startsWithPromptParam(lines[index + 1])) {
        index += 1
        actual += `\n${trimLineBreak(lines[index])}`
      }
    }

    const placeholder = addParam(params, label, actual)
    tokens.push({ text: `${indent}${label}${separator}` })
    tokens.push({ text: placeholder, placeholder: true })
    if (newline) tokens.push({ text: newline })
  }

  return tokens
}

function startsWithPromptParam(line) {
  const body = line.endsWith('\n') ? line.slice(0, -1) : line
  return PROMPT_PARAM_LABELS.some(label => new RegExp(`^\\s*${label}[：:]`).test(body))
}

function trimLineBreak(line) {
  return line.endsWith('\n') ? line.slice(0, -1) : line
}

function addParam(params, label, value) {
  const baseName = `<${label}>`
  let name = baseName
  let index = 2
  while (params.some(item => item.name === name)) {
    name = `<${label}${index}>`
    index += 1
  }
  params.push({ name, value: String(value ?? '') })
  return name
}
