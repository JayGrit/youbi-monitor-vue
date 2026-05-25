<script setup>
import {
  SUBMITTER_DURATION_FILTERS,
  SUBMITTER_NUMERIC_FIELDS,
  SUBMITTER_SORT_OPTIONS,
  SUBMITTER_UPLOAD_FILTERS,
} from '../domain/constants'
import { formatDuration, formatNumber } from '../utils/format'

defineProps({
  submitterError: { type: String, default: '' },
  submitterLoading: { type: Boolean, default: false },
  submitterFocusedBatch: { type: String, default: '' },
  submitterMessage: { type: String, default: '' },
  submitterStatusCounts: { type: String, default: '' },
  submitterUrl: { type: String, default: '' },
  submitterBusy: { type: Boolean, default: false },
  submitterAuthor: { type: String, default: '' },
  submitterAuthorBusy: { type: Boolean, default: false },
  submitterUploader: { type: String, default: '' },
  submitterAuthors: { type: Array, default: () => [] },
  submitterDurationFilter: { type: String, default: 'all' },
  submitterSort: { type: String, default: 'updated_desc' },
  submitterUploadFilter: { type: String, default: 'unuploaded' },
  submitterFieldsOpen: { type: Boolean, default: false },
  submitterVisibleFields: { type: Object, required: true },
  submitterFields: { type: Array, default: () => [] },
  submitterVisibleFieldList: { type: Array, default: () => [] },
  submitterFilteredVideos: { type: Array, default: () => [] },
  submitterFilteredTotal: { type: Number, default: 0 },
  submitterPage: { type: Number, default: 1 },
  submitterPageCount: { type: Number, default: 1 },
  submitterSubmittingId: { type: String, default: '' },
  submitterJsonPayload: { type: Object, default: null },
  submitterJsonTitle: { type: String, default: '' },
  submitterAuthorTypeOpen: { type: Boolean, default: false },
  submitterAuthorTypeError: { type: String, default: '' },
  submitterAuthorTypeRows: { type: Array, default: () => [] },
  submitterAuthorTypeSaving: { type: String, default: '' },
  createSubmitterVideo: { type: Function, required: true },
  importSubmitterAuthor: { type: Function, required: true },
  applySubmitterFilters: { type: Function, required: true },
  openSubmitterAuthorTypes: { type: Function, required: true },
  resetSubmitterFilters: { type: Function, required: true },
  clearSubmitterBatchFocus: { type: Function, required: true },
  toggleSubmitterFieldsPanel: { type: Function, required: true },
  selectAllSubmitterFields: { type: Function, required: true },
  selectCommonSubmitterFields: { type: Function, required: true },
  selectNoSubmitterFields: { type: Function, required: true },
  toggleSubmitterField: { type: Function, required: true },
  submitterFieldLabel: { type: Function, required: true },
  submitterVideoThumb: { type: Function, required: true },
  submitterCachedThumb: { type: Function, required: true },
  submitterVideoHref: { type: Function, required: true },
  submitterVideoTitle: { type: Function, required: true },
  submitterFieldValue: { type: Function, required: true },
  submitterValueKind: { type: Function, required: true },
  formatUnixSeconds: { type: Function, required: true },
  submitterArrayPreview: { type: Function, required: true },
  submitterJsonPreview: { type: Function, required: true },
  showSubmitterJson: { type: Function, required: true },
  submitVideoToYoubi: { type: Function, required: true },
  setSubmitterPage: { type: Function, required: true },
  closeSubmitterJson: { type: Function, required: true },
  closeSubmitterAuthorTypes: { type: Function, required: true },
  autosaveSubmitterAuthorType: { type: Function, required: true },
})

const emit = defineEmits([
  'update:submitterUrl',
  'update:submitterAuthor',
  'update:submitterUploader',
  'update:submitterDurationFilter',
  'update:submitterSort',
  'update:submitterUploadFilter',
])
</script>

<template>
  <section class="submitter-page" aria-label="素材采集">
    <section v-if="submitterError || (!submitterLoading && (submitterFocusedBatch || submitterMessage))" class="submitter-status">
      <span v-if="submitterError">Submitter API 异常：{{ submitterError }}</span>
      <span v-else>{{ submitterFocusedBatch ? `当前批次：${submitterFocusedBatch.slice(0, 8)}。` : '' }}{{ submitterMessage || '素材库已就绪。' }}</span>
      <span v-if="submitterStatusCounts" class="submitter-status-counts">{{ submitterStatusCounts }}</span>
    </section>

    <section class="submitter-actions-panel">
      <form class="submitter-submit-row" @submit.prevent="createSubmitterVideo">
        <label>
          <span>视频链接</span>
          <input
            :value="submitterUrl"
            type="url"
            placeholder="https://www.youtube.com/watch?v=..."
            required
            @input="emit('update:submitterUrl', $event.target.value)"
          />
        </label>
        <button type="submit" :disabled="submitterBusy">{{ submitterBusy ? '抓取中' : '抓取并保存' }}</button>
      </form>
      <form class="submitter-submit-row" @submit.prevent="importSubmitterAuthor">
        <label>
          <span>频道链接</span>
          <input
            :value="submitterAuthor"
            type="text"
            placeholder="@handle 或 https://www.youtube.com/@channel"
            required
            @input="emit('update:submitterAuthor', $event.target.value)"
          />
        </label>
        <button type="submit" :disabled="submitterAuthorBusy">{{ submitterAuthorBusy ? '导入中' : '导入作者全部视频' }}</button>
      </form>
    </section>

    <section class="submitter-controls">
      <div class="submitter-filter-grid">
        <label>
          <span>作者</span>
          <select
            :value="submitterUploader"
            @change="emit('update:submitterUploader', $event.target.value); applySubmitterFilters()"
          >
            <option value="">全部作者</option>
            <option v-for="author in submitterAuthors" :key="author" :value="author">{{ author }}</option>
          </select>
        </label>
        <label>
          <span>视频时长</span>
          <select
            :value="submitterDurationFilter"
            @change="emit('update:submitterDurationFilter', $event.target.value); applySubmitterFilters()"
          >
            <option v-for="option in SUBMITTER_DURATION_FILTERS" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
        </label>
        <label>
          <span>排序</span>
          <select
            :value="submitterSort"
            @change="emit('update:submitterSort', $event.target.value); applySubmitterFilters()"
          >
            <option v-for="option in SUBMITTER_SORT_OPTIONS" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
        </label>
        <label>
          <span>上传</span>
          <select
            :value="submitterUploadFilter"
            @change="emit('update:submitterUploadFilter', $event.target.value); applySubmitterFilters()"
          >
            <option v-for="option in SUBMITTER_UPLOAD_FILTERS" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
        </label>
        <div class="submitter-filter-actions">
          <button type="button" @click="openSubmitterAuthorTypes">作者 Type</button>
          <button type="button" @click="resetSubmitterFilters">重置</button>
          <button v-if="submitterFocusedBatch" type="button" @click="clearSubmitterBatchFocus">查看全部</button>
        </div>
      </div>

      <section class="submitter-fields-section">
        <button type="button" class="submitter-fields-toggle" @click="toggleSubmitterFieldsPanel">
          <span>字段选择</span>
          <strong>{{ submitterVisibleFields.size }}/{{ submitterFields.length }}</strong>
        </button>
        <div v-if="submitterFieldsOpen" class="submitter-fields-body">
          <div class="submitter-columns-head">
            <strong>附加字段</strong>
            <div>
              <button type="button" @click="selectAllSubmitterFields">全选</button>
              <button type="button" @click="selectCommonSubmitterFields">常用字段</button>
              <button type="button" @click="selectNoSubmitterFields">只看固定列</button>
            </div>
          </div>
          <div class="submitter-field-panel">
            <label v-for="field in submitterFields" :key="field" class="submitter-column-toggle">
              <input
                type="checkbox"
                :checked="submitterVisibleFields.has(field)"
                @change="event => toggleSubmitterField(field, event.target.checked)"
              />
              <span>{{ submitterFieldLabel(field) }}</span>
            </label>
          </div>
        </div>
      </section>
    </section>

    <section class="submitter-table-panel">
      <div class="submitter-table-wrap">
        <table class="submitter-table">
          <thead>
            <tr>
              <th class="submitter-fixed-col">视频</th>
              <th v-for="field in submitterVisibleFieldList" :key="field">{{ submitterFieldLabel(field) }}</th>
              <th class="submitter-action-col">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!submitterLoading && submitterFilteredVideos.length === 0">
              <td :colspan="submitterVisibleFieldList.length + 2" class="submitter-empty">
                {{ submitterFocusedBatch ? '当前批次暂无记录，频道扫描完成后会自动刷新。' : '暂无匹配记录' }}
              </td>
            </tr>
            <tr v-for="item in submitterFilteredVideos" :key="item.id || item.video_id || item.webpage_url">
              <td class="submitter-fixed-col">
                <div class="submitter-video-card">
                  <img v-if="submitterVideoThumb(item)" :src="submitterCachedThumb(item)" alt="" loading="lazy" decoding="async" />
                  <div v-else class="submitter-thumb-empty"></div>
                  <div>
                    <a
                      v-if="submitterVideoHref(item)"
                      :href="submitterVideoHref(item)"
                      target="_blank"
                      rel="noreferrer"
                      class="submitter-video-title"
                    >
                      {{ submitterVideoTitle(item) }}
                    </a>
                    <strong v-else class="submitter-video-title">{{ submitterVideoTitle(item) }}</strong>
                    <div class="submitter-video-meta">
                      <span>{{ formatDuration(submitterFieldValue(item, 'duration')) }}</span>
                      <span>{{ formatNumber(submitterFieldValue(item, 'view_count')) }} 播放</span>
                    </div>
                  </div>
                </div>
              </td>
              <td
                v-for="field in submitterVisibleFieldList"
                :key="field"
                :class="{ 'submitter-num': SUBMITTER_NUMERIC_FIELDS.has(field) }"
              >
                <template v-if="submitterValueKind(field, submitterFieldValue(item, field)) === 'detail'">
                  <button type="button" class="submitter-json-button" @click="showSubmitterJson(item)">查看</button>
                </template>
                <template v-else-if="submitterValueKind(field, submitterFieldValue(item, field)) === 'empty'">-</template>
                <template v-else-if="submitterValueKind(field, submitterFieldValue(item, field)) === 'duration'">
                  {{ formatDuration(submitterFieldValue(item, field)) }}
                  <span class="submitter-muted">({{ formatNumber(submitterFieldValue(item, field)) }}s)</span>
                </template>
                <template v-else-if="submitterValueKind(field, submitterFieldValue(item, field)) === 'unix'">
                  {{ formatUnixSeconds(submitterFieldValue(item, field)) }}
                </template>
                <template v-else-if="submitterValueKind(field, submitterFieldValue(item, field)) === 'number'">
                  {{ formatNumber(submitterFieldValue(item, field)) }}
                </template>
                <template v-else-if="submitterValueKind(field, submitterFieldValue(item, field)) === 'link'">
                  <a class="submitter-cell" :href="String(submitterFieldValue(item, field))" target="_blank" rel="noreferrer">
                    {{ submitterFieldValue(item, field) }}
                  </a>
                </template>
                <template v-else-if="submitterValueKind(field, submitterFieldValue(item, field)) === 'array'">
                  <div class="submitter-chips">
                    <span v-for="entry in submitterArrayPreview(submitterFieldValue(item, field))" :key="String(entry)" class="submitter-chip">
                      {{ typeof entry === 'object' ? JSON.stringify(entry).slice(0, 80) : entry }}
                    </span>
                  </div>
                </template>
                <pre v-else-if="submitterValueKind(field, submitterFieldValue(item, field)) === 'object'" class="submitter-cell">{{ submitterJsonPreview(submitterFieldValue(item, field)) }}</pre>
                <div v-else class="submitter-cell">{{ submitterFieldValue(item, field) }}</div>
              </td>
              <td class="submitter-action-col">
                <button
                  type="button"
                  :class="['submitter-upload-button', { submitted: item.ydbi_submitted }]"
                  :disabled="Boolean(item.ydbi_submitted) || submitterSubmittingId === String(submitterFieldValue(item, 'id'))"
                  @click="submitVideoToYoubi(item)"
                >
                  <span v-if="item.ydbi_submitted">已上传</span>
                  <span v-else-if="submitterSubmittingId === String(submitterFieldValue(item, 'id'))">上传中</span>
                  <span v-else>上传</span>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="submitter-pagination" v-if="submitterFilteredTotal > 0">
        <span>第 {{ submitterPage }} / {{ submitterPageCount }} 页 · 共 {{ submitterFilteredTotal }} 条</span>
        <div>
          <button type="button" :disabled="submitterPage <= 1" @click="setSubmitterPage(submitterPage - 1)">上一页</button>
          <button type="button" :disabled="submitterPage >= submitterPageCount" @click="setSubmitterPage(submitterPage + 1)">下一页</button>
        </div>
      </div>
    </section>

    <div v-if="submitterJsonPayload" class="submitter-modal-backdrop" @click.self="closeSubmitterJson">
      <section class="submitter-modal" role="dialog" aria-modal="true">
        <header>
          <strong>{{ submitterJsonTitle }}</strong>
          <button type="button" @click="closeSubmitterJson">关闭</button>
        </header>
        <pre>{{ JSON.stringify(submitterJsonPayload, null, 2) }}</pre>
      </section>
    </div>

    <div v-if="submitterAuthorTypeOpen" class="submitter-modal-backdrop" @click.self="closeSubmitterAuthorTypes">
      <section class="submitter-modal submitter-author-type-modal" role="dialog" aria-modal="true">
        <header>
          <strong>作者 Type</strong>
          <button type="button" @click="closeSubmitterAuthorTypes">关闭</button>
        </header>
        <div class="submitter-author-type-body">
          <p v-if="submitterAuthorTypeError" class="inline-error">{{ submitterAuthorTypeError }}</p>
          <table class="submitter-author-type-table">
            <thead>
              <tr>
                <th>作者</th>
                <th>Type</th>
                <th>状态</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="submitterAuthorTypeRows.length === 0">
                <td colspan="3" class="submitter-empty">暂无作者</td>
              </tr>
              <tr v-for="row in submitterAuthorTypeRows" :key="row.author">
                <td>{{ row.author }}</td>
                <td>
                  <input
                    v-model="row.draftType"
                    type="text"
                    placeholder="投稿 type"
                    :disabled="submitterAuthorTypeSaving === row.author"
                    @change="autosaveSubmitterAuthorType(row)"
                    @blur="autosaveSubmitterAuthorType(row)"
                  />
                </td>
                <td>
                  <span v-if="submitterAuthorTypeSaving === row.author">保存中</span>
                  <span v-else-if="row.draftType.trim() && row.draftType !== row.type">未保存</span>
                  <span v-else-if="row.type">已保存</span>
                  <span v-else>-</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  </section>
</template>
