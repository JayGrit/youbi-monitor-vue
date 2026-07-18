<script setup>
import PlatformIcon from '../PlatformIcon.vue'

defineProps([
  'accountEditMode',
  'visibleAccountGroups',
  'accountRowUnavailable',
  'accountRowSaving',
  'accountAvatar',
  'accountName',
  'accountAvatarInitial',
  'accountMetricText',
  'stagedFailedCount',
  'failedUploadCount',
  'lastUploadText',
  'nextSendReady',
  'nextSendStale',
  'nextSendRunning',
  'openRunningTask',
  'nextSendDisplay',
  'saveTopicEdit',
  'openUploadBackfill',
  'saveAccountCooldownEdit',
  'saveAccountQuietTimeEdit',
  'saveAccountDownloaderMaxStagedCountEdit',
  'saveAccountEnabledEdit',
])
</script>

<template>
      <div v-if="visibleAccountGroups.length" class="topic-list" :class="{ editing: accountEditMode }" aria-label="按 key 分组账号表">
        <div class="account-group-grid account-group-heading" :class="{ editing: accountEditMode }">
          <span class="account-type-header">Topic</span>
          <div class="account-row account-header account-platform-row">
            <span>Platform</span>
            <span>头像</span>
            <span>账号</span>
            <span v-if="!accountEditMode">今日已发</span>
            <span v-if="!accountEditMode">冷却等待</span>
            <span v-if="!accountEditMode">生产中</span>
            <span v-if="!accountEditMode">上传中</span>
            <span v-if="!accountEditMode">生产失败</span>
            <span v-if="!accountEditMode">待拉取</span>
            <span v-if="!accountEditMode">失败任务</span>
            <span v-if="!accountEditMode">上次上传</span>
            <span v-if="!accountEditMode">下次可发送</span>
            <span v-if="accountEditMode">Key</span>
            <span v-if="accountEditMode">操作</span>
            <span v-if="accountEditMode">随机冷却</span>
            <span v-if="accountEditMode">禁发时间</span>
            <span v-if="accountEditMode">最大暂存</span>
            <span v-if="accountEditMode">启用</span>
          </div>
        </div>
        <section v-for="group in visibleAccountGroups" :key="group.key" class="topic-group">
          <div class="account-group-grid" :class="{ editing: accountEditMode }">
            <strong class="account-type-cell">{{ group.key }}</strong>
            <div class="account-table" :class="{ editing: accountEditMode }">
            <div
              v-for="item in group.visibleRows"
              :key="`${group.key}-${item.type}`"
              :class="['account-row account-platform-row', { unavailable: accountRowUnavailable(item), saving: accountRowSaving(item) }]"
            >
              <span class="platform-mark" :class="{ saving: accountRowSaving(item) }">
                <PlatformIcon :src="item.iconUrl" :label="item.label" :platform="item.type" />
              </span>
              <span data-label="头像">
                <label
                  v-if="item.configured"
                  class="account-avatar-cell"
                >
                  <img
                    v-if="accountAvatar(item.type, item.row)"
                    :src="accountAvatar(item.type, item.row)"
                    :alt="accountName(item.type, item.row)"
                    loading="lazy"
                    decoding="async"
                  />
                  <span v-else class="account-avatar-fallback">{{ accountAvatarInitial(item.row, item.type) }}</span>
                </label>
                <template v-else>-</template>
              </span>
              <span data-label="账号">
                <span v-if="item.configured" class="account-profile-text">
                  <strong>{{ accountName(item.type, item.row) }}</strong>
                </span>
                <template v-else>-</template>
              </span>
              <span v-if="!accountEditMode" data-label="今日已发">{{ item.configured ? accountMetricText(item.row, 'todayUploadCount') : '-' }}</span>
              <span v-if="!accountEditMode" data-label="冷却等待">{{ item.configured ? accountMetricText(item.row, 'cooldownWaitingCount') : '-' }}</span>
              <span v-if="!accountEditMode" data-label="生产中">{{ item.configured ? accountMetricText(item.row, 'stagedRunningCount') : '-' }}</span>
              <span v-if="!accountEditMode" data-label="上传中">{{ item.configured ? accountMetricText(item.row, 'uploadRunningCount') : '-' }}</span>
              <span v-if="!accountEditMode" :class="{ 'failed-task-count': item.configured && stagedFailedCount(item.row) > 0 }" data-label="生产失败">
                {{ item.configured ? accountMetricText(item.row, 'stagedFailedCount') : '-' }}
              </span>
              <span v-if="!accountEditMode" data-label="待拉取">{{ item.configured ? accountMetricText(item.row, 'downloaderPendingCount') : '-' }}</span>
              <span v-if="!accountEditMode" :class="{ 'failed-task-count': item.configured && failedUploadCount(item.row) > 0 }" data-label="失败任务">
                {{ item.configured ? accountMetricText(item.row, 'failedUploadCount') : '-' }}
              </span>
              <span v-if="!accountEditMode" class="last-upload-time" data-label="上次上传">{{ item.configured ? lastUploadText(item.row.lastUploadAt) : '-' }}</span>
              <span
                v-if="!accountEditMode"
                :class="{
                  'next-send-ready': item.configured && nextSendReady(item.row),
                  'next-send-stale': item.configured && nextSendStale(item.row),
                }"
                data-label="下次可发送"
              >
                <button
                  v-if="item.configured && nextSendRunning(item.row)"
                  type="button"
                  class="next-send-link"
                  @click="openRunningTask(item.row)"
                >
                  {{ nextSendDisplay(item.row) }}
                </button>
                <template v-else>{{ item.configured ? nextSendDisplay(item.row) : '-' }}</template>
              </span>
              <span v-if="accountEditMode" data-label="Key">
                <input
                  v-if="item.configured"
                  v-model="item.row.draftKey"
                  type="text"
                  class="topic-input"
                  aria-label="topic"
                  placeholder="topic"
                  :disabled="accountRowSaving(item)"
                  @change="saveTopicEdit(item)"
                />
                <template v-else>-</template>
              </span>
              <span v-if="accountEditMode" data-label="操作">
                <button
                  v-if="item.configured"
                  type="button"
                  class="account-backfill-button"
                  :disabled="accountRowSaving(item)"
                  @click="openUploadBackfill(item.type, item.label, item.row.topic, group.key)"
                >
                  补发历史
                </button>
                <template v-else>-</template>
              </span>
              <span v-if="accountEditMode" class="cooldown-editor" data-label="随机冷却">
                <template v-if="item.configured">
                  <input
                    v-model="item.row.draftCooldownMinMinutes"
                    type="number"
                    min="0"
                    step="1"
                    aria-label="最小冷却分钟"
                    :disabled="accountRowSaving(item)"
                    @change="saveAccountCooldownEdit(item)"
                  />
                  <span>-</span>
                  <input
                    v-model="item.row.draftCooldownMaxMinutes"
                    type="number"
                    min="0"
                    step="1"
                    aria-label="最大冷却分钟"
                    :disabled="accountRowSaving(item)"
                    @change="saveAccountCooldownEdit(item)"
                  />
                </template>
                <template v-else>-</template>
              </span>
              <span v-if="accountEditMode" class="cooldown-editor quiet-time-editor" data-label="禁发时间">
                <template v-if="item.configured">
                  <input
                    v-model="item.row.draftUploadQuietStartTime"
                    type="time"
                    aria-label="禁发开始时间"
                    :disabled="accountRowSaving(item)"
                    @change="saveAccountQuietTimeEdit(item)"
                  />
                  <span>-</span>
                  <input
                    v-model="item.row.draftUploadQuietEndTime"
                    type="time"
                    aria-label="禁发结束时间"
                    :disabled="accountRowSaving(item)"
                    @change="saveAccountQuietTimeEdit(item)"
                  />
                </template>
                <template v-else>-</template>
              </span>
              <span v-if="accountEditMode" data-label="最大暂存">
                <input
                  v-if="item.configured"
                  v-model="item.row.draftDownloaderMaxStagedCount"
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  class="account-small-number-input"
                  aria-label="最大暂存个数"
                  :disabled="accountRowSaving(item)"
                  @change="saveAccountDownloaderMaxStagedCountEdit(item)"
                />
                <template v-else>-</template>
              </span>
              <span v-if="accountEditMode" data-label="启用">
                <label v-if="item.configured" class="account-enabled-edit">
                  <input
                    v-model="item.row.draftEnabled"
                    type="checkbox"
                    :disabled="accountRowSaving(item)"
                    @change="saveAccountEnabledEdit(item)"
                  />
                  {{ item.row.draftEnabled ? '启用' : '禁用' }}
                </label>
                <template v-else>-</template>
              </span>
            </div>
            </div>
          </div>
        </section>
      </div>
      <div v-else class="empty-state">暂无账号配置</div>

  </template>
