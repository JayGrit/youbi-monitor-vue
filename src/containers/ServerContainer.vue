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
    :load-server-status="app.loadServerStatus"
    :clear-build-cache="app.clearServerBuildCache"
    :clear-diagnostics="app.clearServerDiagnostics"
  />
</template>
