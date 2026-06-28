<script setup>
defineProps({
  activePage: { type: String, required: true },
  flowPageOpen: { type: Boolean, default: false },
})

const emit = defineEmits(['openPage'])
</script>

<template>
  <header class="top-bar">
    <nav class="page-tabs" aria-label="页面切换">
      <button
        type="button"
        :class="{ active: activePage === 'submitter-authors' && !flowPageOpen }"
        @click="emit('openPage', 'submitter-authors')"
      >
        作者管理
      </button>
      <button
        type="button"
        :class="{ active: activePage === 'submitter' && !flowPageOpen }"
        @click="emit('openPage', 'submitter')"
      >
        素材
      </button>
      <button
        type="button"
        :class="{ active: activePage === 'monitor' || flowPageOpen }"
        @click="emit('openPage', 'monitor')"
      >
        监控
      </button>
      <button
        type="button"
        :class="{ active: activePage === 'accounts' && !flowPageOpen }"
        @click="emit('openPage', 'accounts')"
      >
        账号
      </button>
      <button
        type="button"
        :class="{ active: activePage === 'operator-diagnostics' && !flowPageOpen }"
        @click="emit('openPage', 'operator-diagnostics')"
      >
        诊断
      </button>
      <button
        type="button"
        :class="{ active: activePage === 'ffmpeger' && !flowPageOpen }"
        @click="emit('openPage', 'ffmpeger')"
      >
        合成
      </button>
      <button
        type="button"
        :class="{ active: activePage === 'airouter' && !flowPageOpen }"
        @click="emit('openPage', 'airouter')"
      >
        中转
      </button>
      <button
        type="button"
        :class="{ active: activePage === 'failure-logs' && !flowPageOpen }"
        @click="emit('openPage', 'failure-logs')"
      >
        错误日志
      </button>
    </nav>
  </header>
</template>
