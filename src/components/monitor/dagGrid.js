export const cellWidth = 152
export const cellHeight = 88
export const insetX = 18
export const insetY = 14

export function origin({ row, column }) {
  return { x: (column - 1) * cellWidth, y: (row - 1) * cellHeight }
}

export function connector(source, destination, portOffset) {
  const from = origin(source)
  const to = origin(destination)
  const dy = destination.row - source.row
  const dx = destination.column - source.column
  const x1 = from.x + cellWidth / 2
  const y1 = from.y + cellHeight / 2
  const x2 = to.x + cellWidth / 2
  const y2 = to.y + cellHeight / 2
  if (dx === 0) {
    const direction = Math.sign(dy)
    const startY = y1 + direction * (cellHeight / 2 - insetY)
    const endY = y2 - direction * (cellHeight / 2 - insetY)
    const railY = from.y + (direction > 0 ? cellHeight : 0)
    if (Math.abs(dy) === 1) {
      return `M ${x1} ${startY} V ${railY} H ${x2 + portOffset} V ${endY}`
    }
    const targetRail = to.y + (direction > 0 ? 0 : cellHeight)
    const aisleX = from.x + cellWidth
    return `M ${x1} ${startY} V ${railY} H ${aisleX} V ${targetRail} H ${x2 + portOffset} V ${endY}`
  }
  const direction = Math.sign(dx)
  const startX = x1 + direction * (cellWidth / 2 - insetX)
  const endX = x2 - direction * (cellWidth / 2 - insetX)
  const endY = y2 + portOffset
  const fromRail = from.x + (direction > 0 ? cellWidth : 0)
  const toRail = to.x + (direction > 0 ? 0 : cellWidth)
  if (fromRail === toRail) {
    return `M ${startX} ${y1} H ${fromRail} V ${endY} H ${endX}`
  }
  const aisleY = from.y + (dy >= 0 ? cellHeight : 0)
  return `M ${startX} ${y1} H ${fromRail} V ${aisleY} H ${toRail} V ${endY} H ${endX}`
}
