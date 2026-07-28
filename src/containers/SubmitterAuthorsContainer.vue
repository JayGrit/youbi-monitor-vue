<script setup>
import SubmitterAuthorsPage from '../pages/SubmitterAuthorsPage.vue'

defineProps({
  app: { type: Object, required: true },
})
</script>

<template>
  <SubmitterAuthorsPage
    v-bind="app"
    v-model:submitter-input="app.submitterInput"
  />
</template>
