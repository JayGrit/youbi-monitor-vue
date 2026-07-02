<script setup>
import GenericSubStageDetail from './GenericSubStageDetail.vue'

defineProps({
  context: { type: Object, required: true },
})
</script>

<template>
  <GenericSubStageDetail
    :context="context"
    title="祝福视频合成"
    :summary-tables="['product_blessing']"
    :data-tables="['product_blessing']"
    :job-tables="['combiner_jobs', 'combiner_job']"
    job-name-field="job_key"
    job-order-field="id"
    job-result-field="response_json"
    :media-pattern="/blessing|image|music|video|mp4|mov|webm|mp3|wav|png|jpg/i"
  />
</template>
