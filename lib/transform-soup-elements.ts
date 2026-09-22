import type { AnyCircuitElement, InsertionDirection } from "circuit-json"
import {
  type Matrix,
  applyToPoint,
  compose,
  decomposeTSR,
  rotate,
} from "transformation-matrix"
import {
  directionToVec,
  rotateDirection,
  vecToDirection,
} from "./direction-to-vec"

const getQuarterTurns = (angleRadians: number) =>
  Math.round(angleRadians / (Math.PI / 2))

const insertionDirectionToVec = (
  direction: Exclude<InsertionDirection, "from_above" | "from_below">,
) => {
  switch (direction) {
    case "from_left":
      return { x: -1, y: 0 }
    case "from_right":
      return { x: 1, y: 0 }
    case "from_top":
      return { x: 0, y: 1 }
    case "from_bottom":
      return { x: 0, y: -1 }
  }
}

const vecToInsertionDirection = ({
  x,
  y,
}: {
  x: number
  y: number
}): Exclude<InsertionDirection, "from_above" | "from_below"> => {
  if (x > 0) return "from_right"
  if (x < 0) return "from_left"
  if (y > 0) return "from_top"
  return "from_bottom"
}

export const transformInsertionDirection = (
  direction: InsertionDirection | undefined,
  opts: { rotationDegrees: number; isFlipped: boolean },
) => {
  if (!direction) return direction

  // Rotating within the board plane leaves a Z-axis insertion pointing along
  // Z, but moving the part to the other layer reverses which side of the board
  // the mating part approaches from.
  if (direction === "from_above" || direction === "from_below") {
    if (!opts.isFlipped) return direction
    return direction === "from_above" ? "from_below" : "from_above"
  }

  let { x, y } = insertionDirectionToVec(direction)
  let quarterTurns = Math.round(opts.rotationDegrees / 90)

  while (quarterTurns > 0) {
    ;[x, y] = [-y, x]
    quarterTurns--
  }

  while (quarterTurns < 0) {
    ;[x, y] = [y, -x]
    quarterTurns++
  }

  if (opts.isFlipped) {
    y = -y
  }

  return vecToInsertionDirection({ x, y })
}

export const transformSchematicElement = (
  elm: AnyCircuitElement,
  matrix: Matrix,
) => {
  if (elm.type === "schematic_component") {
    // TODO handle rotation
    elm.center = applyToPoint(matrix, elm.center)
  } else if (elm.type === "schematic_port") {
    elm.center = applyToPoint(matrix, elm.center)

    if (elm.facing_direction) {
      elm.facing_direction = rotateDirection(
        elm.facing_direction,
        -(Math.atan2(matrix.b, matrix.a) / Math.PI) * 2,
      )
    }
  } else if (elm.type === "schematic_text") {
    elm.position = applyToPoint(matrix, elm.position)
    // } else if (elm.type === "schematic_group") {
    //   elm.center = applyToPoint(matrix, elm.center)
  } else if (elm.type === "schematic_trace") {
    const anyElm = elm as any
    anyElm.route = (anyElm.route ?? []).map((rp: any) => {
      const tp = applyToPoint(matrix, rp) as { x: number; y: number }
      rp.x = tp.x
      rp.y = tp.y
      return rp
    })
    if (Array.isArray(anyElm.junctions)) {
      anyElm.junctions = anyElm.junctions.map((j: any) => {
        const tp = applyToPoint(matrix, j) as { x: number; y: number }
        j.x = tp.x
        j.y = tp.y
        return j
      })
    }
    if (Array.isArray(anyElm.edges)) {
      anyElm.edges = anyElm.edges.map((e: any) => {
        e.from = applyToPoint(matrix, e.from)
        e.to = applyToPoint(matrix, e.to)
        return e
      })
    }
  } else if (elm.type === "schematic_box") {
    const { x, y } = applyToPoint(matrix, { x: elm.x, y: elm.y })
    elm.x = x
    elm.y = y
  } else if (elm.type === "schematic_line") {
    const { x: x1, y: y1 } = applyToPoint(matrix, { x: elm.x1, y: elm.y1 })
    const { x: x2, y: y2 } = applyToPoint(matrix, { x: elm.x2, y: elm.y2 })
    elm.x1 = x1
    elm.y1 = y1
    elm.x2 = x2
    elm.y2 = y2
  }
  return elm
}

export const transformSchematicElements = (
  elms: AnyCircuitElement[],
  matrix: Matrix,
) => {
  return elms.map((elm) => transformSchematicElement(elm, matrix))
}

const normalizeDegrees360 = (degrees: number) => ((degrees % 360) + 360) % 360

// Element-local rotation fields ("ccw_rotation", "hole_ccw_rotation", ...)
// hold the element's own counterclockwise angle relative to its parent frame.
// Applying a parent rotation adds the matrix angle; a mirrored transform
// (scale.sy < 0) reverses the handedness, so the field becomes angle - value.
const rotateCcwField = (
  value: number,
  rotationDegrees: number,
  isFlipped: boolean,
) =>
  normalizeDegrees360(
    isFlipped ? rotationDegrees - value : value + rotationDegrees,
  )

// Directions and element-local coordinates (e.g. a plated hole's offset from
// its pad, or a polygon pad outline expressed relative to x/y) transform by
// the linear part of the matrix only — translation must not be applied.
const applyLinearPart = (
  matrix: Matrix,
  direction: { x: number; y: number },
) => ({
  x: matrix.a * direction.x + matrix.c * direction.y,
  y: matrix.b * direction.x + matrix.d * direction.y,
})

type TransformPCBElementContext = {
  // pcb_component_id -> the component's rotation before this transform, used
  // for rotation fields that are absolute board angles (the schema falls back
  // to the owning component's rotation when the field is omitted)
  componentRotationById?: Record<string, number | undefined>
}

export const transformPCBElement = (
  elm: AnyCircuitElement,
  matrix: Matrix,
  ctx?: TransformPCBElementContext,
) => {
  const tsr = decomposeTSR(matrix)
  const flipPadWidthHeight =
    Math.abs(getQuarterTurns(tsr.rotation.angle)) % 2 === 1
  const rotationDegrees = (tsr.rotation.angle / Math.PI) * 180
  const isFlipped = tsr.scale.sy < 0
  const hasRotation = normalizeDegrees360(rotationDegrees) !== 0 || isFlipped
  if (
    elm.type === "pcb_plated_hole" ||
    elm.type === "pcb_hole" ||
    elm.type === "pcb_via" ||
    elm.type === "pcb_smtpad" ||
    elm.type === "pcb_solder_paste" ||
    elm.type === "pcb_port"
  ) {
    const { x, y } = applyToPoint(matrix, {
      x: Number((elm as any).x),
      y: Number((elm as any).y),
    })
    ;(elm as any).x = x
    ;(elm as any).y = y

    // Handle polygon-shaped SMT pads with points array
    if (
      elm.type === "pcb_smtpad" &&
      elm.shape === "polygon" &&
      Array.isArray(elm.points)
    ) {
      elm.points = elm.points.map((point: any) => {
        const tp = applyToPoint(matrix, { x: point.x, y: point.y })
        return {
          x: tp.x,
          y: tp.y,
        }
      })
    }

    if (hasRotation) {
      const anyElm = elm as any
      for (const field of [
        "ccw_rotation",
        "rect_ccw_rotation",
        "hole_ccw_rotation",
      ] as const) {
        if (typeof anyElm[field] === "number") {
          anyElm[field] = rotateCcwField(
            anyElm[field],
            rotationDegrees,
            isFlipped,
          )
        }
      }
    }

    if (elm.type === "pcb_plated_hole") {
      const hole = elm as any
      if ("hole_offset_x" in hole || "hole_offset_y" in hole) {
        const offset = applyLinearPart(matrix, {
          x: Number(hole.hole_offset_x ?? 0),
          y: Number(hole.hole_offset_y ?? 0),
        })
        hole.hole_offset_x = offset.x
        hole.hole_offset_y = offset.y
      }
      // pad_outline points of "hole_with_polygon_pad" are footprint-local and
      // are rotated by the element's ccw_rotation at consumption time (falling
      // back to the owning component's rotation when absent — see
      // getPlatedHolePolygon). A pure rotation therefore needs no outline or
      // field change at all: the updated component rotation already applies.
      // A mirrored matrix is different — a reflection cannot be expressed by a
      // rotation field, so the residual reflection is baked into the outline
      // and ccw_rotation is pinned to the component's post-transform rotation.
      if (
        hole.shape === "hole_with_polygon_pad" &&
        isFlipped &&
        Array.isArray(hole.pad_outline)
      ) {
        const componentRotation =
          ctx?.componentRotationById?.[hole.pcb_component_id] ?? 0
        const oldRotation =
          typeof hole.ccw_rotation === "number"
            ? hole.ccw_rotation
            : componentRotation
        const newRotation = normalizeDegrees360(
          componentRotation + rotationDegrees,
        )
        const residual = compose(
          rotate((-newRotation * Math.PI) / 180),
          { ...matrix, e: 0, f: 0 },
          rotate((oldRotation * Math.PI) / 180),
        )
        hole.pad_outline = hole.pad_outline.map((point: any) =>
          applyToPoint(residual, { x: point.x, y: point.y }),
        )
        hole.ccw_rotation = newRotation
      }
      // The axis-aligned "pill_hole_with_rect_pad" variant carries no rotation
      // fields, so a rotated instance is re-expressed as the rotated variant —
      // the same convention the component emitters use at insert time. The
      // fields are absolute board angles, so they seed from the component's
      // rotation, matching the ccw_rotation ?? componentRotation fallback.
      if (
        hole.shape === "pill_hole_with_rect_pad" &&
        normalizeDegrees360(rotationDegrees) !== 0
      ) {
        const componentRotation =
          ctx?.componentRotationById?.[hole.pcb_component_id] ?? 0
        hole.shape = "rotated_pill_hole_with_rect_pad"
        hole.hole_shape = "rotated_pill"
        hole.hole_ccw_rotation = normalizeDegrees360(
          componentRotation + rotationDegrees,
        )
        hole.rect_ccw_rotation = normalizeDegrees360(
          componentRotation + rotationDegrees,
        )
      }
      // The rect pad of a "circular_hole_with_rect_pad" rotates too; the field
      // is optional in the schema, so create it when a rotation is applied.
      if (
        hole.shape === "circular_hole_with_rect_pad" &&
        typeof hole.rect_ccw_rotation !== "number" &&
        normalizeDegrees360(rotationDegrees) !== 0
      ) {
        hole.rect_ccw_rotation = rotateCcwField(0, rotationDegrees, isFlipped)
      }
    }
  } else if (elm.type === "pcb_keepout" || elm.type === "pcb_board") {
    // TODO adjust size/rotation
    elm.center = applyToPoint(matrix, elm.center)
  } else if (
    elm.type === "pcb_silkscreen_text" ||
    elm.type === "pcb_fabrication_note_text" ||
    elm.type === "pcb_note_text"
  ) {
    elm.anchor_position = applyToPoint(matrix, elm.anchor_position)
  } else if (elm.type === "pcb_copper_text") {
    if (elm.anchor_position) {
      elm.anchor_position = applyToPoint(matrix, elm.anchor_position)
    }
  } else if (elm.type === "pcb_courtyard_rect") {
    elm.center = applyToPoint(matrix, elm.center)
    elm.ccw_rotation = ((elm.ccw_rotation ?? 0) + rotationDegrees) % 360
  } else if (
    elm.type === "pcb_silkscreen_circle" ||
    elm.type === "pcb_silkscreen_rect" ||
    elm.type === "pcb_silkscreen_pill" ||
    elm.type === "pcb_silkscreen_oval" ||
    elm.type === "pcb_note_rect" ||
    elm.type === "pcb_courtyard_circle"
  ) {
    elm.center = applyToPoint(matrix, elm.center)
  } else if (elm.type === "pcb_component") {
    elm.center = applyToPoint(matrix, elm.center)
    elm.rotation = elm.rotation + rotationDegrees
    elm.rotation = elm.rotation % 360
    if (elm.cable_insertion_center) {
      elm.cable_insertion_center = applyToPoint(
        matrix,
        elm.cable_insertion_center,
      )
    }
    elm.insertion_direction = transformInsertionDirection(
      elm.insertion_direction,
      {
        rotationDegrees,
        isFlipped,
      },
    )
    if (flipPadWidthHeight) {
      ;[elm.width, elm.height] = [elm.height, elm.width]
    }
  } else if (elm.type === "pcb_courtyard_outline") {
    elm.outline = elm.outline.map((p) => {
      const tp = applyToPoint(matrix, p) as { x: number; y: number }
      p.x = tp.x
      p.y = tp.y
      return p
    })
  } else if (elm.type === "pcb_courtyard_polygon") {
    elm.points = elm.points.map((p) => {
      const tp = applyToPoint(matrix, p) as { x: number; y: number }
      p.x = tp.x
      p.y = tp.y
      return p
    })
  } else if (elm.type === "pcb_trace") {
    elm.route = elm.route.map((rp) => {
      // "through_pad" route points describe a segment with start/end rather
      // than a single x/y position.
      if (!("x" in rp)) {
        rp.start = applyToPoint(matrix, rp.start) as { x: number; y: number }
        rp.end = applyToPoint(matrix, rp.end) as { x: number; y: number }
        return rp
      }
      const tp = applyToPoint(matrix, rp) as { x: number; y: number }
      rp.x = tp.x
      rp.y = tp.y
      return rp
    })
  } else if (
    elm.type === "pcb_silkscreen_path" ||
    elm.type === "pcb_trace_hint" ||
    elm.type === "pcb_fabrication_note_path" ||
    elm.type === "pcb_note_path"
  ) {
    elm.route = elm.route.map((rp) => {
      const tp = applyToPoint(matrix, rp) as { x: number; y: number }
      rp.x = tp.x
      rp.y = tp.y
      return rp
    })
  } else if (
    elm.type === "pcb_silkscreen_line" ||
    elm.type === "pcb_note_line"
  ) {
    const p1 = { x: elm.x1, y: elm.y1 }
    const p2 = { x: elm.x2, y: elm.y2 }
    const p1t = applyToPoint(matrix, p1)
    const p2t = applyToPoint(matrix, p2)
    elm.x1 = p1t.x
    elm.y1 = p1t.y
    elm.x2 = p2t.x
    elm.y2 = p2t.y
  } else if (elm.type === "cad_component") {
    const newPos = applyToPoint(matrix, {
      x: elm.position.x,
      y: elm.position.y,
    })
    elm.position.x = newPos.x
    elm.position.y = newPos.y
  }
  return elm
}

export const transformPCBElements = (
  elms: AnyCircuitElement[],
  matrix: Matrix,
) => {
  const tsr = decomposeTSR(matrix)
  const quarterTurns = getQuarterTurns(tsr.rotation.angle)
  const flipPadWidthHeight = Math.abs(quarterTurns) % 2 === 1
  // Snapshot component rotations before any element is transformed so rotation
  // fields that default to the component's angle can be materialized correctly
  const componentRotationById: Record<string, number | undefined> = {}
  for (const elm of elms) {
    if (elm.type === "pcb_component") {
      componentRotationById[(elm as any).pcb_component_id] = Number(
        (elm as any).rotation ?? 0,
      )
    }
  }
  let transformedElms = elms.map((elm) =>
    transformPCBElement(elm, matrix, { componentRotationById }),
  )
  if (flipPadWidthHeight) {
    transformedElms = transformedElms.map((elm) => {
      if (
        (elm.type === "pcb_smtpad" || elm.type === "pcb_solder_paste") &&
        (elm.shape === "rect" || elm.shape === "pill")
      ) {
        ;[elm.width, elm.height] = [elm.height, elm.width]
      }
      // Rect/oval/pill pcb_hole shapes carry axis-aligned hole_width/hole_height
      // and no rotation field, so an odd quarter turn swaps their dimensions —
      // the same convention used for smtpads.
      if (
        elm.type === "pcb_hole" &&
        "hole_width" in elm &&
        "hole_height" in elm &&
        (elm.hole_shape === "rect" ||
          elm.hole_shape === "oval" ||
          elm.hole_shape === "pill")
      ) {
        ;[elm.hole_width, elm.hole_height] = [elm.hole_height, elm.hole_width]
      }
      return elm
    })
  }
  return transformedElms
}
