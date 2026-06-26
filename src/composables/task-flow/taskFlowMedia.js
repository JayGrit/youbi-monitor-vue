import { SPEECH_STAGE_KEY, SPEECH_STAGE_KEYS } from '../../domain/constants'
import { kindForField, kindForName, normalizeResourceUrl } from '../../utils/media'

export function createTaskFlowMedia({ selectedTaskFlow }) {
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

  return {
    stageMedia,
    demucsAudioMedia,
  }
}

function assetFromValue(name, value, stageKey) {
  const text = String(value || '').trim()
  if (!text || text.startsWith('db://')) return null
  if (text.startsWith('http://') || text.startsWith('https://')) {
    const url = normalizeResourceUrl(text)
    return { name, stage: stageKey, kind: kindForField(name, url), url }
  }
  return null
}
