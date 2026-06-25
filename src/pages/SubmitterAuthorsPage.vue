<script setup>
import { ref } from 'vue'

const props = defineProps({
  submitterAuthorTypeError: { type: String, default: '' },
  submitterAuthorTypeRows: { type: Array, default: () => [] },
  submitterTaskTypes: { type: Array, default: () => [] },
  submitterAuthorTypeSaving: { type: String, default: '' },
  submitterAuthorDeleting: { type: String, default: '' },
  autosaveSubmitterAuthorType: { type: Function, required: true },
  deleteSubmitterAuthor: { type: Function, required: true },
})

const editMode = ref(false)
const typeAutosaveTimers = new Map()

function scheduleTypeAutosave(row, autosave) {
  const author = String(row?.author || '')
  if (!author) return
  window.clearTimeout(typeAutosaveTimers.get(author))
  typeAutosaveTimers.set(author, window.setTimeout(() => {
    typeAutosaveTimers.delete(author)
    autosave(row)
  }, 500))
}

function flushTypeAutosave(row, autosave) {
  const author = String(row?.author || '')
  window.clearTimeout(typeAutosaveTimers.get(author))
  typeAutosaveTimers.delete(author)
  autosave(row)
}

function onResetCoverChange(row, autosave) {
  if (!row.draftResetCover) {
    row.draftCoverOrientation = ''
  } else if (!row.draftCoverOrientation) {
    row.draftCoverOrientation = 'horizontal'
  }
  autosave(row)
}

function onCoverOrientationChange(row, orientation, autosave) {
  if (!row.draftResetCover) return
  row.draftCoverOrientation = row.draftCoverOrientation === orientation ? '' : orientation
  if (!row.draftCoverOrientation) {
    row.draftCoverOrientation = orientation
  }
  autosave(row)
}

function boolMark(value) {
  return value ? '✔' : '✘'
}

function taskTypeLabel(value) {
  const option = props.submitterTaskTypes.find(item => item.taskType === value)
  return option?.name || value || '-'
}
</script>

<template>
  <section class="submitter-author-page" aria-label="作者管理">
    <section class="submitter-author-page-panel">
      <header class="submitter-author-panel-header">
        <div>
          <h1>作者管理</h1>
          <span>共 {{ submitterAuthorTypeRows.length }} 位作者</span>
        </div>
        <button type="button" class="submitter-author-edit" @click="editMode = !editMode">
          {{ editMode ? '完成' : '编辑' }}
        </button>
        <p v-if="submitterAuthorTypeError" class="inline-error">{{ submitterAuthorTypeError }}</p>
      </header>
      <div class="submitter-author-type-body">
        <table class="submitter-author-type-table" :class="{ editing: editMode }">
          <thead>
            <tr>
              <th>Type</th>
              <th>作者</th>
              <th>任务类型</th>
              <th>有背景音</th>
              <th>重制封面</th>
              <th>横向封面</th>
              <th>竖向封面</th>
              <th>拉取新视频</th>
              <th>B站已有人发</th>
              <th v-if="editMode">原语言</th>
              <th v-if="editMode">目标语言</th>
              <th v-if="editMode">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="submitterAuthorTypeRows.length === 0">
              <td :colspan="editMode ? 12 : 9" class="submitter-empty">暂无作者</td>
            </tr>
            <tr v-for="row in submitterAuthorTypeRows" :key="row.author">
              <td>
                <input
                  v-if="editMode"
                  v-model="row.draftType"
                  type="text"
                  placeholder="投稿 type"
                  :disabled="submitterAuthorTypeSaving === row.author"
                  @input="scheduleTypeAutosave(row, autosaveSubmitterAuthorType)"
                  @change="flushTypeAutosave(row, autosaveSubmitterAuthorType)"
                />
                <strong v-else class="account-type-cell submitter-author-type-badge">{{ row.draftType || '-' }}</strong>
              </td>
              <td>{{ row.author }}</td>
              <td>
                <select
                  v-if="editMode"
                  v-model="row.draftTaskType"
                  :disabled="submitterAuthorTypeSaving === row.author"
                  @change="autosaveSubmitterAuthorType(row)"
                >
                  <option
                    v-for="taskType in submitterTaskTypes"
                    :key="taskType.taskType"
                    :value="taskType.taskType"
                  >
                    {{ taskType.name || taskType.taskType }}
                  </option>
                </select>
                <span v-else>{{ taskTypeLabel(row.draftTaskType) }}</span>
              </td>
              <td>
                <label v-if="editMode" class="submitter-author-type-check">
                  <input
                    v-model="row.draftHasBackgroundAudio"
                    type="checkbox"
                    :disabled="submitterAuthorTypeSaving === row.author"
                    @change="autosaveSubmitterAuthorType(row)"
                  />
                </label>
                <span v-else class="submitter-author-bool">{{ boolMark(row.draftHasBackgroundAudio) }}</span>
              </td>
              <td>
                <label v-if="editMode" class="submitter-author-type-check">
                  <input
                    v-model="row.draftResetCover"
                    type="checkbox"
                    :disabled="submitterAuthorTypeSaving === row.author"
                    @change="onResetCoverChange(row, autosaveSubmitterAuthorType)"
                  />
                </label>
                <span v-else class="submitter-author-bool">{{ boolMark(row.draftResetCover) }}</span>
              </td>
              <td>
                <label v-if="editMode" class="submitter-author-type-check">
                  <input
                    :checked="row.draftCoverOrientation === 'horizontal'"
                    type="checkbox"
                    :disabled="submitterAuthorTypeSaving === row.author || !row.draftResetCover"
                    @change="onCoverOrientationChange(row, 'horizontal', autosaveSubmitterAuthorType)"
                  />
                </label>
                <span v-else class="submitter-author-bool">{{ boolMark(row.draftCoverOrientation === 'horizontal') }}</span>
              </td>
              <td>
                <label v-if="editMode" class="submitter-author-type-check">
                  <input
                    :checked="row.draftCoverOrientation === 'vertical'"
                    type="checkbox"
                    :disabled="submitterAuthorTypeSaving === row.author || !row.draftResetCover"
                    @change="onCoverOrientationChange(row, 'vertical', autosaveSubmitterAuthorType)"
                  />
                </label>
                <span v-else class="submitter-author-bool">{{ boolMark(row.draftCoverOrientation === 'vertical') }}</span>
              </td>
              <td>
                <label v-if="editMode" class="submitter-author-type-check">
                  <input
                    v-model="row.draftFetchNewVideos"
                    type="checkbox"
                    :disabled="submitterAuthorTypeSaving === row.author"
                    @change="autosaveSubmitterAuthorType(row)"
                  />
                </label>
                <span v-else class="submitter-author-bool">{{ boolMark(row.draftFetchNewVideos) }}</span>
              </td>
              <td>
                <label v-if="editMode" class="submitter-author-type-check">
                  <input
                    v-model="row.draftBilibiliExists"
                    type="checkbox"
                    :disabled="submitterAuthorTypeSaving === row.author"
                    @change="autosaveSubmitterAuthorType(row)"
                  />
                </label>
                <span v-else class="submitter-author-bool">{{ boolMark(row.draftBilibiliExists) }}</span>
              </td>
              <td v-if="editMode" class="submitter-author-language-cell">
                <input
                  v-model="row.draftSourceLanguage"
                  type="text"
                  placeholder="英文"
                  :disabled="submitterAuthorTypeSaving === row.author || submitterAuthorDeleting === row.author"
                  @change="autosaveSubmitterAuthorType(row)"
                  @blur="autosaveSubmitterAuthorType(row)"
                />
              </td>
              <td v-if="editMode" class="submitter-author-language-cell">
                <input
                  v-model="row.draftTargetLanguage"
                  type="text"
                  placeholder="中文"
                  :disabled="submitterAuthorTypeSaving === row.author || submitterAuthorDeleting === row.author"
                  @change="autosaveSubmitterAuthorType(row)"
                  @blur="autosaveSubmitterAuthorType(row)"
                />
              </td>
              <td v-if="editMode">
                <button
                  type="button"
                  class="submitter-author-delete"
                  :disabled="submitterAuthorDeleting === row.author || Boolean(submitterAuthorTypeSaving)"
                  @click="deleteSubmitterAuthor(row)"
                >
                  {{ submitterAuthorDeleting === row.author ? '删除中' : '删除' }}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </section>
</template>
