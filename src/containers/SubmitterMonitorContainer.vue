<script setup>
import SubmitterMonitorPage from '../pages/SubmitterMonitorPage.vue'

defineProps({
  app: { type: Object, required: true },
})
</script>

<template>
  <SubmitterMonitorPage
    :submitter-monitor-state="app.submitterMonitorState || app.submitter?.monitorState"
    :submitter-monitor-loading="app.submitterMonitorLoading || app.submitter?.monitorLoading"
    :submitter-monitor-error="app.submitterMonitorError || app.submitter?.monitorError"
    :submitter-monitor-loaded-at="app.submitterMonitorLoadedAt || app.submitter?.monitorLoadedAt"
    :submitter-monitor-continue-busy="app.submitterMonitorContinueBusy || app.submitter?.monitorContinueBusy"
    :platform-icon-urls="app.platformIconUrls"
    :load-submitter-monitor="app.loadSubmitterMonitor || app.submitter?.loadMonitor"
    :continue-submitter-author-scan="app.continueSubmitterAuthorScan || app.submitter?.continueAuthorScan"
  />
</template>
