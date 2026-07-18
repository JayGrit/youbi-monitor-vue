<script setup>
defineProps([
  'accountEditMode',
  'uploadBackfillOpen',
  'uploadBackfillContext',
  'uploadBackfillRows',
  'uploadBackfillLoading',
  'uploadBackfillBusy',
  'uploadBackfillSelectedIds',
  'uploadBackfillSelectedSet',
  'uploadBackfillAllSelected',
  'uploadBackfillError',
  'toggleUploadBackfillAll',
  'loadUploadBackfillCandidates',
  'closeUploadBackfill',
  'registerSelectedUploadBackfill',
  'toggleUploadBackfillRow',
  'formatDateTime',
])
</script>

<template>
      <div v-if="accountEditMode && uploadBackfillOpen && uploadBackfillContext" class="upload-backfill-panel">
        <div class="upload-retry-head">
          <strong>
            {{ uploadBackfillLoading ? '正在加载历史视频' : `补发候选 ${uploadBackfillRows.length} 个` }}
          </strong>
          <span class="upload-backfill-context">
            {{ uploadBackfillContext.platformLabel }}/{{ uploadBackfillContext.topic }}
          </span>
          <div class="upload-retry-actions">
            <button type="button" :disabled="uploadBackfillLoading || uploadBackfillRows.length === 0" @click="toggleUploadBackfillAll">
              {{ uploadBackfillAllSelected ? '取消全选' : '全选' }}
            </button>
            <button type="button" :disabled="uploadBackfillLoading || uploadBackfillBusy" @click="loadUploadBackfillCandidates">
              刷新
            </button>
            <button type="button" :disabled="uploadBackfillBusy" @click="closeUploadBackfill">
              关闭
            </button>
            <button
              type="button"
              class="primary"
              :disabled="uploadBackfillBusy || uploadBackfillSelectedIds.length === 0"
              @click="registerSelectedUploadBackfill"
            >
              {{ uploadBackfillBusy ? '注册中' : `注册选中 ${uploadBackfillSelectedIds.length}` }}
            </button>
          </div>
        </div>
        <p v-if="uploadBackfillError" class="inline-error">{{ uploadBackfillError }}</p>
        <div v-if="!uploadBackfillLoading && uploadBackfillRows.length === 0" class="upload-retry-empty">
          当前 topic 暂无可补发历史视频
        </div>
        <div v-else class="upload-retry-list">
          <label
            v-for="row in uploadBackfillRows"
            :key="row.taskId"
            :class="['upload-retry-row', 'upload-backfill-row', { blocked: !row.selectable }]"
          >
            <input
              type="checkbox"
              :checked="uploadBackfillSelectedSet.has(row.taskId)"
              :disabled="!row.selectable"
              @change="toggleUploadBackfillRow(row)"
            />
            <span class="upload-backfill-cover">
              <img v-if="row.coverUrl" :src="row.coverUrl" :alt="row.title || row.taskId" loading="lazy" decoding="async" />
            </span>
            <span class="upload-retry-main">
              <span class="upload-retry-title">{{ row.title || row.taskId }}</span>
              <span class="upload-retry-meta">
                {{ row.taskId }} · 已发 {{ (row.uploadedPlatforms || []).join(', ') || '-' }} · {{ formatDateTime(row.completedAt) }}
              </span>
              <span v-if="!row.selectable" class="upload-retry-error">{{ row.blockedReason || '不可注册' }}</span>
            </span>
          </label>
        </div>
      </div>

  </template>
