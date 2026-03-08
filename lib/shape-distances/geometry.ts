import type { Point, Polygon, Rect } from "./types"

export const EPSILON = 1e-9

export const toRadians = (degrees: number) => (degrees * Math.PI) / 180

export const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value))

export const distanceBetweenPoints = (a: Point, b: Point) =>
  Math.hypot(a.x - b.x, a.y - b.y)

export const distanceBetweenPointAndSegment = (
  point: Point,
  a: Point,
  b: Point,
) => {
  const abX = b.x - a.x
  const abY = b.y - a.y
  const lengthSquared = abX * abX + abY * abY

  if (lengthSquared <= EPSILON) return distanceBetweenPoints(point, a)

  const t = clamp(
    ((point.x - a.x) * abX + (point.y - a.y) * abY) / lengthSquared,
    0,
    1,
  )

  return Math.hypot(point.x - (a.x + t * abX), point.y - (a.y + t * abY))
}

export const cross = (a: Point, b: Point, c: Point) =>
  (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x)

export const isPointOnSegment = (point: Point, a: Point, b: Point) => {
  if (Math.abs(cross(a, b, point)) > EPSILON) return false

  return (
    point.x >= Math.min(a.x, b.x) - EPSILON &&
    point.x <= Math.max(a.x, b.x) + EPSILON &&
    point.y >= Math.min(a.y, b.y) - EPSILON &&
    point.y <= Math.max(a.y, b.y) + EPSILON
  )
}

export const segmentsIntersect = (
  a1: Point,
  a2: Point,
  b1: Point,
  b2: Point,
) => {
  const c1 = cross(a1, a2, b1)
  const c2 = cross(a1, a2, b2)
  const c3 = cross(b1, b2, a1)
  const c4 = cross(b1, b2, a2)

  if (
    ((c1 > EPSILON && c2 < -EPSILON) || (c1 < -EPSILON && c2 > EPSILON)) &&
    ((c3 > EPSILON && c4 < -EPSILON) || (c3 < -EPSILON && c4 > EPSILON))
  ) {
    return true
  }

  return (
    isPointOnSegment(b1, a1, a2) ||
    isPointOnSegment(b2, a1, a2) ||
    isPointOnSegment(a1, b1, b2) ||
    isPointOnSegment(a2, b1, b2)
  )
}

export const getPolygonEdges = (polygon: Polygon): Array<[Point, Point]> => {
  const edges: Array<[Point, Point]> = []

  if (polygon.points.length < 2) return edges

  for (let i = 0; i < polygon.points.length; i += 1) {
    const a = polygon.points[i]
    const b = polygon.points[(i + 1) % polygon.points.length]

    if (!a || !b) continue

    edges.push([a, b])
  }

  return edges
}

export const isPointInPolygon = (point: Point, polygon: Polygon) => {
  for (const [a, b] of getPolygonEdges(polygon)) {
    if (isPointOnSegment(point, a, b)) return true
  }

  let inside = false
  for (
    let i = 0, j = polygon.points.length - 1;
    i < polygon.points.length;
    j = i++
  ) {
    const pi = polygon.points[i]
    const pj = polygon.points[j]

    if (!pi || !pj) continue

    const intersects =
      pi.y > point.y !== pj.y > point.y &&
      point.x < ((pj.x - pi.x) * (point.y - pi.y)) / (pj.y - pi.y) + pi.x

    if (intersects) inside = !inside
  }

  return inside
}

export const rotatePoint = (point: Point, angleRadians: number) => ({
  x: point.x * Math.cos(angleRadians) - point.y * Math.sin(angleRadians),
  y: point.x * Math.sin(angleRadians) + point.y * Math.cos(angleRadians),
})

export const rectToPolygon = (rect: Rect): Polygon => {
  const halfWidth = rect.width / 2
  const halfHeight = rect.height / 2
  const angle = toRadians(rect.rotationDegrees)

  return {
    kind: "polygon",
    points: [
      { x: -halfWidth, y: -halfHeight },
      { x: halfWidth, y: -halfHeight },
      { x: halfWidth, y: halfHeight },
      { x: -halfWidth, y: halfHeight },
    ].map((localPoint) => {
      const rotated = rotatePoint(localPoint, angle)
      return { x: rect.centerX + rotated.x, y: rect.centerY + rotated.y }
    }),
  }
}
