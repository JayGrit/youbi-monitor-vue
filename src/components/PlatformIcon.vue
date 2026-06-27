<script setup>
const props = defineProps({
  src: { type: String, default: '' },
  label: { type: String, default: '' },
  platform: { type: String, default: '' },
  size: { type: Number, default: 28 },
})

function fallbackText() {
  return (props.label || props.platform || '?').trim().slice(0, 1).toUpperCase()
}
</script>

<template>
  <span
    class="platform-icon"
    :style="{ '--platform-icon-size': `${size}px` }"
    :title="label || platform"
  >
    <img
      v-if="src"
      :src="src"
      :alt="label || platform"
      loading="lazy"
      decoding="async"
    />
    <span v-else class="platform-icon-fallback">{{ fallbackText() }}</span>
  </span>
</template>

<style scoped>
.platform-icon {
  display: inline-grid;
  place-items: center;
  width: var(--platform-icon-size);
  height: var(--platform-icon-size);
  flex: 0 0 var(--platform-icon-size);
  border-radius: 6px;
  overflow: hidden;
  background: #f1f5f9;
  color: #475569;
  font-size: 12px;
  font-weight: 760;
  line-height: 1;
}

.platform-icon img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.platform-icon-fallback {
  transform: translateY(-0.5px);
}
</style>
