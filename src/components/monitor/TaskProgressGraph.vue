<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { createPlatformIconUrls, uploadPlatformText } from '../../domain/constants'
import { formatDuration } from '../../utils/format'

const props = defineProps({
  progress: { type: Object, default: null },
  nodeProgress: { type: Function, required: true },
  nodeTitle: { type: Function, required: true },
  openTaskFlow: { type: Function, required: true },
  task: { type: Object, required: true },
})

const container = ref(null)
const nodeElements = new Map()
const paths = ref([])
const markerId = `dag-arrow-${Math.random().toString(36).slice(2)}`
const platformIconUrls = createPlatformIconUrls(import.meta.env.BASE_URL)
let resizeObserver = null

const nodes = computed(() => Array.isArray(props.progress?.routeNodes) ? props.progress.routeNodes : [])
const edges = computed(() => Array.isArray(props.progress?.routeEdges) ? props.progress.routeEdges : [])
const layout = computed(() => {
  const nodeById = new Map(nodes.value.map(node => [node.id, node]))
  const parents = new Map(nodes.value.map(node => [node.id, []]))
  for (const edge of edges.value) {
    if (nodeById.has(edge.from) && nodeById.has(edge.to)) parents.get(edge.to).push(edge.from)
  }

  const roots = nodes.value
    .filter(node => !parents.get(node.id)?.length)
    .sort((left, right) => rootLanePriority(left) - rootLanePriority(right))
  const rootLane = new Map(roots.map((node, index) => [node.id, index + 1]))
  const depthCache = new Map()
  const originCache = new Map()

  function depth(id, visiting = new Set()) {
    if (depthCache.has(id)) return depthCache.get(id)
    if (visiting.has(id)) return 1
    const nextVisiting = new Set(visiting).add(id)
    const value = 1 + Math.max(0, ...(parents.get(id) || []).map(parent => depth(parent, nextVisiting)))
    depthCache.set(id, value)
    return value
  }

  function origins(id, visiting = new Set()) {
    if (originCache.has(id)) return originCache.get(id)
    if (visiting.has(id)) return new Set()
    const nodeParents = parents.get(id) || []
    const value = nodeParents.length
      ? new Set(nodeParents.flatMap(parent => [...origins(parent, new Set(visiting).add(id))]))
      : new Set([id])
    originCache.set(id, value)
    return value
  }

  const rowUnits = Math.max(1, roots.length)
  const nodeLayouts = new Map(nodes.value.map(node => {
    const lanes = [...origins(node.id)].map(root => rootLane.get(root)).filter(Boolean)
    const isShared = lanes.length !== 1
    return [node.id, {
      column: depth(node.id),
      rowStart: isShared ? 1 : lanes[0],
      rowSpan: isShared ? rowUnits : 1,
    }]
  }))

  return {
    columns: Math.max(1, ...[...nodeLayouts.values()].map(node => node.column)),
    maxRows: rowUnits,
    nodeLayouts,
    rowUnits,
  }
})

function rootLanePriority(node) {
  if (node.stage === 'publisher' && node.subStage === 'image_generation') return 0
  if (node.stage === 'publisher' && node.subStage === 'segment_plan') return 1
  return Number(node.order) || Number.MAX_SAFE_INTEGER
}

function setNodeElement(id, element) {
  if (element) nodeElements.set(id, element)
  else nodeElements.delete(id)
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
  return !['translator', 'speaker', 'uploader'].includes(node.stage)
    && Number(node.elapsedSeconds) > 0
}

function updatePaths() {
  const root = container.value
  if (!root) return
  const rootRect = root.getBoundingClientRect()
  const incoming = new Map()
  for (const edge of edges.value) {
    if (!incoming.has(edge.to)) incoming.set(edge.to, [])
    incoming.get(edge.to).push(edge)
  }

  paths.value = [...incoming.entries()].flatMap(([targetId, targetEdges]) => {
    const to = nodeElements.get(targetId)
    if (!to) return []
    const toRect = to.getBoundingClientRect()
    const x2 = toRect.left - rootRect.left
    const y2 = toRect.top + toRect.height / 2 - rootRect.top
    const sources = targetEdges.flatMap(edge => {
      const from = nodeElements.get(edge.from)
      if (!from) return []
      const rect = from.getBoundingClientRect()
      return [{
        edge,
        x: rect.right - rootRect.left,
        y: rect.top + rect.height / 2 - rootRect.top,
      }]
    })
    if (!sources.length) return []

    if (sources.length === 1) {
      const source = sources[0]
      const middle = source.x + Math.max(12, (x2 - source.x) / 2)
      return [{
        id: `${source.edge.from}->${targetId}`,
        d: `M ${source.x} ${source.y} H ${middle} V ${y2} H ${x2}`,
        arrow: true,
      }]
    }

    const nearestSourceX = Math.max(...sources.map(source => source.x))
    const trunkLength = Math.max(12, Math.min(36, (x2 - nearestSourceX) / 2))
    const junctionX = x2 - trunkLength
    const branches = sources.map(source => ({
      id: `${source.edge.from}->${targetId}:branch`,
      d: `M ${source.x} ${source.y} H ${junctionX} V ${y2}`,
      arrow: false,
    }))
    return [
      ...branches,
      {
        id: `${targetId}:incoming-trunk`,
        d: `M ${junctionX} ${y2} H ${x2}`,
        arrow: true,
      },
    ]
  })
}

async function schedulePathUpdate() {
  await nextTick()
  updatePaths()
}

watch([nodes, edges], schedulePathUpdate, { deep: true })

onMounted(() => {
  resizeObserver = new ResizeObserver(updatePaths)
  if (container.value) resizeObserver.observe(container.value)
  schedulePathUpdate()
})

onBeforeUnmount(() => resizeObserver?.disconnect())
</script>

<template>
  <div
    ref="container"
    class="task-dag"
    :style="{
      '--dag-columns': layout.columns,
      '--dag-row-units': layout.rowUnits,
      '--dag-min-height': `${layout.maxRows * 80}px`,
    }"
    aria-label="任务 DAG 阶段图"
  >
    <svg class="task-dag-links" aria-hidden="true">
      <defs>
        <marker :id="markerId" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
          <path d="M0,0 L7,3.5 L0,7 Z" />
        </marker>
      </defs>
      <path
        v-for="path in paths"
        :key="path.id"
        :d="path.d"
        :marker-end="path.arrow ? `url(#${markerId})` : null"
      />
    </svg>

    <div class="task-dag-grid">
      <button
        v-for="node in nodes"
        :key="node.id"
        :ref="element => setNodeElement(node.id, element)"
        type="button"
        :class="['stage-node', 'stage-node-button', statusClass(node), { 'with-uploader-platforms': hasUploaderPlatforms(node) }]"
        :style="{
          '--dag-column': layout.nodeLayouts.get(node.id)?.column || 1,
          '--dag-row-start': layout.nodeLayouts.get(node.id)?.rowStart || 1,
          '--dag-row-span': layout.nodeLayouts.get(node.id)?.rowSpan || 1,
        }"
        :title="`${nodeTitle({ ...node, key: node.stage })}\n点击查看任务流详情`"
        @click="openTaskFlow(task, node.stage)"
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
</template>
