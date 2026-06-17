<script setup>
import { statusText } from '../../domain/constants'

defineProps({
  selectedTaskFlow: { type: Object, default: null },
  flowLoading: { type: Boolean, default: false },
  flowTaskTitle: { type: Function, required: true },
  refreshTaskFlow: { type: Function, required: true },
  closeTaskFlow: { type: Function, required: true },
})
</script>

<template>
  <header class="flow-header">
    <div>
      <h2>{{ flowTaskTitle(selectedTaskFlow) }}</h2>
      <p>
        {{ selectedTaskFlow?.task?.id || '加载中' }}
        <template v-if="selectedTaskFlow?.task?.status">
          · {{ statusText[selectedTaskFlow.task.status] || selectedTaskFlow.task.status }}
        </template>
        <template v-if="selectedTaskFlow?.task?.current_stage">
          · current {{ selectedTaskFlow.task.current_stage }}
        </template>
      </p>
    </div>
    <div class="flow-actions">
      <button type="button" :disabled="flowLoading" @click="refreshTaskFlow">
        {{ flowLoading ? 'Refreshing' : 'Refresh' }}
      </button>
      <button type="button" @click="closeTaskFlow">Back</button>
    </div>
  </header>
</template>
