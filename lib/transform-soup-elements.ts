import type { AnyCircuitElement } from "circuit-json"
import { type Matrix, applyToPoint, decomposeTSR } from "transformation-matrix"
import {
  directionToVec,
  rotateDirection,
  vecToDirection,
} from "./direction-to-vec"

type PcbInsertionDirection =
  | "from_above"
  | "from_left"
  | "from_right"
  | "from_front"
  | "from_back"

const getQuarterTurns = (angleRadians: number) =>
  Math.round(angleRadians / (Math.PI / 2))

const insertionDirectionToVec = (
  direction: Exclude<PcbInsertionDirection, "from_above">,
) => {
  switch (direction) {
    case "from_left":
      return { x: -1, y: 0 }
    case "from_right":
      return { x: 1, y: 0 }
    case "from_front":
      return { x: 0, y: 1 }
    case "from_back":
      return { x: 0, y: -1 }
  }
}

const vecToInsertionDirection = ({
  x,
  y,
}: {
  x: number
  y: number
}): Exclude<PcbInsertionDirection, "from_above"> => {
  if (x > 0) return "from_right"
  if (x < 0) return "from_left"
  if (y > 0) return "from_front"
  return "from_back"
}

export const transformInsertionDirection = (
  direction: PcbInsertionDirection | undefined,
  opts: { rotationDegrees: number; isFlipped: boolean },
) => {
  if (!direction || direction === "from_above") return direction

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
    // Rotate the keepout / board outline centre point
    elm.center = applyToPoint(matrix, elm.center)

    // When the rotation is an odd multiple of 90° the width/height should be swapped
    if (flipPadWidthHeight) {
      // Only swap when both dimensions exist on the element (keeps backwards-compatibility)
      if ("width" in elm && "height" in elm) {
        // @ts-ignore – runtime check guarantees properties exist
        ;[elm.width, elm.height] = [elm.height as number, elm.width as number]
      }
    }
  } else if (
    elm.type === "pcb_silkscreen_text" ||
    elm.type === "pcb_fabrication_note_text" ||
    elm.type === "pcb_note_text"
  ) {
    elm.anchor_position = applyToPoint(matrix, elm.anchor_position)
  } else if (
    elm.type === "pcb_silkscreen_circle" ||
    elm.type === "pcb_silkscreen_rect" ||
    elm.type === "pcb_note_rect" ||
    elm.type === "pcb_courtyard_rect" ||
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
  } else if (
    elm.type === "pcb_silkscreen_path" ||
    elm.type === "pcb_trace" ||
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
      if (elm.type === "pcb_smtpad" && elm.shape === "rect") {
        ;[elm.width, elm.height] = [elm.height, elm.width]
      }
      return elm
    })
  }
  return transformedElms
}
