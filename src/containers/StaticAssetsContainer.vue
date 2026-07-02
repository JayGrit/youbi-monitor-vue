<script setup>
import StaticAssetsPage from '../pages/StaticAssetsPage.vue'

defineProps({
  app: { type: Object, required: true },
})
</script>

<template>
  <StaticAssetsPage
    v-bind="app"
    v-model:asset-type-filter="app.assetTypeFilter"
    v-model:asset-scope-filter="app.assetScopeFilter"
    v-model:asset-task-id-filter="app.assetTaskIdFilter"
    v-model:asset-keyword-filter="app.assetKeywordFilter"
    v-model:upload-asset-type="app.uploadAssetType"
    v-model:upload-asset-task-id="app.uploadAssetTaskId"
    v-model:upload-asset-remark="app.uploadAssetRemark"
    v-model:text-asset-task-id="app.textAssetTaskId"
    v-model:text-asset-remark="app.textAssetRemark"
    v-model:text-asset-content="app.textAssetContent"
  />
</template>
