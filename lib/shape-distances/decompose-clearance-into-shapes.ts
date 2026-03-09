import type { AnyCircuitElement } from "circuit-json"
import { decomposeCopperIntoShapes } from "./decompose-copper-into-shapes"
import type { CopperShape, Point } from "./types"

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value)

const getCenter = (elm: any): { x: number; y: number } | null => {
  if (isFiniteNumber(elm?.x) && isFiniteNumber(elm?.y)) {
    return { x: elm.x, y: elm.y }
  }

  if (isFiniteNumber(elm?.center?.x) && isFiniteNumber(elm?.center?.y)) {
    return { x: elm.center.x, y: elm.center.y }
  }

  return null
}

const addCenterBasedShapes = (elm: any, shapes: CopperShape[]) => {
  const center = getCenter(elm)
  if (!center) return

  if (elm.shape === "circle") {
    if (isFiniteNumber(elm.radius)) {
      shapes.push({
        kind: "circle",
        x: center.x,
        y: center.y,
        radius: elm.radius,
      })
      return
    }

    if (isFiniteNumber(elm.diameter)) {
      shapes.push({
        kind: "circle",
        x: center.x,
        y: center.y,
        radius: elm.diameter / 2,
      })
      return
    }
  }

  if (
    elm.shape === "rect" &&
    isFiniteNumber(elm.width) &&
    isFiniteNumber(elm.height)
  ) {
    shapes.push({
      kind: "rect",
      centerX: center.x,
      centerY: center.y,
      width: elm.width,
      height: elm.height,
      rotationDegrees: isFiniteNumber(elm.ccw_rotation) ? elm.ccw_rotation : 0,
    })
    return
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
}

export const decomposeClearanceIntoShapes = (
  element: AnyCircuitElement,
): CopperShape[] => {
  const elm: any = element
  const shapes: CopperShape[] = [...decomposeCopperIntoShapes(element)]

  if (elm.type === "pcb_hole" && elm.hole_shape === "circle") {
    if (
      isFiniteNumber(elm.hole_diameter) &&
      isFiniteNumber(elm.x) &&
      isFiniteNumber(elm.y)
    ) {
      shapes.push({
        kind: "circle",
        x: elm.x,
        y: elm.y,
        radius: elm.hole_diameter / 2,
      })
    }
    return shapes
  }

  if (elm.type === "pcb_plated_hole") {
    if (
      isFiniteNumber(elm.hole_diameter) &&
      isFiniteNumber(elm.x) &&
      isFiniteNumber(elm.y)
    ) {
      const holeOffsetX = isFiniteNumber(elm.hole_offset_x)
        ? elm.hole_offset_x
        : 0
      const holeOffsetY = isFiniteNumber(elm.hole_offset_y)
        ? elm.hole_offset_y
        : 0
      shapes.push({
        kind: "circle",
        x: elm.x + holeOffsetX,
        y: elm.y + holeOffsetY,
        radius: elm.hole_diameter / 2,
      })
    }
    return shapes
  }

  if (
    elm.type === "pcb_keepout" ||
    elm.type === "pcb_cutout" ||
    elm.type === "pcb_board"
  ) {
    addCenterBasedShapes(elm, shapes)
    return shapes
  }

  return shapes
}
