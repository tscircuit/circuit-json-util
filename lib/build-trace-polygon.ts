import type { PcbTraceRoutePointWire } from "circuit-json"

// Builds a filled polygon representing a variable-width trace segment.
export function buildTracePolygon(
  points: PcbTraceRoutePointWire[],
): Array<{ x: number; y: number }> {
  const left: Array<{ x: number; y: number }> = []
  const right: Array<{ x: number; y: number }> = []

  for (let i = 0; i < points.length; i++) {
    const point = points[i]
    if (!point) continue
    const dir = getTraceDirectionAt(points, i)
    const normal = normalizeTraceDirection(-dir.y, dir.x)
    const offset = point.width / 2

    left.push({
      x: point.x + normal.x * offset,
      y: point.y + normal.y * offset,
    })
    right.push({
      x: point.x - normal.x * offset,
      y: point.y - normal.y * offset,
    })
  }

  return left.concat(right.reverse())
}

// Returns a unit direction for a trace at a point index.
function getTraceDirectionAt(
  points: PcbTraceRoutePointWire[],
  index: number,
): {
  x: number
  y: number
} {
  const count = points.length
  if (count < 2) return { x: 1, y: 0 }

  if (index <= 0) {
    const next = points[1]
    const current = points[0]
    if (!next || !current) return { x: 1, y: 0 }
    const dir = normalizeTraceDirection(next.x - current.x, next.y - current.y)
    return dir.x === 0 && dir.y === 0 ? { x: 1, y: 0 } : dir
  }

  if (index >= count - 1) {
    const prev = points[count - 2]
    const current = points[count - 1]
    if (!prev || !current) return { x: 1, y: 0 }
    const dir = normalizeTraceDirection(current.x - prev.x, current.y - prev.y)
    return dir.x === 0 && dir.y === 0 ? { x: 1, y: 0 } : dir
  }

  const prev = points[index - 1]
  const current = points[index]
  const next = points[index + 1]
  if (!prev || !current || !next) return { x: 1, y: 0 }

  const prevDir = normalizeTraceDirection(
    current.x - prev.x,
    current.y - prev.y,
  )
  const nextDir = normalizeTraceDirection(
    next.x - current.x,
    next.y - current.y,
  )
  const sum = normalizeTraceDirection(
    prevDir.x + nextDir.x,
    prevDir.y + nextDir.y,
  )

  if (sum.x === 0 && sum.y === 0) {
    if (prevDir.x !== 0 || prevDir.y !== 0) return prevDir
    if (nextDir.x !== 0 || nextDir.y !== 0) return nextDir
    return { x: 1, y: 0 }
  }

  return sum
}

// Returns a unit-length trace direction; used to keep offsets/join math consistent.
function normalizeTraceDirection(
  x: number,
  y: number,
): { x: number; y: number } {
  const length = Math.hypot(x, y)
  if (length <= Number.EPSILON) return { x: 0, y: 0 }
  return { x: x / length, y: y / length }
}
