<script setup>
import GenericSubStageDetail from './GenericSubStageDetail.vue'

defineProps({
  context: { type: Object, required: true },
})
</script>

<template>
  <GenericSubStageDetail
    :context="context"
    title="旁白配音"
    :summary-tables="['product_narration']"
    :data-tables="['product_narration_sentence', 'speaker_segment']"
    :media-pattern="/narration|tts|reference|voice|audio|segment/i"
  />
</template>
