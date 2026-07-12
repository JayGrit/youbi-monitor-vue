<script setup>
import SpeakerSegmentsPage from '../pages/SpeakerSegmentsPage.vue'

defineProps({
  app: { type: Object, required: true },
})
</script>

<template>
  <SpeakerSegmentsPage :api="app.speakerSegmentsApi" />
</template>
