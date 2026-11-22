<script setup>
import { computed, onMounted, ref, watch } from 'vue'
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
const lineMode = ref(false)
const target = ref('')
const line = ref('')
const targets = computed(() => {
  const inputs = new Set(graph.value?.routeEdges.map(edge => edge.to))
  return graph.value?.routeNodes.filter(node => inputs.has(node.id)) || []
})
const sources = computed(() => {
  const inputs = new Set(graph.value?.routeEdges.filter(edge => edge.to === target.value).map(edge => edge.from))
  return graph.value?.routeNodes.filter(node => inputs.has(node.id)) || []
})
const currentRoute = computed(() => draft.value?.routing?.[target.value])
const sides = { left: '左侧', right: '右侧', top: '上方', bottom: '下方' }

function selectTarget(id) {
  if (!targets.value.some(node => node.id === id)) return
  target.value = id
  line.value = ''
}

function editRoute() {
  status.value = ''
  return draft.value.routing[target.value] ||= { entry: 'left', junction: null, trunk: [], branches: {} }
}

function changePoint(index, point) {
  if (!target.value || saving.value) return
  const route = editRoute()
  if (index === -1) {
    route.junction = point
    return
  }
  const points = line.value ? (route.branches[line.value] ||= []) : route.trunk
  if (index === null) {
    if (points.length < 64) points.push(point)
  } else if (point) {
    points[index] = point
  } else {
    points.splice(index, 1)
  }
}

function resetLine() {
  const route = currentRoute.value
  if (!route) return
  if (line.value) delete route.branches[line.value]
  else route.trunk = []
  status.value = ''
}

function resetTarget() {
  delete draft.value.routing[target.value]
  status.value = ''
}

function toggleLineMode() {
  lineMode.value = !lineMode.value
  if (lineMode.value && !target.value && targets.value.length) selectTarget(targets.value[0].id)
}

function automaticLayout() {
  const { routeNodes, routeEdges } = graph.value
  const positions = autoPositions(routeNodes, routeEdges)
  const used = Math.max(1, ...Object.values(positions).flatMap(cell => [cell.row, cell.column]))
  return { positions, gridSize: Math.min(gridLimit, used + 2) }
}

function restore() {
  const current = draft.value
  const automatic = automaticLayout()
  draft.value = { ...automatic, routing: current.routing,
    gridSize: Object.keys(current.routing).length ? Math.max(current.gridSize, automatic.gridSize) : automatic.gridSize }
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
  target.value = ''
  line.value = ''
  lineMode.value = false
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
    const routing = {}
    const incoming = new Map()
    for (const { from, to } of result.routeEdges) {
      if (!incoming.has(to)) incoming.set(to, new Set())
      incoming.get(to).add(from)
    }
    for (const [id, route] of Object.entries(saved?.routing || {})) {
      if (!incoming.has(id)) continue
      routing[id] = { ...route, branches: Object.fromEntries(
        Object.entries(route.branches).filter(([from]) => incoming.get(id).has(from)),
      ) }
    }
    draft.value.routing = routing
    if (saved && Object.keys(routing).length) draft.value.gridSize = Math.max(draft.value.gridSize, saved.gridSize)
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
        <button type="button" :aria-pressed="lineMode" :disabled="saving || !targets.length" @click="toggleLineMode">
          {{ lineMode ? '返回节点布局' : '编辑连线' }}
        </button>
        <span>{{ draft.gridSize }} × {{ draft.gridSize }}</span>
      </template>
    </div>
    <p v-if="error" role="alert">{{ error }}</p>
    <p v-else-if="loading" role="status">正在加载布局</p>
    <p v-else-if="status" role="status">{{ status }}</p>
    <div v-if="draft && lineMode" class="layout-toolbar">
      <label>目标节点
        <select :value="target" :disabled="saving" @change="selectTarget($event.target.value)">
          <option v-for="node in targets" :key="node.id" :value="node.id">{{ node.label }}</option>
        </select>
      </label>
      <label>线路
        <select v-model="line" :disabled="saving">
          <option value="">公共线</option>
          <option v-for="node in sources" :key="node.id" :value="node.id">{{ node.label }} 的支线</option>
        </select>
      </label>
      <label>箭头入口
        <select :value="currentRoute?.entry || 'left'" :disabled="saving"
          @change="editRoute().entry = $event.target.value">
          <option v-for="(label, value) in sides" :key="value" :value="value">{{ label }}</option>
        </select>
      </label>
      <button type="button" :disabled="saving" @click="resetLine">清除本线拐点</button>
      <button type="button" :disabled="saving" @click="resetTarget">来线恢复自动</button>
      <span>点击格线添加拐点，拖动调整，右键或 Delete 删除。实心点为合流点。</span>
    </div>
    <TaskProgressGraph
      v-if="graph && draft"
      :key="taskType"
      :task="{ taskType }"
      :progress="graph"
      :editor-layout="draft"
      :route-edit="lineMode ? { target, line } : null"
      :node-progress="empty"
      :node-title="empty"
      :open-task-flow="empty"
      @move="move"
      @select-target="selectTarget"
      @route-point="changePoint"
    />
  </section>
</template>

<style scoped>
.layout-page { min-width: 0; border: 1px solid #dce4ec; border-radius: 8px; background: white; }
.layout-toolbar { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; padding: 12px; }
.layout-page p { padding-inline: 12px; }
.layout-page :deep(.custom-dag-scroll) { max-height: 72vh; overflow: auto; border-top: 1px solid #dce4ec; }
</style>
