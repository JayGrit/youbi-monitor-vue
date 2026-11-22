export const cellWidth = 152
export const cellHeight = 88
export const insetX = 18
export const insetY = 14

export function origin({ row, column }) {
  return { x: (column - 1) * cellWidth, y: (row - 1) * cellHeight }
}

export function autoLayout(nodes, edges) {
  const nodeById = new Map(nodes.map(node => [node.id, node]))
  const parents = new Map(nodes.map(node => [node.id, []]))
  const children = new Map(nodes.map(node => [node.id, []]))
  for (const edge of edges) {
    if (nodeById.has(edge.from) && nodeById.has(edge.to)) {
      parents.get(edge.to).push(edge.from)
      children.get(edge.from).push(edge.to)
    }
  }

  const nodeOrder = new Map(nodes.map((node, index) => [node.id, index]))
  const roots = nodes.filter(node => !parents.get(node.id)?.length)
  const depthCache = new Map()

  function depth(id, visiting = new Set()) {
    if (depthCache.has(id)) return depthCache.get(id)
    if (visiting.has(id)) return 1
    const nextVisiting = new Set(visiting).add(id)
    const value = 1 + Math.max(0, ...(parents.get(id) || []).map(parent => depth(parent, nextVisiting)))
    depthCache.set(id, value)
    return value
  }

  // Count every fork until its branches join. A later fork needs its own rows
  // even when an earlier fork already divided the graph into lanes.
  const widthCache = new Map()
  function branchWidth(id, visiting = new Set()) {
    if (widthCache.has(id)) return widthCache.get(id)
    if (visiting.has(id)) return 1
    const nextVisiting = new Set(visiting).add(id)
    const next = children.get(id) || []
    const width = next.length
      ? next.reduce((total, child) => total + ((parents.get(child) || []).length > 1
        ? 1 : branchWidth(child, nextVisiting)), 0)
      : 1
    widthCache.set(id, width)
    return width
  }

  const downstreamLengthCache = new Map()
  function downstreamLength(id, visiting = new Set()) {
    if (downstreamLengthCache.has(id)) return downstreamLengthCache.get(id)
    if (visiting.has(id)) return 1
    const nextVisiting = new Set(visiting).add(id)
    const value = 1 + Math.max(0, ...(children.get(id) || []).map(child => downstreamLength(child, nextVisiting)))
    downstreamLengthCache.set(id, value)
    return value
  }

  function branchPriority(leftId, rightId) {
    const left = nodeById.get(leftId)
    const right = nodeById.get(rightId)
    return branchWidth(rightId) - branchWidth(leftId)
      || downstreamLength(rightId) - downstreamLength(leftId)
      || rootLanePriority(left) - rootLanePriority(right)
      || nodeOrder.get(leftId) - nodeOrder.get(rightId)
  }

  const orderedRoots = [...roots].sort((left, right) => branchPriority(left.id, right.id))
  const rootWidth = orderedRoots.reduce((total, node) => total + branchWidth(node.id), 0)
  const rowUnits = Math.max(1, rootWidth, ...nodes.map(node => branchWidth(node.id)))
  const intervals = new Map()
  const edgeIntervals = new Map()
  let nextRootRow = 1
  orderedRoots.forEach((node, index) => {
    const span = branchWidth(node.id) + (index === 0 ? rowUnits - rootWidth : 0)
    intervals.set(node.id, { start: nextRootRow, end: nextRootRow + span - 1 })
    nextRootRow += span
  })

  const orderedNodes = [...nodes].sort((left, right) =>
    depth(left.id) - depth(right.id) || nodeOrder.get(left.id) - nodeOrder.get(right.id))
  for (const node of orderedNodes) {
    const nodeParents = parents.get(node.id) || []
    if (nodeParents.length) {
      const ranges = nodeParents.map(parent => edgeIntervals.get(`${parent}->${node.id}`))
        .filter(Boolean)
      if (ranges.length) {
        intervals.set(node.id, {
          start: Math.min(...ranges.map(range => range.start)),
          end: Math.max(...ranges.map(range => range.end)),
        })
      }
    }
    const range = intervals.get(node.id)
    if (!range) continue
    const next = [...(children.get(node.id) || [])].sort(branchPriority)
    const weights = next.map(child => (parents.get(child) || []).length > 1
      ? 1 : branchWidth(child))
    const totalWeight = weights.reduce((total, weight) => total + weight, 0)
    const available = range.end - range.start + 1
    let usedWeight = 0
    next.forEach((child, index) => {
      const start = range.start + Math.floor(usedWeight * available / totalWeight)
      usedWeight += weights[index]
      const end = range.start + Math.floor(usedWeight * available / totalWeight) - 1
      edgeIntervals.set(`${node.id}->${child}`, { start, end: Math.max(start, end) })
    })
  }

  const desiredLayouts = new Map(nodes.map(node => {
    const range = intervals.get(node.id) || { start: 1, end: rowUnits }
    return [node.id, {
      column: depth(node.id),
      row: (range.start + range.end) / 2,
    }]
  }))

  // A branch can share row intervals with another branch after a join. Give
  // every node in the same column its own grid row before drawing connectors.
  const nodeLayouts = new Map()
  const columns = new Map()
  for (const node of nodes) {
    const desired = desiredLayouts.get(node.id)
    if (!columns.has(desired.column)) columns.set(desired.column, [])
    columns.get(desired.column).push(node)
  }
  for (const columnNodes of columns.values()) {
    columnNodes.sort((left, right) =>
      desiredLayouts.get(left.id).row - desiredLayouts.get(right.id).row
      || nodeOrder.get(left.id) - nodeOrder.get(right.id))
    let previousRow = 0
    for (const node of columnNodes) {
      const desired = desiredLayouts.get(node.id)
      const rowStart = Math.max(Math.round(desired.row), previousRow + 1)
      nodeLayouts.set(node.id, { column: desired.column, rowStart, rowSpan: 1 })
      previousRow = rowStart
    }
  }

  // The interval allocator leaves room for branches that later converge.
  // Remove rows that contain no node in any column before sizing the grid.
  const usedRows = [...new Set([...nodeLayouts.values()].map(node => node.rowStart))]
    .sort((left, right) => left - right)
  const compactRow = new Map(usedRows.map((row, index) => [row, index + 1]))
  for (const node of nodeLayouts.values()) node.rowStart = compactRow.get(node.rowStart)
  const occupiedRows = usedRows.length

  return {
    columns: Math.max(1, ...[...nodeLayouts.values()].map(node => node.column)),
    maxRows: occupiedRows,
    nodeLayouts,
    rowUnits: occupiedRows,
  }
}

function rootLanePriority(node) {
  if (node.stage === 'publisher' && node.subStage === 'image_generation') return 0
  if (node.stage === 'publisher' && node.subStage === 'segment_plan') return 1
  if (node.stage === 'combiner' && node.subStage === 'asmr') return 20
  if (node.stage === 'combiner' && node.subStage === 'audio_merge') return 21
  if (node.stage === 'combiner' && node.subStage === 'video_render') return 22
  return Number(node.order) || Number.MAX_SAFE_INTEGER
}

export function autoPositions(nodes, edges) {
  return Object.fromEntries([...autoLayout(nodes, edges).nodeLayouts]
    .map(([id, { rowStart, column }]) => [id, { row: rowStart, column }]))
}

export function mergedPaths(nodes, edges, positions) {
  const visible = new Set(nodes.map(node => node.id))
  const incoming = new Map()
  for (const { from, to } of edges) {
    if (!visible.has(from) || !visible.has(to) || from === to) continue
    if (!incoming.has(to)) incoming.set(to, new Set())
    incoming.get(to).add(from)
  }
  return [...incoming].flatMap(([to, sources]) => {
    const target = origin(positions[to])
    const targetY = target.y + cellHeight / 2
    const routes = []
    const arrivals = [targetY]
    for (const from of sources) {
      const source = origin(positions[from])
      const right = source.x < target.x
      const rail = source.x + (right ? cellWidth : 0)
      const x = rail + (right ? -insetX : insetX)
      const y = source.y + cellHeight / 2
      const arrival = rail === target.x ? y : source.y + cellHeight
      arrivals.push(arrival)
      routes.push({
        id: `${from}->${to}`,
        d: rail === target.x ? `M ${x} ${y} H ${rail}`
          : `M ${x} ${y} H ${rail} V ${arrival} H ${target.x}`,
      })
    }
    const top = Math.min(...arrivals)
    const bottom = Math.max(...arrivals)
    if (top !== bottom) routes.push({ id: `rail:${to}`, d: `M ${target.x} ${top} V ${bottom}` })
    routes.push({ id: `arrow:${to}`, arrow: true,
      d: `M ${target.x} ${targetY} H ${target.x + insetX}` })
    return routes
  })
}
