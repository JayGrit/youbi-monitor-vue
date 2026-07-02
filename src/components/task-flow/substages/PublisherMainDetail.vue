<script setup>
import PublisherMainPanel from '../publisher/PublisherMainPanel.vue'

defineProps({
  context: { type: Object, required: true },
})
</script>

<template>
  <PublisherMainPanel
    :flow="context.flow"
    :rows="context.publisherResultRows(context.stage)"
  />
</template>
