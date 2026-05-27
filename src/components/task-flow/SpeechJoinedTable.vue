<script setup>
import { formatJson, isLongValue } from '../../utils/jsonDisplay'

defineProps({
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
</script>

<template>
  <div class="flow-section">
    <h4>Whisper / Translator / Speaker Joined Rows</h4>
    <div class="raw-table-scroll">
      <table class="speech-table">
        <thead>
          <tr>
            <th v-for="column in speechColumns()" :key="column">{{ column }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in speechRows()" :key="row.item_index">
            <td v-for="column in speechColumns()" :key="column">
              <template v-if="!showSpeechColumn(row, column)"></template>
              <template v-else-if="column === 'reference_wav_url' || column === 'tts_wav_url'">
                <audio
                  v-if="speechAudioAsset(row, column)"
                  :src="speechAudioAsset(row, column).url"
                  controls
                  preload="none"
                  @loadstart="event => logAudioEvent('loadstart', speechAudioAsset(row, column), event)"
                  @play="event => logAudioEvent('play', speechAudioAsset(row, column), event)"
                  @playing="event => logAudioEvent('playing', speechAudioAsset(row, column), event)"
                  @waiting="event => logAudioEvent('waiting', speechAudioAsset(row, column), event)"
                  @error="event => logAudioEvent('error', speechAudioAsset(row, column), event)"
                ></audio>
                <span v-else>-</span>
              </template>
              <details v-else-if="column === 'more_info'" class="speech-more">
                <summary>More</summary>
                <dl>
                  <template v-for="[name, value] in speechMoreRows(row)" :key="name">
                    <dt>{{ name }}</dt>
                    <dd>{{ value }}</dd>
                  </template>
                </dl>
              </details>
              <div v-else-if="column === 'dst_text'" class="speech-text-cell speech-edit-cell">
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
                  <p>{{ row.dst_text || '-' }}</p>
                  <button
                    v-if="canEditSpeechDstText(row)"
                    type="button"
                    class="speech-edit-button"
                    @click="beginSpeechEdit(row)"
                  >
                    Edit
                  </button>
                </template>
              </div>
              <p v-else-if="column === 'asr_text' || column === 'src_text'" class="speech-text-cell">
                {{ row[column] || '-' }}
              </p>
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
