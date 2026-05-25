<script setup>
defineProps({
  accountKeyGroups: { type: Array, default: () => [] },
  bilibiliQrCode: { type: Object, default: null },
  bilibiliQrMessage: { type: String, default: '' },
  xiaohongshuQrCode: { type: Object, default: null },
  xiaohongshuQrMessage: { type: String, default: '' },
  addDouyinCdpRow: { type: Function, required: true },
  startXiaohongshuQrLogin: { type: Function, required: true },
  startBilibiliQrLogin: { type: Function, required: true },
  accountDisplay: { type: Function, required: true },
  accountCountText: { type: Function, required: true },
  nextSendText: { type: Function, required: true },
  qrImageUrl: { type: Function, required: true },
  platformErrorText: { type: Function, required: true },
})
</script>

<template>
  <section class="account-page" aria-label="账号管理">
    <section class="biliup-panel account-overview" aria-label="账号管理总览">
      <div class="biliup-head">
        <div>
          <h2>账号</h2>
        </div>
        <div class="biliup-actions">
          <button type="button" @click="addDouyinCdpRow()">新增抖音配置</button>
          <button type="button" @click="startXiaohongshuQrLogin(null)">小红书扫码</button>
          <button type="button" @click="startBilibiliQrLogin(null)">扫码登录新账号</button>
        </div>
      </div>

      <div v-if="accountKeyGroups.length" class="account-key-list" aria-label="按 key 分组账号表">
        <section v-for="group in accountKeyGroups" :key="group.key" class="account-key-group">
          <div class="account-key-title">
            <strong>{{ group.key }}</strong>
            <span>{{ group.rows.filter(item => item.configured).length }}/3 已配置</span>
          </div>
          <div class="account-table">
            <div class="account-row account-header account-platform-row">
              <span>Type</span>
              <span>账号</span>
              <span>今日已发</span>
              <span>冷却等待</span>
              <span>下次可发送</span>
            </div>
            <div
              v-for="item in group.rows"
              :key="`${group.key}-${item.type}`"
              class="account-row account-platform-row"
            >
              <span class="platform-mark">
                <img :src="item.iconUrl" :alt="item.label" loading="lazy" decoding="async" />
              </span>
              <span>{{ item.configured ? accountDisplay(item.row, item.type) : '' }}</span>
              <span>{{ item.configured ? accountCountText(item.row.todayUploadCount) : '-' }}</span>
              <span>{{ item.configured ? accountCountText(item.row.cooldownWaitingCount) : '-' }}</span>
              <span>{{ item.configured ? nextSendText(item.row) : '-' }}</span>
            </div>
          </div>
        </section>
      </div>
      <div v-else class="empty-state">暂无账号配置</div>

      <div class="account-qr-grid">
        <div v-if="bilibiliQrCode" class="bilibili-login">
          <img :src="qrImageUrl(bilibiliQrCode.url)" alt="B站登录二维码" />
          <div>
            <strong>{{ bilibiliQrMessage }}</strong>
            <a :href="bilibiliQrCode.url" target="_blank" rel="noreferrer">打开登录链接</a>
          </div>
        </div>

        <div v-if="xiaohongshuQrCode" class="bilibili-login">
          <img :src="xiaohongshuQrCode.imageDataUrl" alt="小红书登录二维码" />
          <div>
            <strong>{{ xiaohongshuQrMessage }}</strong>
            <span>请用小红书 App 扫码并确认登录</span>
          </div>
        </div>
      </div>

      <p v-if="platformErrorText()" class="inline-error">{{ platformErrorText() }}</p>
    </section>
  </section>
</template>
