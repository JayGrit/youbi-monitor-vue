<script setup>
import PublisherMetadataSummary from './PublisherMetadataSummary.vue'

defineProps({
  flow: { type: Object, default: null },
  rows: { type: Array, default: () => [] },
})
</script>

<template>
  <div class="publisher-panel">
    <PublisherMetadataSummary :flow="flow" :rows="rows" />
  </div>
</template>
