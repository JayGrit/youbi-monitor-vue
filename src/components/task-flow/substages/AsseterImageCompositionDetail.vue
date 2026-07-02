<script setup>
import GenericSubStageDetail from './GenericSubStageDetail.vue'

defineProps({
  context: { type: Object, required: true },
})
</script>

<template>
  <GenericSubStageDetail
    :context="context"
    title="图片合成"
    :summary-tables="['product_narration']"
    :data-tables="['asseter_jobs', 'asseter_static']"
    :job-tables="['asseter_jobs']"
    job-name-field="job_type"
    job-order-field="id"
    job-result-field="output_url"
    :job-pattern="/cover|background|disc|kraft|title|image|stitch/i"
    :media-pattern="/cover|background|disc|kraft|title|image|png|jpg|webp|gif|mov/i"
  />
</template>
