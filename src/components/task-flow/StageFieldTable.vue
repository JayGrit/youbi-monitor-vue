<script setup>
import { formatJson, isLongValue, shortValue } from '../../utils/jsonDisplay'

defineProps({
  rows: { type: Array, default: () => [] },
})
</script>

<template>
  <div class="flow-section">
    <h4>Inputs / Outputs</h4>
    <div v-if="rows.length" class="field-table">
      <div class="field-row field-header">
        <span>Type</span>
        <span>Field</span>
        <span>Value</span>
      </div>
      <div v-for="field in rows" :key="`${field.direction}-${field.name}`" class="field-row">
        <strong>{{ field.direction }}</strong>
        <span>{{ field.name }}</span>
        <span>
          <a v-if="field.asset?.url" :href="field.asset.url" target="_blank" rel="noreferrer">
            {{ shortValue(field.value) }}
          </a>
          <template v-else>{{ shortValue(field.value) }}</template>
        </span>
        <pre v-if="isLongValue(field.value)" class="field-long">{{ formatJson(field.value) }}</pre>
      </div>
    </div>
    <p v-else class="flow-muted">No input or output fields.</p>
  </div>
</template>
