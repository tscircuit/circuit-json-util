import type { AnyCircuitElement, InsertionDirection } from "circuit-json"
import { type Matrix, applyToPoint, decomposeTSR } from "transformation-matrix"
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

export const transformPCBElement = (elm: AnyCircuitElement, matrix: Matrix) => {
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
    // `cutout_aperture_direction` is the same board-space direction kind as
    // `insertion_direction`; circuit-json releases it independently, so keep
    // this structural boundary compatible with versions before and after the
    // field was added.
    const componentWithApertureDirection = elm as typeof elm & {
      cutout_aperture_direction?: InsertionDirection
    }
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
    componentWithApertureDirection.cutout_aperture_direction =
      transformInsertionDirection(
        componentWithApertureDirection.cutout_aperture_direction,
        { rotationDegrees, isFlipped },
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
        (elm.type === "pcb_smtpad" || elm.type === "pcb_solder_paste") &&
        (elm.shape === "rect" || elm.shape === "pill")
      ) {
        ;[elm.width, elm.height] = [elm.height, elm.width]
      }
      return elm
    })
  }
  return transformedElms
}
