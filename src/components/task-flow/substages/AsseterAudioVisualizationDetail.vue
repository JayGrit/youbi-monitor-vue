<script setup>
import GenericSubStageDetail from './GenericSubStageDetail.vue'

defineProps({
  context: { type: Object, required: true },
})
</script>

<template>
  <GenericSubStageDetail
    :context="context"
    title="音频可视化"
    :summary-tables="['product_narration']"
    :data-tables="['asseter_jobs', 'asseter_static']"
    :job-tables="['asseter_jobs']"
    job-name-field="job_type"
    job-order-field="id"
    job-result-field="output_url"
    :job-pattern="/player|waveform|audio|visual/i"
    :media-pattern="/player|waveform|audio|visual|mov|webm|mp4|mp3|wav/i"
  />
</template>
