<script setup>
import { computed } from 'vue'
import PublisherImageTable from './PublisherImageTable.vue'
import { jobPrompt } from './publisherUtils'

const props = defineProps({
  narrations: { type: Array, default: () => [] },
  jobs: { type: Array, default: () => [] },
  uploadImage: { type: Function, required: true },
})

const narration = computed(() => props.narrations[0] || {})
const imageItems = computed(() => [
  {
    kind: 'cover',
    label: '封面图',
    ratio: '1:1',
    prompt: jobPrompt(props.jobs, 'generate_cover_image', narration.value.cover_prompt, '1:1'),
    url: narration.value.cover_image_url || '',
  },
  {
    kind: 'background',
    label: '背景图',
    ratio: '4:3',
    prompt: jobPrompt(props.jobs, 'generate_background_image', narration.value.background_prompt, '4:3'),
    url: narration.value.background_image_url || '',
  },
])
</script>

<template>
  <div class="publisher-panel">
    <section class="flow-section narration-section">
      <h4>图片生成</h4>
      <PublisherImageTable :items="imageItems" :upload-image="uploadImage" />
      <pre v-if="narration.error_message" class="flow-stage-error">{{ narration.error_message }}</pre>
    </section>
  </div>
</template>
