import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { compose, rotateDEG, scale, translate } from "transformation-matrix"
import { transformPCBElements } from "../lib/transform-soup-elements"

test("transformPCBElements translates and swaps dimensions for pcb_fabrication_note_rect and pcb_courtyard_pill on 90-degree turns", () => {
  const elms: AnyCircuitElement[] = [
    {
      type: "pcb_fabrication_note_rect",
      pcb_fabrication_note_rect_id: "fnr1",
      pcb_component_id: "pc1",
      center: { x: 2, y: 1 },
      width: 4,
      height: 1.5,
      stroke_width: 0.1,
      layer: "top",
    },
    {
      type: "pcb_courtyard_pill",
      pcb_courtyard_pill_id: "cpill1",
      pcb_component_id: "pc1",
      center: { x: -1, y: 3 },
      width: 3,
      height: 1.2,
      radius: 0.6,
      layer: "top",
    },
  ]

  transformPCBElements(elms, compose(translate(10, 20), rotateDEG(90)))

  const fabRect = elms[0] as Extract<
    AnyCircuitElement,
    { type: "pcb_fabrication_note_rect" }
  >
  expect(fabRect.center.x).toBeCloseTo(9)
  expect(fabRect.center.y).toBeCloseTo(22)
  expect(fabRect.width).toBe(1.5)
  expect(fabRect.height).toBe(4)

  const courtyardPill = elms[1] as Extract<
    AnyCircuitElement,
    { type: "pcb_courtyard_pill" }
  >
  expect(courtyardPill.center.x).toBeCloseTo(7)
  expect(courtyardPill.center.y).toBeCloseTo(19)
  expect(courtyardPill.width).toBe(1.2)
  expect(courtyardPill.height).toBe(3)
  expect(courtyardPill.radius).toBe(0.6)
})

test("transformPCBElements transforms pcb_fabrication_note_dimension and pcb_note_dimension endpoints, offset_direction, and text_ccw_rotation", () => {
  const elms: AnyCircuitElement[] = [
    {
      type: "pcb_fabrication_note_dimension",
      pcb_fabrication_note_dimension_id: "fnd1",
      pcb_component_id: "pc1",
      layer: "top",
      from: { x: -2, y: 0 },
      to: { x: 2, y: 0 },
      offset_distance: 1,
      offset_direction: { x: 0, y: 1 },
      text: "4.00mm",
      text_ccw_rotation: 0,
      font: "tscircuit2024",
      font_size: 0.8,
      arrow_size: 0.4,
    },
    {
      type: "pcb_note_dimension",
      pcb_note_dimension_id: "nd1",
      layer: "bottom",
      from: { x: 0, y: -1 },
      to: { x: 0, y: 3 },
      offset_distance: 1.5,
      offset_direction: { x: 1, y: 0 },
      text: "4.00mm",
      text_ccw_rotation: 90,
      font: "tscircuit2024",
      font_size: 0.8,
      arrow_size: 0.4,
    },
  ]

  // Translate + rotate 90 deg CCW: pure translation must not affect offset_direction
  transformPCBElements(elms, compose(translate(5, 10), rotateDEG(90)))

  const fabDim = elms[0] as Extract<
    AnyCircuitElement,
    { type: "pcb_fabrication_note_dimension" }
  >
  expect(fabDim.from.x).toBeCloseTo(5)
  expect(fabDim.from.y).toBeCloseTo(8)
  expect(fabDim.to.x).toBeCloseTo(5)
  expect(fabDim.to.y).toBeCloseTo(12)
  expect(fabDim.offset_direction?.x).toBeCloseTo(-1)
  expect(fabDim.offset_direction?.y).toBeCloseTo(0)
  expect(fabDim.text_ccw_rotation).toBeCloseTo(90)

  const noteDim = elms[1] as Extract<
    AnyCircuitElement,
    { type: "pcb_note_dimension" }
  >
  expect(noteDim.from.x).toBeCloseTo(6)
  expect(noteDim.from.y).toBeCloseTo(10)
  expect(noteDim.to.x).toBeCloseTo(2)
  expect(noteDim.to.y).toBeCloseTo(10)
  expect(noteDim.offset_direction?.x).toBeCloseTo(0)
  expect(noteDim.offset_direction?.y).toBeCloseTo(1)
  expect(noteDim.text_ccw_rotation).toBeCloseTo(180)

  // Mirror across X axis (board flip scale(1, -1))
  transformPCBElements([noteDim], scale(1, -1))
  expect(noteDim.from.y).toBeCloseTo(-10)
  expect(noteDim.offset_direction?.x).toBeCloseTo(0)
  expect(noteDim.offset_direction?.y).toBeCloseTo(-1)
})
