<script setup>
import ServerPage from '../pages/ServerPage.vue'

defineProps({
  app: { type: Object, required: true },
})
</script>

<template>
  <ServerPage
    :backupper-disk-status="app.serverBackupperDiskStatus"
    :backupper-disk-status-text="app.serverBackupperDiskStatusText"
    :loading="app.serverLoading"
    :error="app.serverError"
    :action-busy="app.serverActionBusy"
    :action-message="app.serverActionMessage"
    :upload-incomplete-report="app.serverUploadIncompleteReport"
    :upload-incomplete-report-error="app.serverUploadIncompleteReportError"
    :platform-icon-urls="app.platformIconUrls"
    :load-server-status="app.loadServerStatus"
    :refresh-server-status="app.refreshServerStatus"
    :run-minio-cleanup="app.runServerMinioCleanup"
    :clear-build-cache="app.clearServerBuildCache"
    :clear-mysql-binlog="app.clearServerMysqlBinlog"
    :clear-diagnostics="app.clearServerDiagnostics"
    :generate-upload-incomplete-report="app.generateServerUploadIncompleteReport"
  />
</template>
