<script setup>
import { onBeforeUnmount, ref } from 'vue'
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
})

const emit = defineEmits(['update:speechEditDraft'])

const playingAudioKey = ref('')
const audioByKey = new Map()

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
    <div class="raw-table-scroll">
      <table class="speech-table">
        <thead>
          <tr>
            <th
              v-for="column in speechColumns()"
              :key="column"
              :class="`speech-col-${column}`"
            >
              {{ speechColumnLabel(column) }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in speechRows()" :key="row.segment_id || row.item_index">
            <td v-for="column in speechColumns()" :key="column" :class="`speech-col-${column}`">
              <template v-if="!showSpeechColumn(row, column)"></template>
              <template v-else-if="column === 'reference_wav_url' || column === 'tts_wav_url'">
                <button
                  v-if="speechAudioAsset(row, column)"
                  type="button"
                  :class="['speech-audio-button', { playing: playingAudioKey === speechAudioKey(row, column) }]"
                  :aria-label="speechAudioLabel(row, column)"
                  :title="speechAudioLabel(row, column)"
                  @click="toggleSpeechAudio(row, column)"
                >
                  <span></span>
                </button>
                <span v-else>-</span>
              </template>
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
                <p class="speech-source-text">{{ row.source_text || '-' }}</p>
                <div class="speech-translation-text speech-edit-cell">
                  <template v-if="isEditingSpeechDstText(row)">
                    <textarea
                      :value="speechEditDraft"
                      class="speech-edit-textarea"
                      rows="5"
                      @input="emit('update:speechEditDraft', $event.target.value)"
                    ></textarea>
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
