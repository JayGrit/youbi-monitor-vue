<script setup>
import SpeechMainDetail from './SpeechMainDetail.vue'

defineProps({
  context: { type: Object, required: true },
})
const emit = defineEmits(['update:speechEditDraft'])
</script>

<template>
  <SpeechMainDetail
    :context="context"
    @update:speech-edit-draft="emit('update:speechEditDraft', $event)"
  />
</template>
