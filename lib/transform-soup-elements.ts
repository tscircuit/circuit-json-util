import type { AnyCircuitElement } from "circuit-json"
import { type Matrix, applyToPoint, decomposeTSR } from "transformation-matrix"
import {
  directionToVec,
  rotateDirection,
  vecToDirection,
} from "./direction-to-vec"

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
    Math.round(tsr.rotation.angle / (Math.PI / 2)) % 2 === 1
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
  } else if (elm.type === "pcb_keepout" || elm.type === "pcb_board") {
    // TODO adjust size/rotation
    elm.center = applyToPoint(matrix, elm.center)
  } else if (
    elm.type === "pcb_silkscreen_text" ||
    elm.type === "pcb_fabrication_note_text"
  ) {
    elm.anchor_position = applyToPoint(matrix, elm.anchor_position)
  } else if (
    elm.type === "pcb_silkscreen_circle" ||
    elm.type === "pcb_silkscreen_rect"
  ) {
    elm.center = applyToPoint(matrix, elm.center)
  } else if (elm.type === "pcb_component") {
    elm.center = applyToPoint(matrix, elm.center)
    elm.rotation = elm.rotation + (tsr.rotation.angle / Math.PI) * 180
    elm.rotation = elm.rotation % 360
    if (flipPadWidthHeight) {
      ;[elm.width, elm.height] = [elm.height, elm.width]
    }
    // Transform cutouts within the component
    if ((elm as any).cutouts) {
      (elm as any).cutouts = (elm as any).cutouts.map((cutout: any) => {
        const transformedCutout = { ...cutout }
        if (transformedCutout.center) {
          transformedCutout.center = applyToPoint(matrix, transformedCutout.center)
        }
        if (transformedCutout.rotation !== undefined) {
          transformedCutout.rotation = transformedCutout.rotation + (tsr.rotation.angle / Math.PI) * 180
          transformedCutout.rotation = transformedCutout.rotation % 360
        }
        if (flipPadWidthHeight && transformedCutout.width && transformedCutout.height) {
          ;[transformedCutout.width, transformedCutout.height] = [transformedCutout.height, transformedCutout.width]
        }
        return transformedCutout
      })
    }
  } else if (elm.type === "pcb_cutout") {
    elm.center = applyToPoint(matrix, elm.center)
    if (elm.rotation !== undefined) {
      elm.rotation = elm.rotation + (tsr.rotation.angle / Math.PI) * 180
      elm.rotation = elm.rotation % 360
    }
    if (flipPadWidthHeight && elm.width && elm.height) {
      ;[elm.width, elm.height] = [elm.height, elm.width]
    }
  } else if (
    elm.type === "pcb_silkscreen_path" ||
    elm.type === "pcb_trace" ||
    elm.type === "pcb_fabrication_note_path"
  ) {
    elm.route = elm.route.map((rp) => {
      const tp = applyToPoint(matrix, rp) as { x: number; y: number }
      rp.x = tp.x
      rp.y = tp.y
      return rp
    })
  } else if (elm.type === "pcb_silkscreen_line") {
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
  const flipPadWidthHeight =
    Math.round(tsr.rotation.angle / (Math.PI / 2)) % 2 === 1
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
