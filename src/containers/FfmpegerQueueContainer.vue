<script setup>
import FfmpegerQueuePage from '../pages/FfmpegerQueuePage.vue'

defineProps({
  app: { type: Object, required: true },
})
</script>

<template>
  <FfmpegerQueuePage :api="app.ffmpegerApi" />
</template>
