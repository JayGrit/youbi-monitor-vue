<script setup>
import GenericSubStageDetail from './GenericSubStageDetail.vue'

defineProps({
  context: { type: Object, required: true },
})
</script>

<template>
  <GenericSubStageDetail
    :context="context"
    title="口播稿生成"
    :summary-tables="['product_narration']"
    :data-tables="['product_narration_sentence']"
    :job-tables="['publisher_jobs']"
    :job-pattern="/script|prompt|generation|narration/i"
  />
</template>
