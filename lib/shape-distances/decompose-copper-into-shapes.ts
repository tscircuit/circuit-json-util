import type {
  AnyCircuitElement,
  PcbCopperPour,
  PcbPlatedHole,
  PcbSmtPad,
  PcbTrace,
} from "circuit-json"
import { EPSILON } from "./geometry"
import { getBRepCopperPourPolygon } from "./get-brep-polygon"
import {
  getRotatedTranslatedPoints,
  getRoundedRectShapes,
} from "./get-rounded-rect-shapes"
import type { CopperShape, Point, Rect } from "./types"

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

const decomposeSmtPad = (pad: PcbSmtPad): CopperShape[] => {
  if (pad.shape === "circle") {
    return [{ kind: "circle", x: pad.x, y: pad.y, radius: pad.radius }]
  }
  if (pad.shape === "polygon") {
    return [{ kind: "polygon", points: pad.points }]
  }
  return getRoundedRectShapes({
    center: pad,
    width: pad.width,
    height: pad.height,
    radius:
      pad.shape === "pill" || pad.shape === "rotated_pill"
        ? pad.radius
        : (pad.rect_border_radius ?? pad.corner_radius ?? 0),
    rotationDegrees:
      pad.shape === "rotated_rect" || pad.shape === "rotated_pill"
        ? pad.ccw_rotation
        : 0,
  })
}

const decomposeTrace = (trace: PcbTrace): CopperShape[] => {
  const shapes: CopperShape[] = []
  for (let index = 0; index < trace.route.length - 1; index++) {
    const start = trace.route[index]
    const end = trace.route[index + 1]
    if (start?.route_type !== "wire" || end?.route_type !== "wire") continue

    const width = Math.max(0, start.width)
    const radius = width / 2
    shapes.push({ kind: "circle", x: start.x, y: start.y, radius })
    shapes.push({ kind: "circle", x: end.x, y: end.y, radius })
    if (Math.hypot(end.x - start.x, end.y - start.y) > EPSILON) {
      shapes.push(createWireSegmentRect(start, end, width))
    }
  }
  return shapes
}

const decomposePlatedHole = (hole: PcbPlatedHole): CopperShape[] => {
  if (hole.shape === "circle") {
    return [
      {
        kind: "circle",
        x: hole.x,
        y: hole.y,
        radius: hole.outer_diameter / 2,
      },
    ]
  }
  if ("rect_pad_width" in hole) {
    return getRoundedRectShapes({
      center: hole,
      width: hole.rect_pad_width,
      height: hole.rect_pad_height,
      radius: hole.rect_border_radius ?? 0,
      rotationDegrees:
        "rect_ccw_rotation" in hole ? (hole.rect_ccw_rotation ?? 0) : 0,
    })
  }
  if (hole.shape === "hole_with_polygon_pad") {
    return [
      {
        kind: "polygon",
        points: getRotatedTranslatedPoints({
          points: hole.pad_outline,
          center: hole,
          rotationDegrees: hole.ccw_rotation ?? 0,
        }),
      },
    ]
  }
  return getRoundedRectShapes({
    center: hole,
    width: hole.outer_width,
    height: hole.outer_height,
    radius: Math.min(hole.outer_width, hole.outer_height) / 2,
    rotationDegrees: hole.ccw_rotation,
  })
}

const decomposeCopperPour = (pour: PcbCopperPour): CopperShape[] => {
  if (pour.shape === "brep") return [getBRepCopperPourPolygon(pour)]
  if (pour.shape === "polygon") {
    return [{ kind: "polygon", points: pour.points }]
  }
  return [
    {
      kind: "rect",
      centerX: pour.center.x,
      centerY: pour.center.y,
      width: pour.width,
      height: pour.height,
      rotationDegrees: pour.rotation ?? 0,
    },
  ]
}

export const decomposeCopperIntoShapes = (
  element: AnyCircuitElement,
): CopperShape[] => {
  switch (element.type) {
    case "pcb_smtpad":
      return decomposeSmtPad(element)
    case "pcb_trace":
      return decomposeTrace(element)
    case "pcb_via":
      return [
        {
          kind: "circle",
          x: element.x,
          y: element.y,
          radius: element.outer_diameter / 2,
        },
      ]
    case "pcb_plated_hole":
      return decomposePlatedHole(element)
    case "pcb_copper_pour":
      return decomposeCopperPour(element)
    case "pcb_ground_plane_region":
      return [{ kind: "polygon", points: element.points }]
    default:
      return []
  }
}
