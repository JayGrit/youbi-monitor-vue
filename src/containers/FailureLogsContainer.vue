<script setup>
import FailureLogsPage from '../pages/FailureLogsPage.vue'

defineProps({
  app: { type: Object, required: true },
})
</script>

<template>
  <FailureLogsPage
    v-model:stage-filter="app.failureLogStageFilter"
    v-model:type-filter="app.failureLogTypeFilter"
    v-model:time-filter="app.failureLogTimeFilter"
    v-model:platform-filter="app.failureLogPlatformFilter"
    :rows="app.failureLogRows"
    :filtered-rows="app.filteredFailureLogRows"
    :loading="app.failureLogLoading"
    :error="app.failureLogError"
    :action-error="app.failureLogActionError"
    :action-busy="app.failureLogActionBusy"
    :loaded-at="app.failureLogLoadedAt"
    :stage-options="app.failureLogStageOptions"
    :type-options="app.failureLogTypeOptions"
    :platform-options="app.failureLogPlatformOptions"
    :platform-icon-urls="app.platformIconUrls"
    :selected-ids="app.failureLogSelectedIds"
    :selected-set="app.failureLogSelectedSet"
    :all-selected="app.failureLogAllSelected"
    :actual-published-selected-rows="app.failureLogActualPublishedSelectedRows"
    :retry-upload-selected-rows="app.failureLogRetryUploadSelectedRows"
    :abandon-upload-selected-rows="app.failureLogAbandonUploadSelectedRows"
    :defer-selected-rows="app.failureLogDeferSelectedRows"
    :load-failure-logs="app.loadFailureLogs"
    :mark-selected-actual-published="app.markSelectedFailureLogActualPublished"
    :retry-selected-uploads="app.retrySelectedFailureLogUploads"
    :abandon-selected-uploads="app.abandonSelectedFailureLogUploads"
    :defer-selected-tasks="app.deferSelectedFailureLogTasks"
    :toggle-row="app.toggleFailureLogRow"
    :toggle-all="app.toggleFailureLogAll"
    :clear-selection="app.clearFailureLogSelection"
    :reset-filters="app.resetFailureLogFilters"
    :open-task-flow="app.openTaskFlow"
    :copy-task-id="app.copyTaskId"
  />
</template>
