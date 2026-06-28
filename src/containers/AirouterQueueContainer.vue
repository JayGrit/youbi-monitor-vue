<script setup>
import AirouterQueuePage from '../pages/AirouterQueuePage.vue'

defineProps({
  app: { type: Object, required: true },
})
</script>

<template>
  <AirouterQueuePage :api="app.airouterApi" />
</template>
