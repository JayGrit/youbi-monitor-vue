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

export function mergedPaths(nodes, edges, positions, routing = {}) {
  const visible = new Set(nodes.map(node => node.id))
  const incoming = new Map()
  for (const { from, to } of edges) {
    if (!visible.has(from) || !visible.has(to) || from === to) continue
    if (!incoming.has(to)) incoming.set(to, new Set())
    incoming.get(to).add(from)
  }
  return [...incoming].flatMap(([to, sources]) => {
    const route = routing[to]
    if (route && (route.entry !== 'left' || route.junction || route.trunk?.length
      || [...sources].some(from => route.branches?.[from]?.length))) {
      return customPaths(to, sources, positions, route)
    }
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
        id: `${from}->${to}`, from, to,
        d: rail === target.x ? `M ${x} ${y} H ${rail}`
          : `M ${x} ${y} H ${rail} V ${arrival} H ${target.x}`,
      })
    }
    const top = Math.min(...arrivals)
    const bottom = Math.max(...arrivals)
    if (top !== bottom) routes.push({ id: `rail:${to}`, to, d: `M ${target.x} ${top} V ${bottom}` })
    routes.push({ id: `arrow:${to}`, to, arrow: true,
      d: `M ${target.x} ${targetY} H ${target.x + insetX}` })
    return routes
  })
}

export function gridPoint({ row, column }) {
  return { x: column * cellWidth, y: row * cellHeight }
}

export function routeJunction(position, route) {
  return route.junction || { row: position.row - 1, column: position.column - 1 }
}

function port(position, side) {
  const { x, y } = origin(position)
  const centerX = x + cellWidth / 2
  const centerY = y + cellHeight / 2
  if (side === 'top') return [{ x: centerX, y: y + insetY }, { x: centerX, y }, { x, y }]
  if (side === 'bottom') return [
    { x: centerX, y: y + cellHeight - insetY }, { x: centerX, y: y + cellHeight }, { x, y: y + cellHeight },
  ]
  if (side === 'right') return [
    { x: x + cellWidth - insetX, y: centerY }, { x: x + cellWidth, y: centerY }, { x: x + cellWidth, y },
  ]
  return [{ x: x + insetX, y: centerY }, { x, y: centerY }, { x, y }]
}

function orthogonal(points) {
  const [first, ...rest] = points
  let path = `M ${first.x} ${first.y}`
  let previous = first
  for (const point of rest) {
    if (point.x !== previous.x) path += ` H ${point.x}`
    if (point.y !== previous.y) path += ` V ${point.y}`
    previous = point
  }
  return path
}

function gridBridge(previous, next) {
  if (!previous || !next || previous.x === next.x || previous.y === next.y) return []
  const previousOnRow = previous.y % cellHeight === 0
  const nextOnColumn = next.x % cellWidth === 0
  if (previousOnRow && nextOnColumn) return []
  if (previous.x % cellWidth === 0 && next.y % cellHeight === 0) {
    return [{ x: previous.x, y: next.y }]
  }
  if (previousOnRow) {
    const x = Math.round((previous.x + next.x) / 2 / cellWidth) * cellWidth
    return [{ x, y: previous.y }, { x, y: next.y }]
  }
  const y = Math.round((previous.y + next.y) / 2 / cellHeight) * cellHeight
  return [{ x: previous.x, y }, { x: next.x, y }]
}

function sharesGridLine(a, b) {
  return (a.x === b.x && a.x % cellWidth === 0)
    || (a.y === b.y && a.y % cellHeight === 0)
}

function customPaths(to, sources, positions, route) {
  const join = gridPoint(routeJunction(positions[to], route))
  const branches = [...sources].map(from => {
    const bends = (route.branches?.[from] || []).map(gridPoint)
    const { x, y } = origin(positions[from])
    const anchor = bends[0] || join
    const sides = ['left', 'right', 'top', 'bottom'].map(side => port(positions[from], side))
    const selected = bends.length && sides.find(([, midpoint]) => midpoint.x === anchor.x && midpoint.y === anchor.y)
    if (selected) return { id: `${from}->${to}`, from, to,
      d: orthogonal([selected[0], ...bends, ...gridBridge(bends.at(-1), join), join]) }
    const direct = sides.find(([, midpoint]) => sharesGridLine(midpoint, anchor))
    if (direct) return { id: `${from}->${to}`, from, to,
      d: orthogonal([...direct.slice(0, 2), ...bends, join]) }
    const distance = ([, , corner]) => Math.abs(corner.x - anchor.x) + Math.abs(corner.y - anchor.y)
    sides.sort((a, b) => distance(a) - distance(b)
      || Math.abs(a[0].x - x) + Math.abs(a[0].y - y) - Math.abs(b[0].x - x) - Math.abs(b[0].y - y))
    return { id: `${from}->${to}`, from, to, d: orthogonal([...sides[0], ...gridBridge(sides[0][2], anchor), ...bends, ...gridBridge(bends.at(-1), join), join]) }
  })
  const end = port(positions[to], route.entry).reverse()
  const trunk = (route.trunk || []).map(gridPoint)
  const last = trunk.at(-1)
  const [, midpoint, card] = end
  const anchor = last || join
  const finish = sharesGridLine(anchor, midpoint) ? [midpoint, card]
    : [...gridBridge(anchor, end[0]), ...end]
  return [...branches, { id: `arrow:${to}`, to, arrow: true,
    d: orthogonal([join, ...trunk, ...finish]) }]
}

export function cardPorts(position) {
  return Object.fromEntries(['left', 'right', 'top', 'bottom'].map(side => {
    const { x, y } = port(position, side)[1]
    return [side, { row: y / cellHeight, column: x / cellWidth }]
  }))
}

export function samePoint(a, b) {
  return !!a && !!b && a.row === b.row && a.column === b.column
}

function segmentPoints(a, b) {
  const dr = Math.sign(b.row - a.row) / 2
  const dc = Math.sign(b.column - a.column) / 2
  const points = []
  for (let row = a.row + dr, column = a.column + dc; ; row += dr, column += dc) {
    points.push(`${row}:${column}`)
    if (row === b.row && column === b.column) return points
  }
}

export function canExtendRoute(points, next) {
  const last = points.at(-1)
  if (!last || samePoint(last, next)) return false
  if (last.row !== next.row && last.column !== next.column) return false
  const used = new Set([`${points[0].row}:${points[0].column}`])
  for (let index = 1; index < points.length; index += 1) {
    for (const point of segmentPoints(points[index - 1], points[index])) used.add(point)
  }
  return segmentPoints(last, next).every(point => !used.has(point))
}

export function routePreview(points) {
  return points.length ? orthogonal(points.map(gridPoint)) : ''
}
