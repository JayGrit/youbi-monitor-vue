<script setup>
import { computed } from 'vue'

const props = defineProps({
  status: { type: String, default: '' },
})

const label = computed(() => ({
  ready: '排队',
  running: '执行中',
  success: '成功',
  failed: '失败',
})[String(props.status || '').toLowerCase()] || props.status || '未知')
</script>

<template>
  <span :class="['operator-status-badge', `operator-status-${status || 'unknown'}`]">
    {{ label }}
  </span>
</template>

<style scoped>
.operator-status-badge {
  display: inline-flex;
  align-items: center;
  min-height: 24px;
  padding: 0 9px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 700;
  background: #eef2f7;
  color: #475569;
}

.operator-status-running {
  background: #dbeafe;
  color: #1d4ed8;
}

.operator-status-success {
  background: #dcfce7;
  color: #15803d;
}

.operator-status-failed {
  background: #fee2e2;
  color: #b91c1c;
}
</style>
