<script setup>
import { SPEECH_STAGE_KEY, statusText } from '../domain/constants'
import { formatDateTime, formatDuration } from '../utils/format'
import { formatJson, isLongValue, shortValue } from '../utils/jsonDisplay'

defineProps({
  selectedTaskFlow: { type: Object, default: null },
  flowLoading: { type: Boolean, default: false },
  flowError: { type: String, default: '' },
  flowTabs: { type: Array, default: () => [] },
  selectedStageKey: { type: String, default: '' },
  selectedStage: { type: Object, default: null },
  speechEditDraft: { type: String, default: '' },
  speechEditSaving: { type: Boolean, default: false },
  speechEditError: { type: String, default: '' },
  flowTaskTitle: { type: Function, required: true },
  flowDurationSeconds: { type: Function, required: true },
  refreshTaskFlow: { type: Function, required: true },
  closeTaskFlow: { type: Function, required: true },
  flowCoverUrl: { type: Function, required: true },
  flowSourceUrl: { type: Function, required: true },
  markImageBroken: { type: Function, required: true },
  stageName: { type: Function, required: true },
  uploadSubmissionRows: { type: Function, required: true },
  uploadPlatformName: { type: Function, required: true },
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
  stageMedia: { type: Function, required: true },
  fieldRows: { type: Function, required: true },
  tableColumns: { type: Function, required: true },
})

const emit = defineEmits(['update:selectedStageKey', 'update:speechEditDraft'])
</script>

<template>
  <section class="flow-page" aria-label="任务流详情">
    <header class="flow-header">
      <div>
        <h2>{{ flowTaskTitle(selectedTaskFlow) }}</h2>
        <p>
          {{ selectedTaskFlow?.task?.id || '加载中' }}
          <template v-if="selectedTaskFlow?.task?.status">
            · {{ statusText[selectedTaskFlow.task.status] || selectedTaskFlow.task.status }}
          </template>
          <template v-if="selectedTaskFlow?.task?.current_stage">
            · current {{ selectedTaskFlow.task.current_stage }}
          </template>
          <template v-if="flowDurationSeconds(selectedTaskFlow) !== null">
            · {{ formatDuration(flowDurationSeconds(selectedTaskFlow)) }}
          </template>
        </p>
      </div>
      <div class="flow-actions">
        <button type="button" :disabled="flowLoading" @click="refreshTaskFlow">
          {{ flowLoading ? 'Refreshing' : 'Refresh' }}
        </button>
        <button type="button" @click="closeTaskFlow">Back</button>
      </div>
    </header>

    <div v-if="flowError" class="flow-error">Task flow API error: {{ flowError }}</div>
    <div v-else-if="flowLoading && !selectedTaskFlow" class="flow-loading">Loading task flow</div>
    <template v-else-if="selectedTaskFlow">
      <div v-if="flowCoverUrl(selectedTaskFlow)" class="flow-summary">
        <a
          class="source-cover-link"
          :href="flowSourceUrl(selectedTaskFlow) || flowCoverUrl(selectedTaskFlow)"
          target="_blank"
          rel="noreferrer"
          title="打开原视频"
        >
          <img :src="flowCoverUrl(selectedTaskFlow)" alt="" @error="markImageBroken(flowCoverUrl(selectedTaskFlow))" />
        </a>
      </div>

      <nav class="flow-tabs" aria-label="阶段详情标签">
        <button
          v-for="stage in flowTabs"
          :key="stage.key"
          type="button"
          :class="['flow-tab', stage.key === SPEECH_STAGE_KEY ? 'flow-tab-wide' : '', selectedStageKey === stage.key ? 'flow-tab-active' : '']"
          @click="emit('update:selectedStageKey', stage.key)"
        >
          <span :class="['dot', stage.status === 'failed' ? 'dot-failed' : stage.status === 'success' ? 'dot-success' : stage.status === 'running' ? 'dot-running' : 'dot-muted']"></span>
          <span>{{ stageName(stage) }}</span>
        </button>
      </nav>

      <section v-if="selectedStage" class="flow-stage">
        <div class="flow-stage-head">
          <div>
            <p>
              耗时 {{ formatDuration(selectedStage.elapsedSeconds) }}
            </p>
          </div>
        </div>

        <pre v-if="selectedStage.errorMessage" class="flow-stage-error">{{ selectedStage.errorMessage }}</pre>

        <div v-if="selectedStage.key === 'uploader' && uploadSubmissionRows(selectedStage).length" class="flow-section">
          <h4>平台发送任务</h4>
          <div class="upload-submission-grid">
            <article
              v-for="submission in uploadSubmissionRows(selectedStage)"
              :key="submission.id || `${submission.platform}-${submission.account_key}`"
              :class="['upload-submission-card', `status-${submission.status}`]"
            >
              <div class="upload-submission-head">
                <strong>{{ uploadPlatformName(submission.platform) }}</strong>
                <span :class="['task-badge', `status-${submission.status}`]">
                  {{ statusText[submission.status] || submission.status }}
                </span>
              </div>
              <div class="upload-submission-meta">
                <span>{{ submission.account_key || 'default' }}</span>
                <span v-if="submission.next_upload_allowed_at">
                  下次 {{ formatDateTime(submission.next_upload_allowed_at) }}
                </span>
              </div>
              <p v-if="submission.title">{{ submission.title }}</p>
              <pre v-if="submission.error_message" class="flow-stage-error">{{ submission.error_message }}</pre>
            </article>
          </div>
        </div>

        <div v-if="selectedStageKey === SPEECH_STAGE_KEY" class="flow-section">
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

        <div v-if="selectedStageKey !== SPEECH_STAGE_KEY && stageMedia(selectedStage).length" class="flow-section">
          <h4>Media Preview</h4>
          <div class="media-grid">
            <article v-for="asset in stageMedia(selectedStage)" :key="asset.url" class="media-item">
              <div class="media-title">
                <strong>{{ asset.name }}</strong>
                <a :href="asset.url" target="_blank" rel="noreferrer">打开</a>
              </div>
              <video v-if="asset.kind === 'video'" :src="asset.url" controls preload="metadata"></video>
              <audio
                v-else-if="asset.kind === 'audio'"
                :src="asset.url"
                controls
                preload="none"
                @loadstart="event => logAudioEvent('loadstart', asset, event)"
                @play="event => logAudioEvent('play', asset, event)"
                @playing="event => logAudioEvent('playing', asset, event)"
                @waiting="event => logAudioEvent('waiting', asset, event)"
                @error="event => logAudioEvent('error', asset, event)"
              ></audio>
              <img v-else-if="asset.kind === 'image'" :src="asset.url" alt="" />
              <p v-if="asset.objectName">{{ asset.objectName }}</p>
            </article>
          </div>
        </div>

        <div v-if="selectedStageKey !== SPEECH_STAGE_KEY" class="flow-section">
          <h4>Inputs / Outputs</h4>
          <div v-if="fieldRows(selectedStage).length" class="field-table">
            <div class="field-row field-header">
              <span>Type</span>
              <span>Field</span>
              <span>Value</span>
            </div>
            <div v-for="field in fieldRows(selectedStage)" :key="`${field.direction}-${field.name}`" class="field-row">
              <strong>{{ field.direction }}</strong>
              <span>{{ field.name }}</span>
              <span>
                <a v-if="field.asset?.url" :href="field.asset.url" target="_blank" rel="noreferrer">
                  {{ shortValue(field.value) }}
                </a>
                <template v-else>{{ shortValue(field.value) }}</template>
              </span>
              <pre v-if="isLongValue(field.value)" class="field-long">{{ formatJson(field.value) }}</pre>
            </div>
          </div>
          <p v-else class="flow-muted">No input or output fields.</p>
        </div>

        <div v-if="selectedStageKey !== SPEECH_STAGE_KEY" class="flow-section">
          <h4>Database Rows</h4>
          <div v-if="selectedStage.tables?.length" class="table-stack">
            <article v-for="table in selectedStage.tables" :key="table.name" class="raw-table">
              <div class="raw-table-head">
                <strong>{{ table.name }}</strong>
                <span>{{ table.rows.length }} rows<template v-if="table.truncated">, truncated</template></span>
              </div>
              <div class="raw-table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th v-for="column in tableColumns(table)" :key="column">{{ column }}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(row, rowIndex) in table.rows" :key="row.id || row.task_id || rowIndex">
                      <td v-for="column in tableColumns(table)" :key="column">
                        <span v-if="!isLongValue(row[column])">{{ tableCellText(column, row[column]) }}</span>
                        <details v-else>
                          <summary>{{ tableCellSummary(column, row[column]) }}</summary>
                          <pre>{{ formatJson(row[column]) }}</pre>
                        </details>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </article>
          </div>
          <p v-else class="flow-muted">No database rows.</p>
        </div>
      </section>
    </template>
  </section>
</template>
