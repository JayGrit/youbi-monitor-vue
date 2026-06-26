<script setup>
import TaskFlowPage from '../pages/TaskFlowPage.vue'

defineProps({
  app: { type: Object, required: true },
})
</script>

<template>
  <TaskFlowPage
    v-bind="app"
    v-model:speech-edit-draft="app.speechEditDraft"
  />
</template>
