<script setup>
import { computed, ref, watch } from 'vue'
import { createPlatformIconUrls, uploadPlatformText } from '../../domain/constants'
import { formatDuration } from '../../utils/format'
import { loadDagLayout } from '../../api/dagLayouts'
import { cellWidth, cellHeight, insetX, insetY, origin, autoPositions, mergedPaths, gridPoint, routePreview } from './dagGrid'

const props = defineProps({
  progress: { type: Object, default: null },
  nodeProgress: { type: Function, required: true },
  nodeTitle: { type: Function, required: true },
  openTaskFlow: { type: Function, required: true },
  task: { type: Object, required: true },
  editorLayout: { type: Object, default: null },
  routeEdit: { type: Object, default: null },
})

const emit = defineEmits(['move', 'route-point', 'select-route'])
const container = ref(null)
const drag = ref(null)
const markerId = `dag-arrow-${Math.random().toString(36).slice(2)}`
const platformIconUrls = createPlatformIconUrls(import.meta.env.BASE_URL)

const nodes = computed(() => Array.isArray(props.progress?.routeNodes) ? props.progress.routeNodes : [])
const edges = computed(() => Array.isArray(props.progress?.routeEdges) ? props.progress.routeEdges : [])
const savedLayout = ref(null)
watch(() => props.task.taskType || props.task.task_type, async (taskType, _, onCleanup) => {
  savedLayout.value = null
  if (!taskType || props.editorLayout) return
  let active = true
  onCleanup(() => { active = false })
  const result = await loadDagLayout(taskType)
  if (active && result?.taskType === taskType) savedLayout.value = result
}, { immediate: true })

const customLayout = computed(() => {
  const saved = props.editorLayout || savedLayout.value
  if (!saved?.positions || !nodes.value.length) return null
  const rows = saved.rows ?? saved.gridSize
  const columns = saved.columns ?? saved.gridSize
  if (!Number.isInteger(rows) || !Number.isInteger(columns)) return null
  const occupied = new Set()
  for (const { id } of nodes.value) {
    const cell = saved.positions[id]
    if (!cell || !Number.isInteger(cell.row) || cell.row < 1 || cell.row > rows
      || !Number.isInteger(cell.column) || cell.column < 1 || cell.column > columns) return null
    const key = `${cell.row}:${cell.column}`
    if (occupied.has(key)) return null
    occupied.add(key)
  }
  return saved
})

const positions = computed(() => customLayout.value?.positions || autoPositions(nodes.value, edges.value))
const dimensions = computed(() => {
  const cells = nodes.value.map(node => positions.value[node.id])
  for (const node of nodes.value) {
    const route = customLayout.value?.routing?.[node.id]
    if (!route) continue
    if (route.junction) cells.push(route.junction)
    cells.push(...(route.trunk || []))
    for (const points of Object.values(route.branches || {})) cells.push(...points)
  }
  return {
    width: (props.editorLayout?.columns ?? Math.max(1, ...cells.map(cell => cell.column))) * cellWidth + 1,
    height: (props.editorLayout?.rows ?? Math.max(1, ...cells.map(cell => cell.row))) * cellHeight + 1,
  }
})
const displayedPaths = computed(() => mergedPaths(nodes.value, edges.value, positions.value, customLayout.value?.routing))

const labels = computed(() => new Map(nodes.value.map(node => [node.id, node.label])))
function pathLabel(path) {
  return path.from ? `${labels.value.get(path.from)} → ${labels.value.get(path.to)}`
    : `${labels.value.get(path.to)}的公共线`
}

function selectRoute(event, path) {
  if (event.detail > 0) {
    const hits = document.elementsFromPoint(event.clientX, event.clientY)
      .filter(element => element.classList.contains('route-hit') && container.value.contains(element))
    const options = [...new Map(hits.map(element => {
      const route = displayedPaths.value.find(candidate => candidate.id === element.dataset.routeId)
      return [route ? `${route.from || ''}->${route.to}` : '', route]
    })).values()].filter(Boolean)
    if (options.length > 1) {
      const current = options.findIndex(option =>
        (option.from || '') === props.routeEdit.line && option.to === props.routeEdit.target)
      path = options[(current + 1) % options.length]
    }
  }
  emit('select-route', path.to, path.from || '')
}

const activeDrawing = computed(() => props.routeEdit?.drawing ?? null)
const drawPatternId = `${markerId}-grid`
const visiblePaths = computed(() => activeDrawing.value === null ? displayedPaths.value
  : displayedPaths.value.filter(path =>
    path.to !== props.routeEdit.target
      || (props.routeEdit.multipleInputs && (path.from || '') !== props.routeEdit.line)
      || (!props.routeEdit.multipleInputs && !props.routeEdit.line && !!path.from)))

function clickGridPoint(event) {
  const rect = container.value.getBoundingClientRect()
  const x = event.clientX - rect.left
  const y = event.clientY - rect.top
  const row = Math.round(y / cellHeight * 2) / 2
  const column = Math.round(x / cellWidth * 2) / 2
  const { rows, columns } = props.editorLayout
  if (row < 0 || row > rows || column < 0 || column > columns) return
  if (Math.hypot(x - column * cellWidth, y - row * cellHeight) <= 12) {
    emit('route-point', { row, column })
  }
}

function nodeStyle(id) {
  const { x, y } = origin(positions.value[id])
  const offset = drag.value?.id === id ? drag.value : null
  return {
    left: `${x + insetX}px`,
    top: `${y + insetY}px`,
    transform: offset ? `translate(${offset.dx}px, ${offset.dy}px)` : undefined,
  }
}

function pointerDown(event, id) {
  if (!props.editorLayout || props.routeEdit || event.button !== 0 || drag.value) return
  event.currentTarget.setPointerCapture(event.pointerId)
  const rect = container.value.getBoundingClientRect()
  drag.value = { id, pointer: event.pointerId, x: event.clientX - rect.left,
    y: event.clientY - rect.top, dx: 0, dy: 0 }
}

function updateDrag(event) {
  if (drag.value?.pointer !== event.pointerId) return
  const rect = container.value.getBoundingClientRect()
  const x = event.clientX - rect.left
  const y = event.clientY - rect.top
  Object.assign(drag.value, {
    dx: x - drag.value.x, dy: y - drag.value.y,
    column: Math.floor(x / cellWidth) + 1, row: Math.floor(y / cellHeight) + 1,
  })
}

function endDrag(event, drop = false) {
  if (drag.value?.pointer !== event.pointerId) return
  updateDrag(event)
  const { id, row, column } = drag.value
  drag.value = null
  const clip = container.value.parentElement.getBoundingClientRect()
  if (drop && event.clientX >= clip.left && event.clientX < clip.right
      && event.clientY >= clip.top && event.clientY < clip.bottom) emit('move', id, { row, column })
}

function onNodeKey(event, id) {
  if (!props.editorLayout || props.routeEdit) return
  const delta = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] }[event.key]
  if (!delta) return
  event.preventDefault()
  const { row, column } = positions.value[id]
  emit('move', id, { row: row + delta[0], column: column + delta[1] })
}

function statusClass(node) {
  if (node.stage === 'uploader' && node.status === 'running' && node.platformStatuses?.length) {
    return 'status-success'
  }
  return `status-${node.status || 'pending'}`
}

function hasUploaderPlatforms(node) {
  return node.stage === 'uploader' && Array.isArray(node.platformStatuses) && node.platformStatuses.length > 0
}

function platformTitle(platformStatus) {
  const platform = uploadPlatformText[platformStatus.platform] || platformStatus.platform
  return `${platform} · ${platformStatus.status}`
}

function showTime(node) {
  return Number(node.elapsedSeconds) > 0 && !(Number.isFinite(Number(node.totalCount)) && Number(node.totalCount) > 0)
}

</script>

<template>
  <div class="custom-dag-scroll">
    <div
      ref="container"
      class="task-dag custom-dag"
      :class="{ 'dag-editor': editorLayout }"
      :style="{ width: dimensions.width + 'px', height: dimensions.height + 'px' }"
      aria-label="任务 DAG 阶段图"
      @pointermove="updateDrag"
      @pointerup="endDrag($event, true)"
      @pointercancel="endDrag($event)"
      @lostpointercapture="endDrag($event)"
    >
      <svg class="task-dag-links" :class="{ 'drawing-links': activeDrawing !== null }">
        <defs>
          <marker :id="markerId" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
            <path d="M0,0 L7,3.5 L0,7 Z" />
          </marker>
          <pattern v-if="activeDrawing !== null" :id="drawPatternId" patternUnits="userSpaceOnUse"
            :width="cellWidth" :height="cellHeight">
            <circle cx="0" cy="0" r="3" />
            <circle :cx="cellWidth" cy="0" r="3" />
            <circle cx="0" :cy="cellHeight" r="3" />
            <circle :cx="cellWidth" :cy="cellHeight" r="3" />
            <circle :cx="cellWidth / 2" cy="0" r="3" />
            <circle :cx="cellWidth / 2" :cy="cellHeight" r="3" />
            <circle cx="0" :cy="cellHeight / 2" r="3" />
            <circle :cx="cellWidth" :cy="cellHeight / 2" r="3" />
            <circle :cx="cellWidth / 2" :cy="cellHeight / 2" r="3" />
          </pattern>
        </defs>
        <path
          v-for="path in visiblePaths"
          :key="path.id"
          class="edge-line"
          :class="{ 'editing-route': routeEdit?.target === path.to && routeEdit.line === (path.from || '') }"
          :d="path.d"
          :marker-end="path.arrow ? `url(#${markerId})` : null"
        />
        <template v-if="routeEdit && activeDrawing === null">
          <path
            v-for="path in visiblePaths"
            :key="'hit:' + path.id"
            class="route-hit"
            :data-route-id="path.id"
            :d="path.d"
            :aria-label="pathLabel(path)"
            role="button"
            tabindex="0"
            @click.stop="selectRoute($event, path)"
            @keydown.enter.prevent="emit('select-route', path.to, path.from || '')"
            @keydown.space.prevent="emit('select-route', path.to, path.from || '')"
          >
            <title>{{ pathLabel(path) }}</title>
          </path>
        </template>
        <template v-if="activeDrawing !== null">
          <rect class="draw-grid" :width="dimensions.width" :height="dimensions.height"
            :fill="`url(#${drawPatternId})`" @click.stop="clickGridPoint" />
          <path class="draw-preview" :d="routePreview(activeDrawing)" />
          <circle v-for="point in activeDrawing" :key="`${point.row}:${point.column}`"
            class="draw-visited" :cx="gridPoint(point).x" :cy="gridPoint(point).y" r="4" />
          <circle v-for="point in routeEdit.endpoints" :key="`${point.row}:${point.column}`"
            class="draw-endpoint" :cx="gridPoint(point).x" :cy="gridPoint(point).y" r="7"
            role="button" tabindex="0" aria-label="连线端点"
            @click.stop="emit('route-point', point)"
            @keydown.enter.prevent="emit('route-point', point)" />
        </template>
      </svg>

      <div class="task-dag-grid">
        <button
          v-for="node in nodes"
          :key="node.id"
          type="button"
          :class="['stage-node', 'stage-node-button', statusClass(node), { 'with-uploader-platforms': hasUploaderPlatforms(node), dragging: drag?.id === node.id }]"
          :style="nodeStyle(node.id)"
          :title="editorLayout ? node.label : `${nodeTitle({ ...node, key: node.stage })}\n点击查看任务流详情`"
          @click="!editorLayout && openTaskFlow(task, node.stage, node.subStage)"
          @pointerdown="pointerDown($event, node.id)"
          @keydown="onNodeKey($event, node.id)"
        >
          <span class="stage-label">{{ node.label }}</span>
          <span v-if="nodeProgress({ ...node, key: node.stage })" class="stage-progress">
            {{ nodeProgress({ ...node, key: node.stage }) }}
          </span>
          <span v-if="hasUploaderPlatforms(node)" class="uploader-platform-icons" aria-label="上传平台状态">
            <span
              v-for="platformStatus in node.platformStatuses"
              :key="platformStatus.platform"
              :class="['uploader-platform-icon', `upload-status-${platformStatus.status}`]"
              :title="platformTitle(platformStatus)"
            >
              <img
                v-if="platformIconUrls[platformStatus.platform]"
                :src="platformIconUrls[platformStatus.platform]"
                :alt="uploadPlatformText[platformStatus.platform] || platformStatus.platform"
                loading="lazy"
              />
            </span>
          </span>
          <span v-if="showTime(node)" class="stage-time">{{ formatDuration(node.elapsedSeconds) }}</span>
        </button>
      </div>
    </div>
  </div>
</template>


<style scoped>
.custom-dag-scroll {
  min-width: 0;
  overflow-x: auto;
}

.task-dag.custom-dag {
  min-width: 0;
  padding: 0;
}

.custom-dag .task-dag-grid {
  position: absolute;
  inset: 0;
  display: block;
}

.custom-dag .task-dag-grid .stage-node {
  position: absolute;
  width: 116px;
  height: 60px;
  min-height: 0;
}

.custom-dag .task-dag-links {
  display: block;
}
.dag-editor {
  background-image: linear-gradient(to right, #dce4ec 1px, transparent 1px),
    linear-gradient(to bottom, #dce4ec 1px, transparent 1px);
  background-size: 152px 88px;
}
.dag-editor .stage-node {
  touch-action: none;
  cursor: grab;
}
.dag-editor .stage-node.dragging {
  z-index: 1;
  cursor: grabbing;
}
.task-dag-links .editing-route { stroke: #195f48; stroke-width: 3; }
.route-hit { fill: none; stroke: transparent; stroke-width: 14; pointer-events: stroke; cursor: pointer; }
.route-hit:focus-visible { stroke: #195f4838; }
pattern circle { fill: #667c91; }
.task-dag-links.drawing-links { z-index: 2; }
.draw-grid { pointer-events: all; cursor: crosshair; }
.draw-preview { fill: none; stroke: #195f48; stroke-width: 3; }
.draw-visited { fill: #195f48; }
.draw-endpoint { fill: #195f48; stroke: white; stroke-width: 2; pointer-events: all; cursor: pointer; }
</style>
