<script setup>
import GenericSubStageDetail from './GenericSubStageDetail.vue'

defineProps({
  context: { type: Object, required: true },
})
</script>

<template>
  <GenericSubStageDetail
    :context="context"
    title="源音频转写"
    :summary-tables="['whisper']"
    :data-tables="['whisper_asr_segment', 'whisper_word_timestamp']"
    :media-pattern="/audio|vocal|source|asr|transcript|subtitle/i"
  />
</template>
