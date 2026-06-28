<script setup>
import {
  SUBMITTER_DURATION_FILTERS,
  SUBMITTER_BILIBILI_FILTERS,
  SUBMITTER_PUBLISHED_FILTERS,
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
  submitterPlatform: { type: String, default: 'youtube' },
  submitterAuthorBusy: { type: Boolean, default: false },
  submitterTypeFilter: { type: String, default: '' },
  submitterUploader: { type: String, default: '' },
  submitterVideoName: { type: String, default: '' },
  submitterAuthors: { type: Array, default: () => [] },
  submitterAuthorTypeFilters: { type: Array, default: () => [] },
  submitterAuthorOptions: { type: Array, default: () => [] },
  submitterDurationFilter: { type: String, default: 'all' },
  submitterPublishedFilter: { type: String, default: 'all' },
  submitterManualSubtitleFilter: { type: String, default: 'all' },
  submitterBilibiliFilter: { type: String, default: 'all' },
  submitterSort: { type: String, default: 'published_desc' },
  submitterUploadFilter: { type: String, default: 'unuploaded' },
  submitterFilteredVideos: { type: Array, default: () => [] },
  submitterFilteredTotal: { type: Number, default: 0 },
  submitterPage: { type: Number, default: 1 },
  submitterPageCount: { type: Number, default: 1 },
  submitterSubmittingId: { type: String, default: '' },
  submitterRejectingId: { type: String, default: '' },
  submitterBatchSubmitting: { type: Boolean, default: false },
  submitterSelectedIds: { type: Array, default: () => [] },
  submitterSelectedCount: { type: Number, default: 0 },
  submitterPageSelectableIds: { type: Array, default: () => [] },
  submitterPageAllSelected: { type: Boolean, default: false },
  submitterJsonPayload: { type: Object, default: null },
  submitterJsonTitle: { type: String, default: '' },
  createSubmitterVideo: { type: Function, required: true },
  importSubmitterAuthor: { type: Function, required: true },
  applySubmitterFilters: { type: Function, required: true },
  resetSubmitterFilters: { type: Function, required: true },
  clearSubmitterBatchFocus: { type: Function, required: true },
  submitterVideoThumb: { type: Function, required: true },
  submitterCachedThumb: { type: Function, required: true },
  submitterVideoHref: { type: Function, required: true },
  submitterVideoTitle: { type: Function, required: true },
  submitterFieldValue: { type: Function, required: true },
  submitVideoToYoubi: { type: Function, required: true },
  submitSelectedVideosToYoubi: { type: Function, required: true },
  setSubmitterRowSelected: { type: Function, required: true },
  toggleSubmitterPageSelection: { type: Function, required: true },
  selectAllSubmitterFilteredVideos: { type: Function, required: true },
  clearSubmitterSelection: { type: Function, required: true },
  rejectSubmitterVideo: { type: Function, required: true },
  withdrawSubmitterVideo: { type: Function, required: true },
  submitterSubmissionStatus: { type: Function, required: true },
  setSubmitterPage: { type: Function, required: true },
  closeSubmitterJson: { type: Function, required: true },
})

const emit = defineEmits([
  'update:submitterUrl',
  'update:submitterAuthor',
  'update:submitterPlatform',
  'update:submitterTypeFilter',
  'update:submitterUploader',
  'update:submitterVideoName',
  'update:submitterDurationFilter',
  'update:submitterPublishedFilter',
  'update:submitterManualSubtitleFilter',
  'update:submitterBilibiliFilter',
  'update:submitterSort',
  'update:submitterUploadFilter',
])
</script>

<template>
  <section class="submitter-page" aria-label="素材采集">
    <section v-if="submitterError || (!submitterLoading && submitterFocusedBatch)" class="submitter-status">
      <span v-if="submitterError">Submitter API 异常：{{ submitterError }}</span>
      <span v-else>当前批次：{{ submitterFocusedBatch.slice(0, 8) }}。{{ submitterMessage }}</span>
      <span v-if="submitterStatusCounts" class="submitter-status-counts">{{ submitterStatusCounts }}</span>
    </section>

    <section class="submitter-actions-panel">
      <form class="submitter-submit-row" @submit.prevent="createSubmitterVideo">
        <label>
          <span>视频链接</span>
          <input
            :value="submitterUrl"
            type="url"
            placeholder="YouTube 或 TikTok 视频链接"
            required
            @input="emit('update:submitterUrl', $event.target.value)"
          />
        </label>
        <button type="submit" :disabled="submitterBusy">{{ submitterBusy ? '抓取中' : '抓取并保存' }}</button>
      </form>
      <form class="submitter-submit-row submitter-author-row" @submit.prevent="importSubmitterAuthor">
        <label class="submitter-platform-select">
          <span>来源</span>
          <select
            :value="submitterPlatform"
            @change="emit('update:submitterPlatform', $event.target.value)"
          >
            <option value="youtube">YouTube</option>
            <option value="tiktok">TikTok</option>
          </select>
        </label>
        <label>
          <span>作者链接</span>
          <input
            :value="submitterAuthor"
            type="text"
            :placeholder="submitterPlatform === 'tiktok' ? '@handle 或 https://www.tiktok.com/@handle' : '@handle 或 https://www.youtube.com/@channel'"
            required
            @input="emit('update:submitterAuthor', $event.target.value)"
          />
        </label>
        <button type="submit" :disabled="submitterAuthorBusy">{{ submitterAuthorBusy ? '排队中' : '加入作者扫描' }}</button>
      </form>
    </section>

    <section class="submitter-controls">
      <div class="submitter-filter-grid">
        <label>
          <span>视频名</span>
          <input
            :value="submitterVideoName"
            type="search"
            placeholder="输入视频名后回车"
            @input="emit('update:submitterVideoName', $event.target.value)"
            @keyup.enter="applySubmitterFilters"
          />
        </label>
        <label>
          <span>Type</span>
          <select
            :value="submitterTypeFilter"
            @change="emit('update:submitterTypeFilter', $event.target.value); emit('update:submitterUploader', ''); applySubmitterFilters()"
          >
            <option value="">全部 type</option>
            <option v-for="type in submitterAuthorTypeFilters" :key="type" :value="type">{{ type }}</option>
          </select>
        </label>
        <label>
          <span>作者</span>
          <select
            :value="submitterUploader"
            @change="emit('update:submitterUploader', $event.target.value); applySubmitterFilters()"
          >
            <option value="">全部作者</option>
            <option v-for="author in submitterAuthorOptions" :key="author" :value="author">{{ author }}</option>
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
          <span>发布时间</span>
          <select
            :value="submitterPublishedFilter"
            @change="emit('update:submitterPublishedFilter', $event.target.value); applySubmitterFilters()"
          >
            <option v-for="option in SUBMITTER_PUBLISHED_FILTERS" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
        </label>
        <label>
          <span>人工字幕</span>
          <select
            :value="submitterManualSubtitleFilter"
            @change="emit('update:submitterManualSubtitleFilter', $event.target.value); applySubmitterFilters()"
          >
            <option value="all">全部</option>
            <option value="en">人工英文字幕</option>
            <option value="zh">人工中文字幕</option>
          </select>
        </label>
        <label>
          <span>B站</span>
          <select
            :value="submitterBilibiliFilter"
            @change="emit('update:submitterBilibiliFilter', $event.target.value); applySubmitterFilters()"
          >
            <option v-for="option in SUBMITTER_BILIBILI_FILTERS" :key="option.value" :value="option.value">
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
          <button type="button" @click="resetSubmitterFilters">重置</button>
          <button v-if="submitterFocusedBatch" type="button" @click="clearSubmitterBatchFocus">查看全部</button>
        </div>
      </div>
    </section>

    <section class="submitter-table-panel">
      <div class="submitter-batch-bar">
        <div>
          <strong>批量提交</strong>
          <span>已选择 {{ formatNumber(submitterSelectedCount) }} 条</span>
        </div>
        <div>
          <button
            type="button"
            :disabled="submitterLoading || submitterBatchSubmitting || submitterPageSelectableIds.length === 0"
            @click="toggleSubmitterPageSelection"
          >
            {{ submitterPageAllSelected ? '取消当前页' : '选择当前页' }}
          </button>
          <button
            type="button"
            :disabled="submitterLoading || submitterBatchSubmitting || submitterFilteredTotal === 0"
            @click="selectAllSubmitterFilteredVideos"
          >
            全选筛选结果
          </button>
          <button
            type="button"
            :disabled="submitterBatchSubmitting || submitterSelectedCount === 0 || Boolean(submitterRejectingId)"
            @click="submitSelectedVideosToYoubi"
          >
            {{ submitterBatchSubmitting ? '批量提交中' : '提交已选' }}
          </button>
          <button
            type="button"
            :disabled="submitterBatchSubmitting || submitterSelectedCount === 0"
            @click="clearSubmitterSelection"
          >
            清空
          </button>
        </div>
      </div>
      <div class="submitter-table-wrap">
        <table class="submitter-table">
          <thead>
            <tr>
              <th class="submitter-select-col">
                <input
                  type="checkbox"
                  :checked="submitterPageAllSelected"
                  :disabled="submitterPageSelectableIds.length === 0 || submitterBatchSubmitting"
                  aria-label="选择当前页未上传素材"
                  @change="toggleSubmitterPageSelection"
                />
              </th>
              <th class="submitter-fixed-col">视频</th>
              <th class="submitter-action-col">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!submitterLoading && submitterFilteredVideos.length === 0">
              <td colspan="3" class="submitter-empty">
                {{ submitterFocusedBatch ? '当前批次暂无记录，频道扫描完成后会自动刷新。' : '暂无匹配记录' }}
              </td>
            </tr>
            <tr v-for="item in submitterFilteredVideos" :key="item.id || item.video_id || item.webpage_url">
              <td class="submitter-select-col">
                <input
                  type="checkbox"
                  :checked="submitterSelectedIds.includes(String(submitterFieldValue(item, 'id')))"
                  :disabled="submitterSubmissionStatus(item) !== 'unuploaded' || submitterBatchSubmitting"
                  aria-label="选择素材"
                  @change="setSubmitterRowSelected(item, $event.target.checked)"
                />
              </td>
              <td class="submitter-fixed-col">
                <div class="submitter-video-card">
                  <a
                    v-if="submitterVideoHref(item) && submitterVideoThumb(item)"
                    :href="submitterVideoHref(item)"
                    target="_blank"
                    rel="noreferrer"
                    class="submitter-thumb-link"
                    aria-label="打开 YouTube 视频"
                  >
                    <img :src="submitterCachedThumb(item)" alt="" loading="lazy" decoding="async" />
                  </a>
                  <img v-else-if="submitterVideoThumb(item)" :src="submitterCachedThumb(item)" alt="" loading="lazy" decoding="async" />
                  <a
                    v-else-if="submitterVideoHref(item)"
                    :href="submitterVideoHref(item)"
                    target="_blank"
                    rel="noreferrer"
                    class="submitter-thumb-link"
                    aria-label="打开 YouTube 视频"
                  >
                    <div class="submitter-thumb-empty"></div>
                  </a>
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
                      <span>{{ formatNumber(submitterFieldValue(item, 'view_count')) }}</span>
                    </div>
                  </div>
                </div>
              </td>
              <td class="submitter-action-col" data-label="操作">
                <div class="submitter-action-buttons">
                  <button
                    type="button"
                    :class="['submitter-upload-button', { submitted: submitterSubmissionStatus(item) === 'uploaded' }]"
                    :disabled="submitterUploadFilter === 'pending'
                      ? submitterSubmissionStatus(item) !== 'pending' || submitterSubmittingId === String(submitterFieldValue(item, 'id')) || Boolean(submitterRejectingId) || submitterBatchSubmitting
                      : submitterSubmissionStatus(item) !== 'unuploaded' || submitterSubmittingId === String(submitterFieldValue(item, 'id')) || Boolean(submitterRejectingId) || submitterBatchSubmitting"
                    @click="submitterUploadFilter === 'pending' ? withdrawSubmitterVideo(item) : submitVideoToYoubi(item)"
                  >
                    <span v-if="submitterUploadFilter === 'pending' && submitterSubmittingId === String(submitterFieldValue(item, 'id'))">撤稿中</span>
                    <span v-else-if="submitterUploadFilter === 'pending' && submitterSubmissionStatus(item) === 'pending'">撤稿</span>
                    <span v-else-if="submitterSubmissionStatus(item) === 'uploaded'">已上传</span>
                    <span v-else-if="submitterSubmissionStatus(item) === 'pending'">待执行</span>
                    <span v-else-if="submitterSubmissionStatus(item) === 'rejected'">已拒稿</span>
                    <span v-else-if="submitterSubmissionStatus(item) === 'failed'">提交失败</span>
                    <span v-else-if="submitterSubmittingId === String(submitterFieldValue(item, 'id'))">上传中</span>
                    <span v-else>上传</span>
                  </button>
                  <button
                    type="button"
                    class="submitter-reject-button"
                    :disabled="submitterSubmissionStatus(item) !== 'unuploaded' || submitterRejectingId === String(submitterFieldValue(item, 'id')) || Boolean(submitterSubmittingId) || submitterBatchSubmitting"
                    @click="rejectSubmitterVideo(item)"
                  >
                    <span v-if="submitterSubmissionStatus(item) === 'rejected'">已拒稿</span>
                    <span v-else-if="submitterRejectingId === String(submitterFieldValue(item, 'id'))">拒稿中</span>
                    <span v-else>拒稿</span>
                  </button>
                </div>
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

  </section>
</template>
