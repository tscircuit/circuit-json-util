import type {
  AnyCircuitElement,
  InsertionDirection,
  PcbHole,
  PcbHoleWithPolygonPad,
  PcbPlatedHole,
  PcbSolderPaste,
  PcbSolderPasteRect,
  PcbSolderPasteRotatedRect,
  PcbSoldermaskOpening,
} from "circuit-json"
import {
  type Matrix,
  applyToPoint,
  compose,
  decomposeTSR,
  rotateDEG,
  scale,
} from "transformation-matrix"
import {
  directionToVec,
  rotateDirection,
  vecToDirection,
} from "./direction-to-vec"
import { transformBrepShape } from "./transform-brep-shape"

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

const isReflection = (matrix: Matrix) =>
  matrix.a * matrix.d - matrix.b * matrix.c < 0

const getTransformedRectRotation = (rotation: number, matrix: Matrix) => {
  return (
    (decomposeTSR(
      compose(matrix, rotateDEG(rotation)),
      false,
      isReflection(matrix),
    ).rotation.angle *
      180) /
    Math.PI
  )
}

/**
 * Normalizes to [0, 360), the range PlatedHole and Hole emit. Placement matrices
 * carry float noise (a packer angle of -90.00000000000001 means 270), so angles
 * this close to a whole degree are snapped to it.
 */
const normalizeHoleRotation = (degrees: number) => {
  const normalized = ((degrees % 360) + 360) % 360
  const rounded = Math.round(normalized)
  const snapped = Math.abs(normalized - rounded) < 1e-6 ? rounded : normalized
  return snapped === 360 ? 0 : snapped
}

/**
 * The orientation of a hole shape after `matrix`, in CCW degrees. Pills, ovals
 * and centered rects are symmetric about both local axes, so they survive the
 * local reflection in a TSR decomposition and repeat every 180 degrees. Reducing
 * mirrored results to [0, 180) keeps an axis-aligned shape axis-aligned: a Y flip
 * of a 0 degree pill stays at 0 rather than becoming an equivalent 180.
 */
const getTransformedHoleRotation = (
  rotation: number | undefined,
  matrix: Matrix,
) => {
  const transformed = normalizeHoleRotation(
    getTransformedRectRotation(rotation ?? 0, matrix),
  )
  return isReflection(matrix) ? transformed % 180 : transformed
}

const transformPolygonPadOrientation = (
  hole: PcbHoleWithPolygonPad,
  matrix: Matrix,
) => {
  const transformed = normalizeHoleRotation(
    getTransformedRectRotation(hole.ccw_rotation ?? 0, matrix),
  )
  if (!isReflection(matrix)) {
    hole.ccw_rotation = transformed
    return
  }
  // pad_outline is relative to the hole and may be asymmetric, so a reflection
  // has to flip the outline as well. getTransformedRectRotation factors the
  // placement as R(transformed) * scale(-1, 1), which also equals
  // R(transformed - 180) * scale(1, -1). Use the factoring in [0, 180) to match
  // getTransformedHoleRotation.
  const localMirror = transformed >= 180 ? scale(1, -1) : scale(-1, 1)
  hole.pad_outline = hole.pad_outline.map((point) =>
    applyToPoint(localMirror, point),
  )
  hole.ccw_rotation = transformed % 180
}

/**
 * Applies the placement's rotation and reflection to the orientation of a hole
 * or rotated paste, leaving the same fields PlatedHole and Hole would emit for
 * an explicit pcbRotation. Pure translations change nothing here, including the
 * shape of an unrotated pill.
 */
const transformHoleOrientation = (
  elm: PcbPlatedHole | PcbHole | PcbSolderPaste,
  matrix: Matrix,
) => {
  const appliedRotation = (Math.atan2(matrix.b, matrix.a) * 180) / Math.PI
  if (!isReflection(matrix) && normalizeHoleRotation(appliedRotation) === 0) {
    return
  }

  if (elm.type === "pcb_plated_hole") {
    switch (elm.shape) {
      case "pill":
      case "oval":
        elm.ccw_rotation = getTransformedHoleRotation(elm.ccw_rotation, matrix)
        return
      case "hole_with_polygon_pad":
        transformPolygonPadOrientation(elm, matrix)
        return
      case "circular_hole_with_rect_pad":
        elm.rect_ccw_rotation = getTransformedHoleRotation(
          elm.rect_ccw_rotation,
          matrix,
        )
        return
      case "rotated_pill_hole_with_rect_pad":
        elm.hole_ccw_rotation = getTransformedHoleRotation(
          elm.hole_ccw_rotation,
          matrix,
        )
        elm.rect_ccw_rotation = getTransformedHoleRotation(
          elm.rect_ccw_rotation,
          matrix,
        )
        return
      case "pill_hole_with_rect_pad": {
        // This shape has no rotation field, so PlatedHole uses the rotated
        // variant for any non-zero rotation.
        const rotation = getTransformedHoleRotation(0, matrix)
        if (rotation === 0) return
        Object.assign(elm, {
          shape: "rotated_pill_hole_with_rect_pad",
          hole_shape: "rotated_pill",
          hole_ccw_rotation: rotation,
          rect_ccw_rotation: rotation,
        })
        return
      }
    }
    return
  }

  if (elm.type === "pcb_hole") {
    if (elm.hole_shape === "rotated_pill") {
      elm.ccw_rotation = getTransformedHoleRotation(elm.ccw_rotation, matrix)
    } else if (elm.hole_shape === "pill") {
      const rotation = getTransformedHoleRotation(0, matrix)
      if (rotation === 0) return
      Object.assign(elm, { hole_shape: "rotated_pill", ccw_rotation: rotation })
    }
    return
  }

  if (elm.shape === "rotated_pill") {
    elm.ccw_rotation = getTransformedHoleRotation(elm.ccw_rotation, matrix)
  }
}

const transformPcbSolderPasteRectangle = (
  paste: PcbSolderPasteRect | PcbSolderPasteRotatedRect,
  matrix: Matrix,
) => {
  const center = applyToPoint(matrix, { x: paste.x, y: paste.y })
  paste.x = center.x
  paste.y = center.y
  const rotation = getTransformedRectRotation(
    paste.shape === "rotated_rect" ? paste.ccw_rotation : 0,
    matrix,
  )
  const quarterTurns = Math.round(rotation / 90)

  // Preserve the axis-aligned rect representation for exact quarter turns.
  // Arbitrary angles need rotated_rect, with dimensions in its local frame.
  if (Math.abs(rotation - quarterTurns * 90) < 1e-8) {
    if (Math.abs(quarterTurns) % 2 === 1) {
      ;[paste.width, paste.height] = [paste.height, paste.width]
    }
    Object.assign(paste, { shape: "rect" })
    Reflect.deleteProperty(paste, "ccw_rotation")
  } else {
    Object.assign(paste, { shape: "rotated_rect", ccw_rotation: rotation })
  }
  return paste
}

/**
 * Applies a rigid planar placement to flat PCB opening geometry in mm, in the
 * right-handed frame (+X right, +Y top, +Z above). Centers and polygon vertices
 * are points and receive translation. Rectangle orientation is composed as a
 * direction; its local dimensions and attachment layer remain unchanged.
 * A centered rectangle is invariant under the local reflection in a TSR
 * decomposition, so its rotation also represents reflected corner geometry.
 */
const transformPcbSoldermaskOpening = (
  opening: PcbSoldermaskOpening,
  matrix: Matrix,
) => {
  if (opening.shape === "polygon") {
    opening.points = opening.points.map((point) => applyToPoint(matrix, point))
    return opening
  }

  const center = applyToPoint(matrix, { x: opening.x, y: opening.y })
  opening.x = center.x
  opening.y = center.y
  if (opening.shape === "circle") return opening

  const rectRotation =
    opening.shape === "rotated_rect" ? opening.ccw_rotation : 0
  const transformedRotation = getTransformedRectRotation(rectRotation, matrix)
  if (Math.abs(transformedRotation) < 1e-8) {
    Object.assign(opening, { shape: "rect" })
    Reflect.deleteProperty(opening, "ccw_rotation")
  } else {
    Object.assign(opening, {
      shape: "rotated_rect",
      ccw_rotation: transformedRotation,
    })
  }
  return opening
}

export const transformPCBElement = (elm: AnyCircuitElement, matrix: Matrix) => {
  if (elm.type === "pcb_copper_pour" && elm.shape === "brep") {
    elm.brep_shape = transformBrepShape(elm.brep_shape, matrix)
    return elm
  }
  // Cutout centers and vertices are board-world points in mm (+X right, +Y up).
  // Rectangle dimensions stay local while orientation follows the placement.
  if (elm.type === "pcb_cutout") {
    if (elm.shape === "polygon") {
      elm.points = elm.points.map((point) => applyToPoint(matrix, point))
    } else if (elm.shape === "path") {
      elm.route = elm.route.map((point) => applyToPoint(matrix, point))
    } else {
      elm.center = applyToPoint(matrix, elm.center)
      if (elm.shape === "rect") {
        elm.rotation = getTransformedRectRotation(elm.rotation ?? 0, matrix)
      }
    }
    return elm
  }
  if (elm.type === "pcb_soldermask_opening") {
    return transformPcbSoldermaskOpening(elm, matrix)
  }
  if (
    elm.type === "pcb_solder_paste" &&
    (elm.shape === "rect" || elm.shape === "rotated_rect")
  ) {
    return transformPcbSolderPasteRectangle(elm, matrix)
  }
  // Polygon vertices are board-world points in mm (+X right, +Y up), not centers.
  if (
    (elm.type === "pcb_smtpad" || elm.type === "pcb_solder_paste") &&
    elm.shape === "polygon"
  ) {
    elm.points = elm.points.map((point) => applyToPoint(matrix, point))
    if (elm.type === "pcb_solder_paste" && elm.holes) {
      elm.holes = elm.holes.map((hole) =>
        hole.map((point) => applyToPoint(matrix, point)),
      )
    }
    return elm
  }
  const tsr = decomposeTSR(matrix)
  const flipPadWidthHeight =
    Math.abs(getQuarterTurns(tsr.rotation.angle)) % 2 === 1
  const rotationDegrees = (tsr.rotation.angle / Math.PI) * 180
  const isFlipped = tsr.scale.sy < 0
  if (
    elm.type === "pcb_plated_hole" ||
    elm.type === "pcb_hole" ||
    elm.type === "pcb_via" ||
    elm.type === "pcb_smtpad" ||
    elm.type === "pcb_solder_paste" ||
    elm.type === "pcb_port"
  ) {
    const { x, y } = applyToPoint(matrix, {
      x: elm.x,
      y: elm.y,
    })
    elm.x = x
    elm.y = y
    if (
      elm.type === "pcb_smtpad" &&
      (elm.shape === "rotated_rect" || elm.shape === "rotated_pill")
    ) {
      elm.ccw_rotation = getTransformedRectRotation(elm.ccw_rotation, matrix)
    }
    if (
      elm.type === "pcb_plated_hole" ||
      elm.type === "pcb_hole" ||
      elm.type === "pcb_solder_paste"
    ) {
      transformHoleOrientation(elm, matrix)
    }
  } else if (elm.type === "pcb_keepout" && elm.shape === "outline") {
    elm.outline = elm.outline.map((point) => applyToPoint(matrix, point))
  } else if (elm.type === "pcb_keepout" || elm.type === "pcb_board") {
    // TODO adjust size/rotation
    elm.center = applyToPoint(matrix, elm.center)
  } else if (
    elm.type === "pcb_silkscreen_text" ||
    elm.type === "pcb_fabrication_note_text" ||
    elm.type === "pcb_note_text"
  ) {
    elm.anchor_position = applyToPoint(matrix, elm.anchor_position)
    if (elm.type === "pcb_silkscreen_text") {
      const textTransform = compose(matrix, rotateDEG(elm.ccw_rotation ?? 0))
      elm.ccw_rotation =
        (Math.atan2(textTransform.b, textTransform.a) * 180) / Math.PI
    }
  } else if (elm.type === "pcb_copper_text") {
    if (elm.anchor_position) {
      elm.anchor_position = applyToPoint(matrix, elm.anchor_position)
    }
  } else if (elm.type === "pcb_courtyard_rect") {
    elm.center = applyToPoint(matrix, elm.center)
    elm.ccw_rotation = getTransformedRectRotation(elm.ccw_rotation ?? 0, matrix)
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
    if (elm.footprint_origin) {
      elm.footprint_origin = applyToPoint(matrix, elm.footprint_origin)
    }
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
  let transformedElms = elms.map((elm) => transformPCBElement(elm, matrix))
  if (flipPadWidthHeight) {
    transformedElms = transformedElms.map((elm) => {
      if (
        (elm.type === "pcb_smtpad" &&
          (elm.shape === "rect" || elm.shape === "pill")) ||
        (elm.type === "pcb_solder_paste" && elm.shape === "pill")
      ) {
        ;[elm.width, elm.height] = [elm.height, elm.width]
      }
      return elm
    })
  }
  return transformedElms
}
