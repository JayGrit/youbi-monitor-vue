<script setup>
import { onMounted, ref, watch } from 'vue'
import TaskProgressGraph from '../components/monitor/TaskProgressGraph.vue'
import { autoPositions } from '../components/monitor/dagGrid'
import { loadDagLayoutTemplate, loadDagLayoutTypes, saveDagLayout } from '../api/dagLayouts'

const types = ref([])
const taskType = ref('')
const graph = ref(null)
const draft = ref(null)
const saving = ref(false)
const loading = ref(true)
const error = ref('')
const status = ref('')
const empty = () => ''
const gridLimit = 64

function automaticLayout() {
  const { routeNodes, routeEdges } = graph.value
  const positions = autoPositions(routeNodes, routeEdges)
  const used = Math.max(1, ...Object.values(positions).flatMap(cell => [cell.row, cell.column]))
  return { positions, gridSize: Math.min(gridLimit, used + 2) }
}

function restore() {
  draft.value = automaticLayout()
  status.value = ''
}

onMounted(async () => {
  try {
    types.value = (await loadDagLayoutTypes()).taskTypes
    taskType.value = types.value.includes('podcast_new') ? 'podcast_new' : types.value[0] || ''
  } catch (failure) {
    error.value = failure.message
  } finally {
    if (!taskType.value) loading.value = false
  }
})

watch(taskType, async (type, _, onCleanup) => {
  let active = true
  onCleanup(() => { active = false })
  error.value = ''
  status.value = ''
  graph.value = null
  draft.value = null
  loading.value = true
  try {
    const result = await loadDagLayoutTemplate(type)
    if (!active) return
    graph.value = result
    const saved = result.layout
    const complete = result.routeNodes.every(node => Object.hasOwn(saved?.positions || {}, node.id))
    draft.value = complete ? {
      gridSize: saved.gridSize,
      positions: Object.fromEntries(result.routeNodes.map(node => [node.id, saved.positions[node.id]])),
    } : automaticLayout()
    if (saved && !complete) status.value = '阶段配置已变化，当前显示自动布局。'
  } catch (failure) {
    if (active) error.value = failure.message
  } finally {
    if (active) loading.value = false
  }
})

function move(id, cell) {
  const { gridSize, positions } = draft.value
  if (saving.value || ![cell.row, cell.column].every(value => value >= 1 && value <= gridSize)) return
  const occupant = Object.keys(positions).find(key =>
    positions[key].row === cell.row && positions[key].column === cell.column)
  if (occupant === id) return
  if (occupant) positions[occupant] = positions[id]
  positions[id] = cell
  status.value = ''
}

async function save() {
  saving.value = true
  error.value = ''
  status.value = ''
  try {
    draft.value = await saveDagLayout(taskType.value, draft.value)
    status.value = '布局已保存'
  } catch (failure) {
    error.value = failure.message
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <section class="layout-page">
    <div class="layout-toolbar">
      <label>任务类型
        <select v-model="taskType" :disabled="saving || !types.length">
          <option v-for="type in types" :key="type" :value="type">{{ type }}</option>
        </select>
      </label>
      <template v-if="draft">
        <button type="button" :disabled="saving || draft.gridSize >= gridLimit"
          @click="draft.gridSize = Math.min(gridLimit, draft.gridSize + 2)">扩展网格</button>
        <button type="button" :disabled="saving" @click="restore">恢复自动布局</button>
        <button type="button" :disabled="saving" @click="save">{{ saving ? '保存中' : '保存布局' }}</button>
        <span>{{ draft.gridSize }} × {{ draft.gridSize }}</span>
      </template>
    </div>
    <p v-if="error" role="alert">{{ error }}</p>
    <p v-else-if="loading" role="status">正在加载布局</p>
    <p v-else-if="status" role="status">{{ status }}</p>
    <TaskProgressGraph
      v-if="graph && draft"
      :key="taskType"
      :task="{ taskType }"
      :progress="graph"
      :editor-layout="draft"
      :node-progress="empty"
      :node-title="empty"
      :open-task-flow="empty"
      @move="move"
    />
  </section>
</template>

<style scoped>
.layout-page { min-width: 0; border: 1px solid #dce4ec; border-radius: 8px; background: white; }
.layout-toolbar { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; padding: 12px; }
.layout-page p { padding-inline: 12px; }
.layout-page :deep(.custom-dag-scroll) { max-height: 72vh; overflow: auto; border-top: 1px solid #dce4ec; }
</style>
