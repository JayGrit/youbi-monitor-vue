<script setup>
import { computed, ref } from 'vue'
import PlatformIcon from '../components/PlatformIcon.vue'

const props = defineProps({
  submitterAuthorTypeError: { type: String, default: '' },
  submitterAuthorTypeRows: { type: Array, default: () => [] },
  submitterTaskTypes: { type: Array, default: () => [] },
  platformIconUrls: { type: Object, default: () => ({}) },
  submitterAuthorTypeSaving: { type: String, default: '' },
  submitterAuthorDeleting: { type: String, default: '' },
  autosaveSubmitterAuthorType: { type: Function, required: true },
  deleteSubmitterAuthor: { type: Function, required: true },
})

const editMode = ref(false)
const typeAutosaveTimers = new Map()

const authorTypeGroups = computed(() => {
  const groups = new Map()
  for (const row of props.submitterAuthorTypeRows) {
    const topic = String(row?.draftTopic || row?.topic || '').trim() || '未设置'
    if (!groups.has(topic)) groups.set(topic, [])
    groups.get(topic).push(row)
  }
  return [...groups.entries()].map(([topic, rows]) => ({ topic, rows }))
})

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

function sourcePlatform(row) {
  const value = String(row?.source || row?.platform || '').trim().toLowerCase()
  if (value.includes('youtube') || value === 'yt') return 'youtube'
  if (value.includes('tiktok')) return 'tiktok'
  if (value.includes('douyin') || value.includes('iesdouyin')) return 'douyin'
  const text = `${row?.authorUrl || ''} ${row?.author || ''}`.toLowerCase()
  if (/youtu\.?be|youtube\.com/.test(text)) return 'youtube'
  if (/tiktok\.com/.test(text)) return 'tiktok'
  if (/douyin\.com|iesdouyin\.com/.test(text)) return 'douyin'
  return ''
}

function sourceLabel(row) {
  const platform = sourcePlatform(row)
  if (platform === 'youtube') return 'YouTube'
  if (platform === 'tiktok') return 'TikTok'
  if (platform === 'douyin') return '抖音'
  return '来源'
}

function sourceIconUrl(row) {
  const platform = sourcePlatform(row)
  if (platform === 'youtube') return props.platformIconUrls.youtube || ''
  if (platform === 'tiktok' || platform === 'douyin') return props.platformIconUrls.douyin || ''
  return ''
}

function authorHref(row) {
  const url = String(row?.authorUrl || '').trim()
  return /^https?:\/\//i.test(url) ? url : ''
}

function taskTypeLabel(value) {
  const option = props.submitterTaskTypes.find(item => item.taskType === value)
  return option?.name || value || '-'
}

function settingRows(row) {
  return [
    { key: 'background', label: '有背景音', value: row.draftHasBackgroundAudio },
    { key: 'resetCover', label: '重制封面', value: row.draftResetCover },
    { key: 'horizontal', label: '横向封面', value: row.draftCoverOrientation === 'horizontal' },
    { key: 'vertical', label: '竖向封面', value: row.draftCoverOrientation === 'vertical' },
    { key: 'fetchNew', label: '拉取新视频', value: row.draftFetchNewVideos },
    { key: 'bilibili', label: 'B站已有人发', value: row.draftBilibiliExists },
  ]
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
      <div class="submitter-author-type-body" :class="{ editing: editMode }">
        <p v-if="submitterAuthorTypeRows.length === 0" class="submitter-empty">暂无作者</p>
        <section v-for="group in authorTypeGroups" :key="group.topic" class="submitter-author-type-group">
          <header class="submitter-author-type-title">
            <strong>{{ group.topic }}</strong>
            <span>{{ group.rows.length }} 位作者</span>
          </header>
          <div class="submitter-author-type-head" aria-hidden="true">
            <span>来源</span>
            <span>作者</span>
            <span>任务类型</span>
            <span>配置</span>
            <span v-if="editMode">语言</span>
            <span v-if="editMode">操作</span>
          </div>
          <article v-for="row in group.rows" :key="row.author" class="submitter-author-type-row">
            <div class="submitter-author-source-cell">
              <PlatformIcon :src="sourceIconUrl(row)" :label="sourceLabel(row)" :platform="sourcePlatform(row)" :size="24" />
              <span>{{ sourceLabel(row) }}</span>
            </div>
            <div class="submitter-author-main-cell">
              <a
                v-if="authorHref(row)"
                class="submitter-author-link"
                :href="authorHref(row)"
                target="_blank"
                rel="noreferrer"
              >
                {{ row.author }}
              </a>
              <span v-else class="submitter-author-name">{{ row.author }}</span>
              <div v-if="editMode" class="submitter-author-type-edit">
                <input
                  v-model="row.draftTopic"
                  type="text"
                  placeholder="投稿 topic"
                  :disabled="submitterAuthorTypeSaving === row.author"
                  @input="scheduleTypeAutosave(row, autosaveSubmitterAuthorType)"
                  @change="flushTypeAutosave(row, autosaveSubmitterAuthorType)"
                />
              </div>
            </div>
            <div class="submitter-author-task-cell">
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
            </div>
            <div class="submitter-author-settings-cell">
              <div v-if="!editMode" class="submitter-author-setting-list">
                <span
                  v-for="setting in settingRows(row)"
                  :key="setting.key"
                  class="submitter-author-setting-pill"
                  :class="{ active: setting.value }"
                >
                  {{ setting.label }} {{ boolMark(setting.value) }}
                </span>
              </div>
              <div v-else class="submitter-author-check-grid">
                <label v-if="editMode" class="submitter-author-type-check">
                  <input
                    v-model="row.draftHasBackgroundAudio"
                    type="checkbox"
                    :disabled="submitterAuthorTypeSaving === row.author"
                    @change="autosaveSubmitterAuthorType(row)"
                  />
                  <span>有背景音</span>
                </label>
                <label v-if="editMode" class="submitter-author-type-check">
                  <input
                    v-model="row.draftResetCover"
                    type="checkbox"
                    :disabled="submitterAuthorTypeSaving === row.author"
                    @change="onResetCoverChange(row, autosaveSubmitterAuthorType)"
                  />
                  <span>重制封面</span>
                </label>
                <label v-if="editMode" class="submitter-author-type-check">
                  <input
                    :checked="row.draftCoverOrientation === 'horizontal'"
                    type="checkbox"
                    :disabled="submitterAuthorTypeSaving === row.author || !row.draftResetCover"
                    @change="onCoverOrientationChange(row, 'horizontal', autosaveSubmitterAuthorType)"
                  />
                  <span>横向封面</span>
                </label>
                <label v-if="editMode" class="submitter-author-type-check">
                  <input
                    :checked="row.draftCoverOrientation === 'vertical'"
                    type="checkbox"
                    :disabled="submitterAuthorTypeSaving === row.author || !row.draftResetCover"
                    @change="onCoverOrientationChange(row, 'vertical', autosaveSubmitterAuthorType)"
                  />
                  <span>竖向封面</span>
                </label>
                <label v-if="editMode" class="submitter-author-type-check">
                  <input
                    v-model="row.draftFetchNewVideos"
                    type="checkbox"
                    :disabled="submitterAuthorTypeSaving === row.author"
                    @change="autosaveSubmitterAuthorType(row)"
                  />
                  <span>拉取新视频</span>
                </label>
                <label v-if="editMode" class="submitter-author-type-check">
                  <input
                    v-model="row.draftBilibiliExists"
                    type="checkbox"
                    :disabled="submitterAuthorTypeSaving === row.author"
                    @change="autosaveSubmitterAuthorType(row)"
                  />
                  <span>B站已有人发</span>
                </label>
              </div>
            </div>
            <div v-if="editMode" class="submitter-author-language-cell">
                <input
                  v-model="row.draftSourceLanguage"
                  type="text"
                  placeholder="英文"
                  :disabled="submitterAuthorTypeSaving === row.author || submitterAuthorDeleting === row.author"
                  @change="autosaveSubmitterAuthorType(row)"
                  @blur="autosaveSubmitterAuthorType(row)"
                />
                <input
                  v-model="row.draftTargetLanguage"
                  type="text"
                  placeholder="中文"
                  :disabled="submitterAuthorTypeSaving === row.author || submitterAuthorDeleting === row.author"
                  @change="autosaveSubmitterAuthorType(row)"
                  @blur="autosaveSubmitterAuthorType(row)"
                />
            </div>
            <div v-if="editMode" class="submitter-author-action-cell">
                <button
                  type="button"
                  class="submitter-author-delete"
                  :disabled="submitterAuthorDeleting === row.author || Boolean(submitterAuthorTypeSaving)"
                  @click="deleteSubmitterAuthor(row)"
                >
                  {{ submitterAuthorDeleting === row.author ? '删除中' : '删除' }}
                </button>
            </div>
          </article>
        </section>
      </div>
    </section>
  </section>
</template>
