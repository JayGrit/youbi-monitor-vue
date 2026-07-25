<script setup>
import SubmitterMonitorPage from '../pages/SubmitterMonitorPage.vue'

defineProps({
  app: { type: Object, required: true },
})
</script>

<template>
  <SubmitterMonitorPage v-bind="app" />
</template>
