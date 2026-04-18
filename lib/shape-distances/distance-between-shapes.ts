import {
  distanceBetweenPointAndSegment,
  getPolygonEdges,
  isPointInPolygon,
  rectToPolygon,
  segmentsIntersect,
} from "./geometry"
import type { Circle, CopperShape, Polygon, Rect } from "./types"

export const distanceBetweenCircleAndCircle = (a: Circle, b: Circle) =>
  Math.max(0, Math.hypot(a.x - b.x, a.y - b.y) - a.radius - b.radius)

export const distanceBetweenPolygonAndPolygon = (a: Polygon, b: Polygon) => {
  if (a.points.length < 3 || b.points.length < 3) {
    return Number.POSITIVE_INFINITY
  }

  for (const [a1, a2] of getPolygonEdges(a)) {
    for (const [b1, b2] of getPolygonEdges(b)) {
      if (segmentsIntersect(a1, a2, b1, b2)) {
        return 0
      }
    }
  }

  const aPoint = a.points[0]
  const bPoint = b.points[0]
  if (
    (aPoint && isPointInPolygon(aPoint, b)) ||
    (bPoint && isPointInPolygon(bPoint, a))
  ) {
    return 0
  }

  let minDistance = Number.POSITIVE_INFINITY

  for (const [a1, a2] of getPolygonEdges(a)) {
    for (const [b1, b2] of getPolygonEdges(b)) {
      minDistance = Math.min(
        minDistance,
        distanceBetweenPointAndSegment(a1, b1, b2),
        distanceBetweenPointAndSegment(a2, b1, b2),
        distanceBetweenPointAndSegment(b1, a1, a2),
        distanceBetweenPointAndSegment(b2, a1, a2),
      )
    }
  }

  return minDistance
}

export const distanceBetweenCircleAndPolygon = (
  circle: Circle,
  polygon: Polygon,
) => {
  if (polygon.points.length < 3) {
    return Number.POSITIVE_INFINITY
  }

  if (isPointInPolygon({ x: circle.x, y: circle.y }, polygon)) {
    return 0
  }

  let minDistanceToEdge = Number.POSITIVE_INFINITY

  for (const [start, end] of getPolygonEdges(polygon)) {
    minDistanceToEdge = Math.min(
      minDistanceToEdge,
      distanceBetweenPointAndSegment({ x: circle.x, y: circle.y }, start, end),
    )
  }

  return Math.max(0, minDistanceToEdge - circle.radius)
}

export const distanceBetweenShapes = (
  a: CopperShape,
  b: CopperShape,
): number => {
  if (a.kind === "circle" && b.kind === "circle") {
    return distanceBetweenCircleAndCircle(a, b)
  }

  if (a.kind === "rect" && b.kind === "rect") {
    return distanceBetweenPolygonAndPolygon(rectToPolygon(a), rectToPolygon(b))
  }

  if (a.kind === "circle" && b.kind === "rect") {
    return distanceBetweenCircleAndPolygon(a, rectToPolygon(b))
  }

  if (a.kind === "rect" && b.kind === "circle") {
    return distanceBetweenCircleAndPolygon(b, rectToPolygon(a))
  }

  if (a.kind === "circle" && b.kind === "polygon") {
    return distanceBetweenCircleAndPolygon(a, b)
  }

  if (a.kind === "polygon" && b.kind === "circle") {
    return distanceBetweenCircleAndPolygon(b, a)
  }

  if (a.kind === "rect" && b.kind === "polygon") {
    return distanceBetweenPolygonAndPolygon(rectToPolygon(a), b)
  }

  if (a.kind === "polygon" && b.kind === "rect") {
    return distanceBetweenPolygonAndPolygon(a, rectToPolygon(b))
  }

  if (a.kind === "polygon" && b.kind === "polygon") {
    return distanceBetweenPolygonAndPolygon(a, b)
  }

  return Number.POSITIVE_INFINITY
}
