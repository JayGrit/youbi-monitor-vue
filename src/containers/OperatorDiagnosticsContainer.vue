<script setup>
import OperatorDiagnosticsPage from '../pages/OperatorDiagnosticsPage.vue'

defineProps({
  app: { type: Object, required: true },
})
</script>

<template>
  <OperatorDiagnosticsPage
    :api="app.operatorDiagnosticsApi"
    :platform-icon-urls="app.platformIconUrls"
  />
</template>
