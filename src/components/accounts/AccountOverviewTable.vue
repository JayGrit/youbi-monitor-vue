<script setup>
import PlatformIcon from '../PlatformIcon.vue'

const props = defineProps([
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
  'latestVideoText',
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

function sharedMetricItem(group) {
  return group.visibleRows.find(item => item.configured) || group.visibleRows[0] || null
}

function sharedMetricText(group, field) {
  const item = sharedMetricItem(group)
  return item?.configured ? props.accountMetricText(item.row, field) : '-'
}

function accountCellStyle(index) {
  return { '--account-row-index': index + 1 }
}

function followerText(row) {
  const text = String(row?.followerText || row?.follower_text || '').trim()
  if (text) return text
  const value = row?.subscribers ?? row?.subscriberCount ?? row?.followerCount ?? row?.follower_count
  if (value === null || value === undefined || value === '') return ''
  const countText = formatFollowerNumber(value)
  const growth = row?.newSubscribers ?? row?.new_subscribers ?? row?.subscriberGrowth ?? row?.followerGrowth
  const growthText = formatFollowerGrowth(growth)
  return growthText ? `${countText}${growthText}` : countText
}

function formatFollowerNumber(value) {
  const count = Number(value)
  if (!Number.isFinite(count)) return String(value)
  return String(Math.trunc(count)).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

function formatFollowerGrowth(value) {
  if (value === null || value === undefined || value === '') return ''
  const count = Number(value)
  if (!Number.isFinite(count)) return ''
  const rounded = Math.trunc(count)
  const sign = rounded >= 0 ? '+' : ''
  return `(${sign}${formatFollowerNumber(rounded)})`
}
</script>

<template>
      <div v-if="visibleAccountGroups.length" class="account-topic-list" :class="{ editing: accountEditMode }" aria-label="按 key 分组账号表">
        <div class="account-group-grid account-group-heading" :class="{ editing: accountEditMode }">
          <span class="account-type-header">Topic</span>
          <span v-if="!accountEditMode" class="account-type-header account-topic-metric-header">生产中</span>
          <span v-if="!accountEditMode" class="account-type-header account-topic-metric-header">生产失败</span>
          <span v-if="!accountEditMode" class="account-type-header account-topic-metric-header">待拉取</span>
          <div class="account-row account-header account-platform-row">
            <span>Platform</span>
            <span>头像</span>
            <span>账号</span>
            <span v-if="!accountEditMode">今日已发</span>
            <span v-if="!accountEditMode">冷却等待</span>
            <span v-if="!accountEditMode">上传中</span>
            <span v-if="!accountEditMode">失败任务</span>
            <span v-if="!accountEditMode">上次上传</span>
            <span v-if="!accountEditMode">最新视频</span>
            <span v-if="!accountEditMode">粉丝量</span>
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
            <span
              v-if="!accountEditMode"
              class="account-topic-metric-cell"
              data-label="生产中"
            >
              {{ sharedMetricText(group, 'stagedRunningCount') }}
            </span>
            <span
              v-if="!accountEditMode"
              class="account-topic-metric-cell"
              :class="{ 'failed-task-count': sharedMetricItem(group)?.configured && stagedFailedCount(sharedMetricItem(group).row) > 0 }"
              data-label="生产失败"
            >
              {{ sharedMetricText(group, 'stagedFailedCount') }}
            </span>
            <span
              v-if="!accountEditMode"
              class="account-topic-metric-cell"
              data-label="待拉取"
            >
              {{ sharedMetricText(group, 'downloaderPendingCount') }}
            </span>
            <div class="account-table" :class="{ editing: accountEditMode }">
            <div
              v-for="(item, index) in group.visibleRows"
              :key="`${group.key}-${item.type}`"
              :style="accountCellStyle(index)"
              :class="['account-row account-platform-row', { unavailable: accountRowUnavailable(item), saving: accountRowSaving(item) }]"
            >
              <span v-if="!accountEditMode && (accountRowUnavailable(item) || accountRowSaving(item))" class="account-row-background" aria-hidden="true"></span>
              <span class="account-cell account-col-platform platform-mark" :class="{ saving: accountRowSaving(item) }">
                <PlatformIcon :src="item.iconUrl" :label="item.label" :platform="item.type" />
              </span>
              <span class="account-cell account-col-avatar" data-label="头像">
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
              <span class="account-cell account-col-name" data-label="账号">
                <span v-if="item.configured" class="account-profile-text">
                  <strong>{{ accountName(item.type, item.row) }}</strong>
                </span>
                <template v-else>-</template>
              </span>
              <span v-if="!accountEditMode" class="account-cell account-col-today" data-label="今日已发">{{ item.configured ? accountMetricText(item.row, 'todayUploadCount') : '-' }}</span>
              <span v-if="!accountEditMode" class="account-cell account-col-cooldown" data-label="冷却等待">{{ item.configured ? accountMetricText(item.row, 'cooldownWaitingCount') : '-' }}</span>
              <span v-if="!accountEditMode" class="account-cell account-col-upload-running" data-label="上传中">{{ item.configured ? accountMetricText(item.row, 'uploadRunningCount') : '-' }}</span>
              <span v-if="!accountEditMode" class="account-cell account-col-failed-upload" :class="{ 'failed-task-count': item.configured && failedUploadCount(item.row) > 0 }" data-label="失败任务">
                {{ item.configured ? accountMetricText(item.row, 'failedUploadCount') : '-' }}
              </span>
              <span v-if="!accountEditMode" class="account-cell account-col-last-upload last-upload-time" data-label="上次上传">{{ item.configured ? lastUploadText(item.row.lastUploadAt) : '-' }}</span>
              <span
                v-if="!accountEditMode"
                class="account-cell account-col-next-send"
                data-label="最新视频"
              >
                {{ item.configured ? latestVideoText(item.row.latestVideoPublishAt) : '-' }}
              </span>
              <span v-if="!accountEditMode" class="account-cell account-col-followers" data-label="粉丝量">{{ item.configured ? followerText(item.row) : '' }}</span>
              <span v-if="accountEditMode" class="account-cell" data-label="Key">
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
              <span v-if="accountEditMode" class="account-cell" data-label="操作">
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
              <span v-if="accountEditMode" class="account-cell cooldown-editor" data-label="随机冷却">
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
              <span v-if="accountEditMode" class="account-cell cooldown-editor quiet-time-editor" data-label="禁发时间">
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
              <span v-if="accountEditMode" class="account-cell" data-label="最大暂存">
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
              <span v-if="accountEditMode" class="account-cell" data-label="启用">
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
