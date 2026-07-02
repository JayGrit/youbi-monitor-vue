<script setup>
import GenericSubStageDetail from './GenericSubStageDetail.vue'

defineProps({
  context: { type: Object, required: true },
})
</script>

<template>
  <GenericSubStageDetail
    :context="context"
    title="配音对齐"
    :summary-tables="['whisper']"
    :data-tables="['whisper_asr_segment', 'whisper_word_timestamp']"
    :media-pattern="/align|dubbing|audio|timestamp|asr/i"
  />
</template>
