<script setup>
import GenericSubStageDetail from './GenericSubStageDetail.vue'

defineProps({
  context: { type: Object, required: true },
})
</script>

<template>
  <GenericSubStageDetail
    :context="context"
    title="多段配音"
    :summary-tables="['speaker']"
    :data-tables="['speaker_segment']"
    :media-pattern="/dubbing|tts|segment|reference|audio|voice/i"
  />
</template>
