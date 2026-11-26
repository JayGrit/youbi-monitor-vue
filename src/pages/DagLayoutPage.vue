<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import TaskProgressGraph from '../components/monitor/TaskProgressGraph.vue'
import { autoPositions, cardPorts, canExtendRoute, routeJunction, samePoint } from '../components/monitor/dagGrid'
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
const gridEdges = [
  { label: '顶部', axis: 'row', first: true },
  { label: '底部', axis: 'row', first: false },
  { label: '左侧', axis: 'column', first: true },
  { label: '右侧', axis: 'column', first: false },
]
const gridMessage = ref('')
const lineMode = ref(false)
const target = ref('')
const line = ref('')
const labels = computed(() => new Map(graph.value?.routeNodes.map(node => [node.id, node.label])))
const currentRoute = computed(() => draft.value?.routing?.[target.value])
const drawing = ref(null)
const drawMessage = ref('')
const sourcePorts = computed(() => line.value && draft.value
  ? cardPorts(draft.value.positions[line.value]) : {})
const targetPorts = computed(() => target.value && draft.value
  ? cardPorts(draft.value.positions[target.value]) : {})
const multipleInputs = computed(() => new Set(
  graph.value?.routeEdges.filter(edge => edge.to === target.value).map(edge => edge.from),
).size > 1)
const junction = computed(() => target.value && draft.value
  ? routeJunction(draft.value.positions[target.value], currentRoute.value || {}) : null)
const endpoints = computed(() => {
  if (!drawing.value) return []
  if (line.value && !drawing.value.length) return Object.values(sourcePorts.value)
  const ports = Object.values(targetPorts.value)
  if (!line.value || !multipleInputs.value || ports.some(point => samePoint(point, junction.value))) return ports
  return [...ports, junction.value]
})

function selectRoute(to, from) {
  if (saving.value) return
  target.value = to
  line.value = from
  drawing.value = from ? [] : [junction.value]
  drawMessage.value = ''
}

function editRoute() {
  status.value = ''
  return draft.value.routing[target.value] ||= { entry: 'left', junction: null, trunk: [], branches: {}, branchEntries: {} }
}

function cancelDrawing() {
  drawing.value = null
  drawMessage.value = ''
}

function changePoint(point) {
  if (!drawing.value || saving.value) return
  const points = drawing.value
  const side = Object.keys(targetPorts.value).find(key => samePoint(targetPorts.value[key], point))
  if (!points.length) {
    if (!Object.values(sourcePorts.value).some(port => samePoint(port, point))) {
      drawMessage.value = '先点来源卡片所在格子的一个边中点。'
      return
    }
    points.push(point)
    drawMessage.value = ''
    if (side) finishDrawing(side, points)
    return
  }
  if (!canExtendRoute(points, point)) {
    drawMessage.value = '只能连接同一行或同一列的点，不能经过已走过的位置。'
    return
  }
  const finished = !!side || (line.value && multipleInputs.value && samePoint(point, junction.value))
  if (!finished && points.length >= 64) {
    drawMessage.value = '已达到 64 个路径点，请撤销一个点或连接终点。'
    return
  }
  points.push(point)
  drawMessage.value = ''
  if (finished) finishDrawing(side, points)
}

function finishDrawing(side, points) {
  const route = editRoute()
  if (line.value) {
    route.branches[line.value] = points.length === 1 ? [...points] : points.slice(0, -1)
    route.branchEntries ||= {}
    if (side) route.branchEntries[line.value] = side
    else delete route.branchEntries[line.value]
  } else {
    route.entry = side
    route.trunk = points.slice(1)
  }
  cancelDrawing()
}

function undoPoint() {
  if (drawing.value && drawing.value.length > (line.value ? 0 : 1)) drawing.value.pop()
  drawMessage.value = ''
}

function resetLine() {
  const route = currentRoute.value
  cancelDrawing()
  if (!route) return
  if (line.value) {
    delete route.branches[line.value]
    if (route.branchEntries) delete route.branchEntries[line.value]
  } else {
    route.trunk = []
    if (!route.junction) route.entry = 'left'
  }
  status.value = ''
}

function resetTarget() {
  cancelDrawing()
  delete draft.value.routing[target.value]
  status.value = ''
}

function toggleLineMode() {
  cancelDrawing()
  lineMode.value = !lineMode.value
  target.value = ''
  line.value = ''
}

function automaticLayout() {
  const { routeNodes, routeEdges } = graph.value
  const positions = autoPositions(routeNodes, routeEdges)
  const used = Math.max(1, ...Object.values(positions).flatMap(cell => [cell.row, cell.column]))
  const size = Math.min(gridLimit, used + 2)
  return { positions, rows: size, columns: size }
}

function restore() {
  const current = draft.value
  const automatic = automaticLayout()
  draft.value = { ...automatic, routing: current.routing }
  if (Object.keys(current.routing).length) {
    draft.value.rows = Math.max(current.rows, automatic.rows)
    draft.value.columns = Math.max(current.columns, automatic.columns)
  }
  gridMessage.value = ''
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
  gridMessage.value = ''
  graph.value = null
  draft.value = null
  target.value = ''
  line.value = ''
  lineMode.value = false
  cancelDrawing()
  loading.value = true
  try {
    const result = await loadDagLayoutTemplate(type)
    if (!active) return
    graph.value = result
    const saved = result.layout
    const complete = result.routeNodes.every(node => Object.hasOwn(saved?.positions || {}, node.id))
    draft.value = complete ? {
      rows: saved.rows ?? saved.gridSize,
      columns: saved.columns ?? saved.gridSize,
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
      const liveBranches = values => Object.fromEntries(
        Object.entries(values || {}).filter(([from]) => incoming.get(id).has(from)),
      )
      routing[id] = { ...route, branches: liveBranches(route.branches),
        branchEntries: liveBranches(route.branchEntries) }
    }
    draft.value.routing = routing
    if (saved && Object.keys(routing).length) {
      draft.value.rows = Math.max(draft.value.rows, saved.rows ?? saved.gridSize)
      draft.value.columns = Math.max(draft.value.columns, saved.columns ?? saved.gridSize)
    }
    if (saved && !complete) status.value = '阶段配置已变化，当前显示自动布局。'
  } catch (failure) {
    if (active) error.value = failure.message
  } finally {
    if (active) loading.value = false
  }
})

function changeGrid({ label, axis, first }, delta) {
  const layout = draft.value
  const dimension = axis === 'row' ? 'rows' : 'columns'
  const size = layout[dimension]
  const newSize = size + delta
  if (saving.value || drawing.value !== null || newSize < 1 || newSize > gridLimit) return

  const cells = Object.values(layout.positions)
  const points = Object.values(layout.routing).flatMap(route => [
    ...(route.junction ? [route.junction] : []),
    ...route.trunk,
    ...Object.values(route.branches).flat(),
  ])
  const offset = first ? delta : 0
  gridMessage.value = ''
  if (delta < 0 && cells.some(cell => cell[axis] === (first ? 1 : size))) {
    gridMessage.value = `${label}边缘有节点，无法删除。`
    return
  }
  if (delta < 0 && points.some(point => point[axis] + offset < 0 || point[axis] + offset > newSize)) {
    gridMessage.value = `${label}边缘有自定义连线，请调整连线后再删除。`
    return
  }

  if (offset) {
    for (const point of new Set([...cells, ...points])) point[axis] += offset
  }
  layout[dimension] = newSize
  status.value = ''
}

function move(id, cell) {
  const { rows, columns, positions } = draft.value
  if (saving.value || cell.row < 1 || cell.row > rows || cell.column < 1 || cell.column > columns) return
  const occupant = Object.keys(positions).find(key =>
    positions[key].row === cell.row && positions[key].column === cell.column)
  if (occupant === id) return
  if (occupant) positions[occupant] = positions[id]
  positions[id] = cell
  gridMessage.value = ''
  status.value = ''
}

async function save() {
  gridMessage.value = ''
  saving.value = true
  error.value = ''
  status.value = ''
  try {
    const { rows, columns, positions, routing } = draft.value
    draft.value = await saveDagLayout(taskType.value, { rows, columns, positions, routing })
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
        <button type="button" :disabled="saving || drawing !== null" @click="restore">恢复自动布局</button>
        <button type="button" :disabled="saving || drawing !== null" @click="save">{{ saving ? '保存中' : '保存布局' }}</button>
        <button type="button" :aria-pressed="lineMode" :disabled="saving || !graph.routeEdges.length" @click="toggleLineMode">
          {{ lineMode ? '返回节点布局' : '编辑连线' }}
        </button>
        <span>{{ draft.rows }} 行 × {{ draft.columns }} 列</span>
      </template>
    </div>
    <div v-if="draft" class="layout-toolbar grid-toolbar" role="group" aria-label="调整网格边缘">
      <div v-for="edge in gridEdges" :key="edge.label" class="grid-edge">
        <button type="button"
          :disabled="saving || drawing !== null || (edge.axis === 'row' ? draft.rows : draft.columns) >= gridLimit"
          @click="changeGrid(edge, 1)">{{ edge.label }}增加</button>
        <button type="button"
          :disabled="saving || drawing !== null || (edge.axis === 'row' ? draft.rows : draft.columns) <= 1"
          @click="changeGrid(edge, -1)">{{ edge.label }}删除</button>
      </div>
    </div>
    <p v-if="gridMessage" role="alert">{{ gridMessage }}</p>
    <p v-if="error" role="alert">{{ error }}</p>
    <p v-else-if="loading" role="status">正在加载布局</p>
    <p v-else-if="status" role="status">{{ status }}</p>
    <div v-if="draft && lineMode" class="layout-toolbar">
      <span v-if="!target">点击已有依赖线或公共线开始编辑。重叠处可重复点击切换。</span>
      <template v-else>
      <strong>{{ line ? `${labels.get(line)} → ${labels.get(target)}` : `${labels.get(target)}的公共线` }}</strong>
      <template v-if="drawing !== null">
        <button type="button" :disabled="drawing.length <= (line ? 0 : 1)" @click="undoPoint">撤销上一步</button>
        <button type="button" @click="cancelDrawing">取消重画</button>
        <span>{{ drawMessage || (line && !drawing.length ? '从来源格的边中点开始。'
          : '依次点选横竖方向的点，点目标格的绿色边中点完成。') }}</span>
      </template>
      <template v-else>
        <button type="button" :disabled="saving" @click="selectRoute(target, line)">重画本线</button>
        <button type="button" :disabled="saving" @click="resetLine">本线恢复自动</button>
        <button type="button" :disabled="saving" @click="resetTarget">来线恢复自动</button>
      </template>
      </template>
    </div>
    <TaskProgressGraph
      v-if="graph && draft"
      :key="taskType"
      :task="{ taskType }"
      :progress="graph"
      :editor-layout="draft"
      :route-edit="lineMode ? { target, line, drawing, endpoints, multipleInputs } : null"
      :node-progress="empty"
      :node-title="empty"
      :open-task-flow="empty"
      @move="move"
      @select-route="selectRoute"
      @route-point="changePoint"
    />
  </section>
</template>

<style scoped>
.layout-page { min-width: 0; border: 1px solid #dce4ec; border-radius: 8px; background: white; }
.layout-toolbar { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; padding: 12px; }
.grid-toolbar { padding-top: 0; }
.grid-edge { display: flex; gap: 4px; }
.layout-page p { padding-inline: 12px; }
.layout-page :deep(.custom-dag-scroll) { max-height: 72vh; overflow: auto; border-top: 1px solid #dce4ec; }
</style>
