<script setup>
import SubmitterPage from '../pages/SubmitterPage.vue'

defineProps({
  app: { type: Object, required: true },
})
</script>

<template>
  <SubmitterPage
    v-bind="app"
    v-model:submitter-url="app.submitterUrl"
    v-model:submitter-author="app.submitterAuthor"
    v-model:submitter-platform="app.submitterPlatform"
    v-model:submitter-type-filter="app.submitterTypeFilter"
    v-model:submitter-uploader="app.submitterUploader"
    v-model:submitter-video-name="app.submitterVideoName"
    v-model:submitter-duration-filter="app.submitterDurationFilter"
    v-model:submitter-published-filter="app.submitterPublishedFilter"
    v-model:submitter-manual-subtitle-filter="app.submitterManualSubtitleFilter"
    v-model:submitter-sort="app.submitterSort"
    v-model:submitter-upload-filter="app.submitterUploadFilter"
  />
</template>
