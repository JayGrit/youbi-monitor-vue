<script setup>
import PlatformIcon from '../PlatformIcon.vue'

defineProps([
  'uploaderPhoneEditMode',
  'uploaderPhoneLoading',
  'phoneRows',
  'visiblePhonePlatforms',
  'uploaderPhoneError',
  'phoneCellDisabled',
  'phoneCellUnavailable',
  'selectedPhoneAccount',
  'phoneCellAgentBusy',
  'runPhoneCellAction',
  'phoneCellInputValue',
  'phoneCellListId',
  'phoneCellSaving',
  'savePhonePlatform',
  'togglePhoneDisabled',
  'phoneAccountOptions',
  'accountOptionText',
  'phoneSelectedAccountRow',
  'phoneAccountProfileAvatar',
  'phoneAccountProfileName',
  'phoneAccountInitial',
  'platformBusyKey',
  'uploadPhoneAccountAvatar',
  'savePhoneAccountProfile',
  'phoneAccountName',
  'phoneAccountAvatar',
  'phoneNoteValue',
])

defineEmits(['toggle-edit-mode'])
</script>

<template>
    <section class="biliup-panel uploader-phone-panel" aria-label="手机号账号矩阵">
      <div class="uploader-phone-head">
        <strong>手机号账号</strong>
        <div class="uploader-phone-actions">
          <span v-if="uploaderPhoneLoading">加载中</span>
          <button type="button" @click="$emit('toggle-edit-mode')">
            {{ uploaderPhoneEditMode ? '完成' : '编辑' }}
          </button>
        </div>
      </div>
      <div v-if="phoneRows.length && visiblePhonePlatforms.length" class="uploader-phone-table">
        <div
          class="uploader-phone-row uploader-phone-header-row"
          :style="{ gridTemplateColumns: `72px repeat(${phoneRows.length}, minmax(180px, 1fr))` }"
        >
          <span class="uploader-phone-platform-cell"></span>
          <span v-for="phone in phoneRows" :key="phone.id" class="uploader-phone-head-cell">
            <small v-if="phone.remark">{{ phone.remark }}</small>
            <strong>{{ phone.phone }}</strong>
          </span>
        </div>
        <div
          v-for="platform in visiblePhonePlatforms"
          :key="platform.type"
          class="uploader-phone-row"
          :style="{ gridTemplateColumns: `72px repeat(${phoneRows.length}, minmax(180px, 1fr))` }"
        >
          <span class="uploader-phone-platform-cell">
            <PlatformIcon :src="platform.iconUrl" :label="platform.label" :platform="platform.type" />
          </span>
          <span
            v-for="phone in phoneRows"
            :key="`${platform.type}-${phone.id}`"
            class="uploader-phone-select-cell"
            :class="{
              disabled: phoneCellDisabled(phone, platform.type),
              unavailable: phoneCellUnavailable(phone, platform.type),
              empty: !selectedPhoneAccount(phone, platform.type),
              actionable: !uploaderPhoneEditMode,
              busy: phoneCellAgentBusy(phone, platform.type),
            }"
            :role="uploaderPhoneEditMode ? undefined : 'button'"
            :tabindex="uploaderPhoneEditMode ? undefined : 0"
            @click="runPhoneCellAction(phone, platform.type)"
            @keyup.enter="runPhoneCellAction(phone, platform.type)"
            @keyup.space.prevent="runPhoneCellAction(phone, platform.type)"
          >
            <template v-if="uploaderPhoneEditMode">
              <div class="uploader-phone-edit-line">
                <input
                  type="text"
                  :class="{ 'disabled-note': phoneCellDisabled(phone, platform.type) }"
                  :value="phoneCellInputValue(phone, platform.type)"
                  :list="phoneCellListId(phone, platform.type)"
                  :disabled="phoneCellSaving(phone, platform.type)"
                  :aria-label="`${platform.label} ${phone.phone}`"
                  @change="savePhonePlatform(phone, platform.type, $event)"
                  @keyup.enter="savePhonePlatform(phone, platform.type, $event)"
                />
                <button
                  type="button"
                  class="uploader-phone-disable-button"
                  :class="{ active: phoneCellDisabled(phone, platform.type) }"
                  :disabled="phoneCellSaving(phone, platform.type)"
                  @click="togglePhoneDisabled(phone, platform.type)"
                >
                  {{ phoneCellDisabled(phone, platform.type) ? '启用' : '禁用' }}
                </button>
              </div>
              <datalist :id="phoneCellListId(phone, platform.type)">
                <option
                  v-for="account in phoneAccountOptions(platform.type)"
                  :key="account.id"
                  :value="accountOptionText(account)"
                >
                </option>
              </datalist>
              <div
                v-if="selectedPhoneAccount(phone, platform.type) && phoneSelectedAccountRow(phone, platform.type)"
                class="uploader-phone-profile-editor"
              >
                <label class="uploader-phone-profile-avatar">
                  <img
                    v-if="phoneAccountProfileAvatar(phone, platform.type)"
                    :src="phoneAccountProfileAvatar(phone, platform.type)"
                    :alt="phoneAccountProfileName(phone, platform.type) || selectedPhoneAccount(phone, platform.type).topic"
                    loading="lazy"
                    decoding="async"
                  />
                  <span v-else>{{ phoneAccountInitial(selectedPhoneAccount(phone, platform.type)) }}</span>
                  <input
                    type="file"
                    accept="image/*"
                    aria-label="上传账号头像"
                    :disabled="platformBusyKey(platform.type) === selectedPhoneAccount(phone, platform.type).topic"
                    @change="uploadPhoneAccountAvatar(phone, platform.type, $event)"
                  />
                </label>
                <input
                  type="text"
                  class="uploader-phone-profile-name"
                  :value="phoneAccountProfileName(phone, platform.type)"
                  placeholder="账号名"
                  :disabled="platformBusyKey(platform.type) === selectedPhoneAccount(phone, platform.type).topic"
                  @change="savePhoneAccountProfile(phone, platform.type, $event)"
                  @keyup.enter="savePhoneAccountProfile(phone, platform.type, $event)"
                />
              </div>
            </template>
            <template v-else>
              <span v-if="phoneCellAgentBusy(phone, platform.type)" class="uploader-phone-running">
                启动中
              </span>
              <span
                v-else-if="selectedPhoneAccount(phone, platform.type)"
                class="uploader-phone-account-card"
                :class="{ 'no-name': !phoneAccountName(selectedPhoneAccount(phone, platform.type)) }"
              >
                <span class="uploader-phone-account-avatar">
                  <img
                    v-if="phoneAccountAvatar(selectedPhoneAccount(phone, platform.type))"
                    :src="phoneAccountAvatar(selectedPhoneAccount(phone, platform.type))"
                    :alt="selectedPhoneAccount(phone, platform.type).displayName || selectedPhoneAccount(phone, platform.type).topic"
                    loading="lazy"
                    decoding="async"
                  />
                  <span v-else>{{ phoneAccountInitial(selectedPhoneAccount(phone, platform.type)) }}</span>
                </span>
                <span class="uploader-phone-account-text">
                  <strong v-if="phoneAccountName(selectedPhoneAccount(phone, platform.type))">
                    {{ phoneAccountName(selectedPhoneAccount(phone, platform.type)) }}
                  </strong>
                </span>
              </span>
              <span
                v-else-if="phoneNoteValue(phone, platform.type)"
                class="uploader-phone-note"
                :class="{ disabled: phoneCellDisabled(phone, platform.type) }"
              >
                {{ phoneNoteValue(phone, platform.type) }}
              </span>
              <span v-else class="uploader-phone-account-empty">新建账号</span>
            </template>
          </span>
        </div>
      </div>
      <div v-else class="empty-state">暂无手机号配置</div>
      <p v-if="uploaderPhoneError" class="inline-error">{{ uploaderPhoneError }}</p>
    </section>

  </template>
