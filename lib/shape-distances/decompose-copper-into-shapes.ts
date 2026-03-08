import type { AnyCircuitElement } from "circuit-json"
import { EPSILON } from "./geometry"
import type { CopperShape, Point, Rect } from "./types"

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value)

const createWireSegmentRect = (
  start: Point,
  end: Point,
  width: number,
): Rect => ({
  kind: "rect",
  centerX: (start.x + end.x) / 2,
  centerY: (start.y + end.y) / 2,
  width: Math.hypot(end.x - start.x, end.y - start.y),
  height: width,
  rotationDegrees:
    (Math.atan2(end.y - start.y, end.x - start.x) * 180) / Math.PI,
})

export const decomposeCopperIntoShapes = (
  element: AnyCircuitElement,
): CopperShape[] => {
  const elm: any = element
  const shapes: CopperShape[] = []

  if (elm.type === "pcb_smtpad") {
    if (elm.shape === "circle" && isFiniteNumber(elm.radius)) {
      shapes.push({ kind: "circle", x: elm.x, y: elm.y, radius: elm.radius })
    }

    if (
      elm.shape === "rect" &&
      isFiniteNumber(elm.width) &&
      isFiniteNumber(elm.height)
    ) {
      shapes.push({
        kind: "rect",
        centerX: elm.x,
        centerY: elm.y,
        width: elm.width,
        height: elm.height,
        rotationDegrees: isFiniteNumber(elm.ccw_rotation)
          ? elm.ccw_rotation
          : 0,
      })
    }

    if (elm.shape === "polygon" && Array.isArray(elm.points)) {
      const points = elm.points.filter(
        (point: any): point is Point =>
          isFiniteNumber(point?.x) && isFiniteNumber(point?.y),
      )

      if (points.length >= 3) {
        shapes.push({ kind: "polygon", points })
      }
    }

    return shapes
  }

  if (elm.type === "pcb_trace" && Array.isArray(elm.route)) {
    for (let i = 0; i < elm.route.length - 1; i += 1) {
      const start = elm.route[i]
      const end = elm.route[i + 1]

      if (
        !start ||
        !end ||
        start.route_type !== "wire" ||
        end.route_type !== "wire" ||
        !isFiniteNumber(start.x) ||
        !isFiniteNumber(start.y) ||
        !isFiniteNumber(end.x) ||
        !isFiniteNumber(end.y)
      ) {
        continue
      }

      const width = isFiniteNumber(start.width) ? Math.max(0, start.width) : 0
      const radius = width / 2

      shapes.push({ kind: "circle", x: start.x, y: start.y, radius })
      shapes.push({ kind: "circle", x: end.x, y: end.y, radius })

      if (Math.hypot(end.x - start.x, end.y - start.y) > EPSILON) {
        shapes.push(createWireSegmentRect(start, end, width))
      }
    }

    return shapes
  }

  if (elm.type === "pcb_via" && isFiniteNumber(elm.outer_diameter)) {
    shapes.push({
      kind: "circle",
      x: elm.x,
      y: elm.y,
      radius: elm.outer_diameter / 2,
    })

    return shapes
  }

  if (elm.type === "pcb_plated_hole") {
    if (isFiniteNumber(elm.outer_diameter)) {
      shapes.push({
        kind: "circle",
        x: elm.x,
        y: elm.y,
        radius: elm.outer_diameter / 2,
      })
    }

    if (
      isFiniteNumber(elm.rect_pad_width) &&
      isFiniteNumber(elm.rect_pad_height)
    ) {
      shapes.push({
        kind: "rect",
        centerX: elm.x,
        centerY: elm.y,
        width: elm.rect_pad_width,
        height: elm.rect_pad_height,
        rotationDegrees: isFiniteNumber(elm.rect_ccw_rotation)
          ? elm.rect_ccw_rotation
          : 0,
      })
    }

    if (isFiniteNumber(elm.outer_width) && isFiniteNumber(elm.outer_height)) {
      shapes.push({
        kind: "rect",
        centerX: elm.x,
        centerY: elm.y,
        width: elm.outer_width,
        height: elm.outer_height,
        rotationDegrees: 0,
      })
    }

    return shapes
  }

  return shapes
}
