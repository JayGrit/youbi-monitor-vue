<script setup>
import MonitorPage from '../pages/MonitorPage.vue'

defineProps({
  app: { type: Object, required: true },
})
</script>

<template>
  <MonitorPage
    v-bind="app"
    @update:task-status-filter="app.setTaskStatusFilter"
    @update:task-type-filter="app.setTaskTypeFilter"
    @update:task-stage-filter="app.setTaskStageFilter"
    @update:task-id-filter="app.setTaskIdFilter"
    @update:task-sort="app.setTaskSort"
    @apply-task-id-filter="app.applyTaskIdFilter"
    @set-task-page="app.setTaskPage"
    @clear-failure="app.openFailureKey = ''"
  />
</template>
