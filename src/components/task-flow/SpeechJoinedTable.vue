<script setup>
import { computed, onBeforeUnmount, ref } from 'vue'
import { formatJson, isLongValue } from '../../utils/jsonDisplay'

const props = defineProps({
  speechEditDraft: { type: String, default: '' },
  speechEditSaving: { type: Boolean, default: false },
  speechEditError: { type: String, default: '' },
  speechColumns: { type: Function, required: true },
  speechRows: { type: Function, required: true },
  showSpeechColumn: { type: Function, required: true },
  speechAudioAsset: { type: Function, required: true },
  logAudioEvent: { type: Function, required: true },
  speechMoreRows: { type: Function, required: true },
  isEditingSpeechDstText: { type: Function, required: true },
  saveSpeechDstText: { type: Function, required: true },
  cancelSpeechEdit: { type: Function, required: true },
  canEditSpeechDstText: { type: Function, required: true },
  beginSpeechEdit: { type: Function, required: true },
  tableCellText: { type: Function, required: true },
  tableCellSummary: { type: Function, required: true },
  words: { type: Array, default: () => [] },
  processing: { type: Object, default: null },
  vocalsPlayback: { type: Object, default: () => ({ currentMs: 0, playing: false }) },
})

const emit = defineEmits(['update:speechEditDraft'])

const playingAudioKey = ref('')
const gapThresholdText = ref('')
const audioByKey = new Map()

const transcriptWords = computed(() => props.words
  .map((word, index) => ({
    key: `${word.segmentIndex ?? word.segment_index ?? 0}-${word.wordIndex ?? word.word_index ?? index}`,
    text: String(word.text || '').trim(),
    segmentIndex: Number(word.segmentIndex ?? word.segment_index),
    startTime: Number(word.startTime ?? word.start_time ?? 0),
    endTime: Number(word.endTime ?? word.end_time ?? 0),
  }))
  .filter(word => word.text && Number.isFinite(word.startTime) && Number.isFinite(word.endTime))
  .sort((left, right) => left.startTime - right.startTime || left.endTime - right.endTime))

const rows = computed(() => props.speechRows())

const gapThresholdMs = computed(() => {
  const text = String(gapThresholdText.value || '').trim().replace(/秒$/u, 's')
  if (!text) return null
  const match = text.match(/^(\d+(?:\.\d+)?)\s*(ms|s)?$/i)
  if (!match) return null
  const value = Number(match[1])
  if (!Number.isFinite(value) || value < 0) return null
  return match[2]?.toLowerCase() === 'ms' ? value : value * 1000
})

const splitRowInfoByKey = computed(() => {
  const rowInfos = rows.value.map(row => ({
    key: rowKey(row),
    row,
    pysbdKey: rowPysbdKey(row),
  }))
  const infos = {}
  let toneIndex = 0
  let index = 0
  while (index < rowInfos.length) {
    const pysbdKey = rowInfos[index].pysbdKey
    let end = index + 1
    while (pysbdKey && end < rowInfos.length && rowInfos[end].pysbdKey === pysbdKey) {
      end += 1
    }
    if (pysbdKey && end - index > 1) {
      const tone = toneIndex % 2 === 0 ? 'blue' : 'red'
      for (let cursor = index; cursor < end; cursor += 1) {
        const split = rowSplitSegment(rowInfos[cursor].row)
        infos[rowInfos[cursor].key] = {
          tone,
          first: cursor === index,
          label: cursor === index ? splitLabel(split, end - index) : '',
        }
      }
      toneIndex += 1
    }
    index = end
  }
  return infos
})

const gapRowByKey = computed(() => {
  const threshold = gapThresholdMs.value
  if (threshold === null) return {}
  const rowInfos = rows.value.map(row => ({
    key: rowKey(row),
    start: strictRowTime(row, 'start_time'),
    end: strictRowTime(row, 'end_time'),
  }))
  const gaps = {}
  for (let index = 1; index < rowInfos.length; index += 1) {
    const previous = rowInfos[index - 1]
    const current = rowInfos[index]
    if (!Number.isFinite(previous.end) || !Number.isFinite(current.start)) continue
    if (current.start - previous.end > threshold) {
      gaps[current.key] = current.start - previous.end
    }
  }
  return gaps
})

const speechColumnLabels = {
  text: '文本',
  reference_wav_url: '原声',
  tts_wav_url: '配音',
  more_info: '更多',
}

function speechColumnLabel(column) {
  return speechColumnLabels[column] || column
}

function speechAudioKey(row, column) {
  return `${row.segment_id || row.item_index || ''}:${column}`
}

function speechAudioLabel(row, column) {
  const key = speechAudioKey(row, column)
  const name = speechColumnLabel(column)
  return playingAudioKey.value === key ? `暂停${name}` : `播放${name}`
}

function rowKey(row) {
  return String(row.segment_id || row.item_index || '')
}

function rowTone(row) {
  return splitRowInfoByKey.value[rowKey(row)]?.tone || ''
}

function rowSplitBadge(row) {
  return splitRowInfoByKey.value[rowKey(row)]?.label || ''
}

function hasGapBefore(row) {
  return gapRowByKey.value[rowKey(row)] != null
}

function sortedRows(rows, key) {
  return [...(Array.isArray(rows) ? rows : [])].sort((a, b) => Number(a?.[key] || 0) - Number(b?.[key] || 0))
}

function rowTime(row, key) {
  return Number(row?.[key] ?? 0)
}

function strictRowTime(row, key) {
  const value = row?.[key]
  if (value === null || value === undefined || value === '') return NaN
  return Number(value)
}

function segmentTime(segment, key) {
  return Number(segment?.[key] ?? segment?.[key.replace('_', '')] ?? 0)
}

function overlapMs(row, segment) {
  const start = Math.max(rowTime(row, 'start_time'), segmentTime(segment, 'startTime'))
  const end = Math.min(rowTime(row, 'end_time'), segmentTime(segment, 'endTime'))
  return Math.max(0, end - start)
}

function rowPysbdKey(row) {
  const split = rowSplitSegment(row)
  if (!split) return ''
  if (split.pysbdSegmentId != null) return `id:${split.pysbdSegmentId}`
  const pysbd = sortedRows(props.processing?.pysbdSegments, 'pysbdIndex')
    .find(segment => overlapMs(row, segment) > 0)
  if (pysbd?.id != null) return `id:${pysbd.id}`
  return ''
}

function rowSplitSegment(row) {
  const splitSegments = sortedRows(props.processing?.splitSegments, 'splitIndex')
  const itemIndex = Number(row?.item_index)
  const byIndex = splitSegments.find(segment => Number(segment.splitIndex) === itemIndex)
  if (byIndex) return byIndex
  let bestSegment = null
  let bestOverlap = 0
  for (const segment of splitSegments) {
    const overlap = overlapMs(row, segment)
    if (overlap > bestOverlap) {
      bestSegment = segment
      bestOverlap = overlap
    }
  }
  return bestSegment
}

function splitField(segment, ...keys) {
  for (const key of keys) {
    const value = segment?.[key]
    if (value !== null && value !== undefined && String(value).trim() !== '') {
      return String(value).trim()
    }
  }
  return ''
}

function splitLabel(split, count) {
  const reason = splitField(split, 'splitReason', 'split_reason', 'reason')
  const method = splitField(split, 'splitMethod', 'split_method', 'method', 'splitStrategy', 'split_strategy')
  const parts = []
  if (reason) parts.push(reason)
  if (method) parts.push(method)
  if (!parts.length) parts.push(`${count} split`)
  return parts.join(' / ')
}

function rowWords(row) {
  const itemIndex = Number(row?.item_index)
  const bySegment = transcriptWords.value.filter(word => word.segmentIndex === itemIndex)
  if (bySegment.length) return bySegment
  const start = rowTime(row, 'start_time')
  const end = rowTime(row, 'end_time')
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return []
  return transcriptWords.value.filter(word => word.endTime >= start && word.startTime <= end)
}

function isActiveWord(word) {
  const currentMs = Number(props.vocalsPlayback?.currentMs || 0)
  return Boolean(props.vocalsPlayback?.playing && currentMs >= word.startTime && currentMs <= word.endTime)
}

function toggleSpeechAudio(row, column) {
  const asset = props.speechAudioAsset(row, column)
  if (!asset) return
  const key = speechAudioKey(row, column)
  let audio = audioByKey.get(key)
  if (!audio) {
    audio = new Audio(asset.url)
    audio.preload = 'none'
    audio.addEventListener('play', event => props.logAudioEvent('play', asset, event))
    audio.addEventListener('playing', event => props.logAudioEvent('playing', asset, event))
    audio.addEventListener('waiting', event => props.logAudioEvent('waiting', asset, event))
    audio.addEventListener('error', event => props.logAudioEvent('error', asset, event))
    audio.addEventListener('pause', () => {
      if (playingAudioKey.value === key) playingAudioKey.value = ''
    })
    audio.addEventListener('ended', () => {
      if (playingAudioKey.value === key) playingAudioKey.value = ''
    })
    audioByKey.set(key, audio)
  }
  if (playingAudioKey.value === key && !audio.paused) {
    audio.pause()
    return
  }
  for (const [otherKey, otherAudio] of audioByKey.entries()) {
    if (otherKey !== key && !otherAudio.paused) otherAudio.pause()
  }
  playingAudioKey.value = key
  audio.play().catch(error => {
    playingAudioKey.value = ''
    console.error('[monitor-audio] play failed', { name: asset.name, url: asset.url, error })
  })
}

onBeforeUnmount(() => {
  for (const audio of audioByKey.values()) {
    audio.pause()
    audio.src = ''
  }
  audioByKey.clear()
})
</script>

<template>
  <div class="flow-section">
    <h4>Demucs / Whisper / Translator / Speaker Joined Rows</h4>
    <div class="speech-gap-toolbar">
      <label>
        间隔线阈值
        <input
          v-model="gapThresholdText"
          type="text"
          inputmode="decimal"
          placeholder="0.5s"
          aria-label="行间时间戳间隔阈值"
        />
      </label>
    </div>
    <div class="raw-table-scroll">
      <table class="speech-table">
        <thead>
          <tr>
            <th v-for="column in speechColumns()" :key="column" :class="`speech-col-${column}`">
              {{ speechColumnLabel(column) }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="row in rows"
            :key="row.segment_id || row.item_index"
            :class="[
              rowTone(row) ? `speech-split-row tone-${rowTone(row)}` : '',
              { 'speech-gap-row': hasGapBefore(row) },
            ]"
          >
            <td v-for="column in speechColumns()" :key="column" :class="`speech-col-${column}`">
              <template v-if="!showSpeechColumn(row, column)"></template>
              <details v-else-if="column === 'more_info'" class="speech-more">
                <summary>更多</summary>
                <dl>
                  <template v-for="[name, value] in speechMoreRows(row)" :key="name">
                    <dt>{{ name }}</dt>
                    <dd>{{ value }}</dd>
                  </template>
                </dl>
              </details>
              <div v-else-if="column === 'text'" class="speech-text-cell speech-combined-text">
                <span v-if="rowSplitBadge(row)" class="speech-split-badge">{{ rowSplitBadge(row) }}</span>
                <div class="speech-text-line">
                  <button
                    v-if="speechAudioAsset(row, 'reference_wav_url')"
                    type="button"
                    :class="[
                      'speech-audio-button',
                      { playing: playingAudioKey === speechAudioKey(row, 'reference_wav_url') },
                    ]"
                    :aria-label="speechAudioLabel(row, 'reference_wav_url')"
                    :title="speechAudioLabel(row, 'reference_wav_url')"
                    @click="toggleSpeechAudio(row, 'reference_wav_url')"
                  >
                    <span></span>
                  </button>
                  <span v-else class="speech-audio-placeholder"></span>
                  <p class="speech-source-text">
                    <template v-if="rowWords(row).length">
                      <span
                        v-for="word in rowWords(row)"
                        :key="word.key"
                        :class="['speech-source-word', { active: isActiveWord(word) }]"
                      >
                        {{ word.text }}
                      </span>
                    </template>
                    <template v-else>{{ row.source_text || '-' }}</template>
                  </p>
                </div>
                <div class="speech-text-line">
                  <button
                    v-if="speechAudioAsset(row, 'tts_wav_url')"
                    type="button"
                    :class="[
                      'speech-audio-button',
                      { playing: playingAudioKey === speechAudioKey(row, 'tts_wav_url') },
                    ]"
                    :aria-label="speechAudioLabel(row, 'tts_wav_url')"
                    :title="speechAudioLabel(row, 'tts_wav_url')"
                    @click="toggleSpeechAudio(row, 'tts_wav_url')"
                  >
                    <span></span>
                  </button>
                  <span v-else class="speech-audio-placeholder"></span>
                  <div class="speech-translation-text speech-edit-cell">
                    <template v-if="isEditingSpeechDstText(row)">
                      <input
                        :value="speechEditDraft"
                        class="speech-edit-input"
                        type="text"
                        @input="emit('update:speechEditDraft', $event.target.value)"
                        @keydown.enter.prevent="saveSpeechDstText(row)"
                        @keydown.esc.prevent="cancelSpeechEdit"
                      />
                      <div class="speech-edit-actions">
                        <button type="button" :disabled="speechEditSaving" @click="saveSpeechDstText(row)">
                          {{ speechEditSaving ? 'Saving' : 'Save' }}
                        </button>
                        <button type="button" :disabled="speechEditSaving" @click="cancelSpeechEdit">Cancel</button>
                      </div>
                      <p v-if="speechEditError" class="speech-edit-error">{{ speechEditError }}</p>
                    </template>
                    <template v-else>
                      <button
                        v-if="canEditSpeechDstText(row)"
                        type="button"
                        class="speech-edit-trigger"
                        @click="beginSpeechEdit(row)"
                      >
                        {{ row.dst_text || '-' }}
                      </button>
                      <p v-else>{{ row.dst_text || '-' }}</p>
                    </template>
                  </div>
                </div>
              </div>
              <span v-else-if="!isLongValue(row[column])">{{ tableCellText(column, row[column]) }}</span>
              <details v-else>
                <summary>{{ tableCellSummary(column, row[column]) }}</summary>
                <pre>{{ formatJson(row[column]) }}</pre>
              </details>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
