import type { AnyCircuitElement, PcbNotePath } from "circuit-json"
import type { PcbBounds } from "./get-bounds-of-pcb-elements"

type FabricationNotePath = Extract<
  AnyCircuitElement,
  { type: "pcb_fabrication_note_path" }
> & { has_stroke?: boolean; is_filled?: boolean }

type Point = { x: number; y: number }

export const getPcbNotePathBounds = (
  element: PcbNotePath | FabricationNotePath,
): PcbBounds | null => {
  if (
    element.type === "pcb_fabrication_note_path" &&
    element.has_stroke === false
  )
    return null
  const radius = element.stroke_width / 2
  if (!Number.isFinite(radius) || radius <= 0 || !Array.isArray(element.route))
    return null
  if (
    element.route.some(
      (point) =>
        !point || !Number.isFinite(point.x) || !Number.isFinite(point.y),
    )
  )
    return null

  let bounds: PcbBounds | null = null
  const include = (point: Point) => {
    if (!bounds) {
      bounds = { minX: point.x, maxX: point.x, minY: point.y, maxY: point.y }
      return
    }
    bounds.minX = Math.min(bounds.minX, point.x)
    bounds.maxX = Math.max(bounds.maxX, point.x)
    bounds.minY = Math.min(bounds.minY, point.y)
    bounds.maxY = Math.max(bounds.maxY, point.y)
  }
  const includeJoin = (vertex: Point, incoming: Point, outgoing: Point) => {
    const cross = incoming.x * outgoing.y - incoming.y * outgoing.x
    const denominator = 1 + incoming.x * outgoing.x + incoming.y * outgoing.y
    if (cross === 0 || denominator <= 0) return
    const offset = {
      x: (radius * (incoming.x + outgoing.x)) / denominator,
      y: (radius * (incoming.y + outgoing.y)) / denominator,
    }
    if (Math.hypot(offset.x, offset.y) <= 4 * radius) {
      const side = -Math.sign(cross)
      include({ x: vertex.x + side * offset.x, y: vertex.y + side * offset.y })
    }
  }
  const firstPoint = element.route[0]
  const lastPoint = element.route[element.route.length - 1]
  if (!firstPoint || !lastPoint) return null
  const repeatsFirstPoint =
    firstPoint.x === lastPoint.x && firstPoint.y === lastPoint.y
  const isClosed =
    element.type === "pcb_fabrication_note_path" &&
    Boolean(element.is_filled || repeatsFirstPoint)
  const segmentCount =
    element.route.length - 1 + (isClosed && !repeatsFirstPoint ? 1 : 0)
  let firstNormal: Point | null = null
  let previousNormal: Point | null = null
  for (let index = 1; index <= segmentCount; index++) {
    const start = element.route[index - 1]!
    const end = element.route[index] ?? firstPoint
    const dx = end.x - start.x
    const dy = end.y - start.y
    const length = Math.hypot(dx, dy)
    if (length === 0) continue
    if (!Number.isFinite(length)) return null
    const normal = { x: -dy / length, y: dx / length }
    for (const point of [start, end])
      for (const sign of [-1, 1]) {
        include({
          x: point.x + sign * radius * normal.x,
          y: point.y + sign * radius * normal.y,
        })
      }
    if (previousNormal) includeJoin(start, previousNormal, normal)
    firstNormal ??= normal
    previousNormal = normal
  }
  if (isClosed && firstNormal && previousNormal)
    includeJoin(firstPoint, previousNormal, firstNormal)
  return bounds && Object.values(bounds).every(Number.isFinite) ? bounds : null
}
