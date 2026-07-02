<script setup>
import { STATIC_ASSET_TYPES } from '../composables/useStaticAssets'
import { formatDateTime, formatNumber } from '../utils/format'

const props = defineProps({
  assetRows: { type: Array, default: () => [] },
  assetTotal: { type: Number, default: 0 },
  assetLoading: { type: Boolean, default: false },
  assetError: { type: String, default: '' },
  assetMessage: { type: String, default: '' },
  assetTypeFilter: { type: String, default: '' },
  assetScopeFilter: { type: String, default: 'all' },
  assetTaskIdFilter: { type: String, default: '' },
  assetKeywordFilter: { type: String, default: '' },
  assetPage: { type: Number, default: 1 },
  assetPageCount: { type: Number, default: 1 },
  assetTypeSummary: { type: String, default: '' },
  selectedAsset: { type: Object, default: null },
  selectedAssetLoading: { type: Boolean, default: false },
  selectedAssetError: { type: String, default: '' },
  uploadAssetType: { type: String, default: 'image' },
  uploadAssetTaskId: { type: String, default: '' },
  uploadAssetRemark: { type: String, default: '' },
  uploadingAsset: { type: Boolean, default: false },
  textAssetTaskId: { type: String, default: '' },
  textAssetRemark: { type: String, default: '' },
  textAssetContent: { type: String, default: '' },
  creatingTextAsset: { type: Boolean, default: false },
  applyStaticAssetFilters: { type: Function, required: true },
  resetStaticAssetFilters: { type: Function, required: true },
  setStaticAssetPage: { type: Function, required: true },
  openStaticAsset: { type: Function, required: true },
  closeStaticAsset: { type: Function, required: true },
  uploadStaticAsset: { type: Function, required: true },
  createStaticTextAsset: { type: Function, required: true },
  assetTypeLabel: { type: Function, required: true },
  assetContentKind: { type: Function, required: true },
})

const emit = defineEmits([
  'update:assetTypeFilter',
  'update:assetScopeFilter',
  'update:assetTaskIdFilter',
  'update:assetKeywordFilter',
  'update:uploadAssetType',
  'update:uploadAssetTaskId',
  'update:uploadAssetRemark',
  'update:textAssetTaskId',
  'update:textAssetRemark',
  'update:textAssetContent',
])

function handleUpload(event) {
  const file = event.target.files?.[0]
  if (!file) return
  props.uploadStaticAsset(file)
  event.target.value = ''
}

function selectedContentKind() {
  return props.assetContentKind(props.selectedAsset)
}
</script>

<template>
  <section class="static-assets-page" aria-label="素材库">
    <section v-if="assetError || assetMessage || assetTypeSummary" class="static-assets-status">
      <span v-if="assetError">素材 API 异常：{{ assetError }}</span>
      <span v-else-if="assetMessage">{{ assetMessage }}</span>
      <span v-if="assetTypeSummary" class="static-assets-counts">{{ assetTypeSummary }}</span>
    </section>

    <section class="static-assets-controls">
      <form class="static-assets-filter-grid" @submit.prevent="applyStaticAssetFilters">
        <label>
          <span>类型</span>
          <select
            :value="assetTypeFilter"
            @change="emit('update:assetTypeFilter', $event.target.value); applyStaticAssetFilters()"
          >
            <option v-for="item in STATIC_ASSET_TYPES" :key="item.value" :value="item.value">
              {{ item.label }}
            </option>
          </select>
        </label>
        <label>
          <span>范围</span>
          <select
            :value="assetScopeFilter"
            @change="emit('update:assetScopeFilter', $event.target.value); applyStaticAssetFilters()"
          >
            <option value="all">全部</option>
            <option value="global">全局素材</option>
            <option value="task">指定任务</option>
          </select>
        </label>
        <label>
          <span>Task ID</span>
          <input
            :value="assetTaskIdFilter"
            type="search"
            placeholder="指定任务 ID"
            @input="emit('update:assetTaskIdFilter', $event.target.value)"
          />
        </label>
        <label>
          <span>关键词</span>
          <input
            :value="assetKeywordFilter"
            type="search"
            placeholder="备注、内容或任务 ID"
            @input="emit('update:assetKeywordFilter', $event.target.value)"
          />
        </label>
        <div class="static-assets-actions">
          <button type="button" :disabled="assetLoading" @click="resetStaticAssetFilters">重置</button>
          <button type="submit" :disabled="assetLoading">{{ assetLoading ? '加载中' : '筛选' }}</button>
        </div>
      </form>
    </section>

    <section class="static-assets-compose">
      <form class="static-assets-upload-panel" @submit.prevent>
        <div class="static-assets-panel-head">
          <strong>上传文件素材</strong>
          <span>图片、音频、视频、人声或字体</span>
        </div>
        <div class="static-assets-compose-grid">
          <label>
            <span>类型</span>
            <select
              :value="uploadAssetType"
              @change="emit('update:uploadAssetType', $event.target.value)"
            >
              <option value="image">图片</option>
              <option value="audio">音频</option>
              <option value="video">视频</option>
              <option value="voice">人声</option>
              <option value="font">字体</option>
            </select>
          </label>
          <label>
            <span>Task ID</span>
            <input
              :value="uploadAssetTaskId"
              type="text"
              placeholder="可留空作为全局素材"
              @input="emit('update:uploadAssetTaskId', $event.target.value)"
            />
          </label>
          <label>
            <span>备注</span>
            <input
              :value="uploadAssetRemark"
              type="text"
              placeholder="用途说明"
              @input="emit('update:uploadAssetRemark', $event.target.value)"
            />
          </label>
          <label class="static-assets-file-button">
            <input type="file" :disabled="uploadingAsset" @change="handleUpload" />
            <span>{{ uploadingAsset ? '上传中' : '选择文件上传' }}</span>
          </label>
        </div>
      </form>

      <form class="static-assets-upload-panel" @submit.prevent="createStaticTextAsset">
        <div class="static-assets-panel-head">
          <strong>新增文本素材</strong>
          <span>直接保存到 asseter_static.content</span>
        </div>
        <div class="static-assets-compose-grid text">
          <label>
            <span>Task ID</span>
            <input
              :value="textAssetTaskId"
              type="text"
              placeholder="可留空作为全局素材"
              @input="emit('update:textAssetTaskId', $event.target.value)"
            />
          </label>
          <label>
            <span>备注</span>
            <input
              :value="textAssetRemark"
              type="text"
              placeholder="用途说明"
              @input="emit('update:textAssetRemark', $event.target.value)"
            />
          </label>
          <label class="static-assets-textarea">
            <span>内容</span>
            <textarea
              :value="textAssetContent"
              placeholder="文本内容"
              @input="emit('update:textAssetContent', $event.target.value)"
            ></textarea>
          </label>
          <button type="submit" :disabled="creatingTextAsset || !textAssetContent.trim()">
            {{ creatingTextAsset ? '保存中' : '保存文本' }}
          </button>
        </div>
      </form>
    </section>

    <section class="static-assets-table-panel">
      <div class="static-assets-table-head">
        <strong>素材 {{ formatNumber(assetTotal) }}</strong>
        <span>第 {{ assetPage }} / {{ assetPageCount }} 页</span>
      </div>
      <div v-if="assetLoading" class="static-assets-empty">加载中</div>
      <div v-else-if="!assetRows.length" class="static-assets-empty">暂无素材</div>
      <div v-else class="static-assets-table">
        <button
          v-for="row in assetRows"
          :key="row.id"
          type="button"
          class="static-assets-row"
          @click="openStaticAsset(row)"
        >
          <span class="static-assets-id">#{{ row.id }}</span>
          <span class="static-assets-type">{{ assetTypeLabel(row.type) }}</span>
          <span class="static-assets-main">
            <strong>{{ row.remark || row.content || '-' }}</strong>
            <small>{{ row.taskId || '全局' }} · {{ formatDateTime(row.updatedAt) }}</small>
          </span>
          <span class="static-assets-length">{{ formatNumber(row.contentLength) }} 字符</span>
        </button>
      </div>
      <nav class="static-assets-pagination" aria-label="素材分页">
        <button type="button" :disabled="assetPage <= 1 || assetLoading" @click="setStaticAssetPage(assetPage - 1)">上一页</button>
        <button type="button" :disabled="assetPage >= assetPageCount || assetLoading" @click="setStaticAssetPage(assetPage + 1)">下一页</button>
      </nav>
    </section>

    <div v-if="selectedAsset || selectedAssetLoading || selectedAssetError" class="static-assets-modal-backdrop" @click.self="closeStaticAsset">
      <section class="static-assets-modal" aria-label="素材详情">
        <header>
          <div>
            <strong>{{ selectedAsset ? `素材 #${selectedAsset.id}` : '素材详情' }}</strong>
            <span v-if="selectedAsset">{{ assetTypeLabel(selectedAsset.type) }} · {{ selectedAsset.taskId || '全局' }}</span>
          </div>
          <button type="button" @click="closeStaticAsset">关闭</button>
        </header>
        <p v-if="selectedAssetError" class="static-assets-detail-error">{{ selectedAssetError }}</p>
        <div v-else-if="selectedAssetLoading" class="static-assets-empty">加载中</div>
        <template v-else-if="selectedAsset">
          <dl class="static-assets-detail-meta">
            <div>
              <dt>备注</dt>
              <dd>{{ selectedAsset.remark || '-' }}</dd>
            </div>
            <div>
              <dt>创建</dt>
              <dd>{{ formatDateTime(selectedAsset.createdAt) }}</dd>
            </div>
            <div>
              <dt>更新</dt>
              <dd>{{ formatDateTime(selectedAsset.updatedAt) }}</dd>
            </div>
          </dl>
          <div class="static-assets-preview">
            <img v-if="selectedAsset.type === 'image' && selectedContentKind() === 'url'" :src="selectedAsset.content" alt="" />
            <audio v-else-if="['audio', 'voice'].includes(selectedAsset.type) && selectedContentKind() === 'url'" :src="selectedAsset.content" controls></audio>
            <video v-else-if="selectedAsset.type === 'video' && selectedContentKind() === 'url'" :src="selectedAsset.content" controls></video>
            <a v-else-if="selectedContentKind() === 'url'" :href="selectedAsset.content" target="_blank" rel="noreferrer">
              打开素材链接
            </a>
            <pre v-else>{{ selectedAsset.content }}</pre>
          </div>
          <textarea class="static-assets-content-copy" readonly :value="selectedAsset.content"></textarea>
        </template>
      </section>
    </div>
  </section>
</template>
