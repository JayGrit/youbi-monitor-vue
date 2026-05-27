<script setup>
import { SPEECH_STAGE_KEY } from '../../domain/constants'

defineProps({
  flowTabs: { type: Array, default: () => [] },
  selectedStageKey: { type: String, default: '' },
  stageName: { type: Function, required: true },
})

const emit = defineEmits(['update:selectedStageKey'])
</script>

<template>
  <nav class="flow-tabs" aria-label="阶段详情标签">
    <button
      v-for="stage in flowTabs"
      :key="stage.key"
      type="button"
      :class="[
        'flow-tab',
        stage.key === SPEECH_STAGE_KEY ? 'flow-tab-wide' : '',
        selectedStageKey === stage.key ? 'flow-tab-active' : '',
      ]"
      @click="emit('update:selectedStageKey', stage.key)"
    >
      <span
        :class="[
          'dot',
          stage.status === 'failed'
            ? 'dot-failed'
            : stage.status === 'success'
              ? 'dot-success'
              : stage.status === 'running'
                ? 'dot-running'
                : 'dot-muted',
        ]"
      ></span>
      <span>{{ stageName(stage) }}</span>
    </button>
  </nav>
</template>
