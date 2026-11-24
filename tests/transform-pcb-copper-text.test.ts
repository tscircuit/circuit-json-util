import { expect, test } from "bun:test"
import { pcb_copper_text } from "circuit-json"
import { rotateDEG, translate } from "transformation-matrix"
import { transformPCBElements } from "../index"

const createCopperText = () =>
  pcb_copper_text.parse({
    type: "pcb_copper_text",
    pcb_copper_text_id: "copper-text",
    pcb_component_id: "component",
    font: "tscircuit2024",
    font_size: 1,
    text: "A",
    layer: "top",
    anchor_position: { x: 1, y: 0 },
    anchor_alignment: "center",
    ccw_rotation: 30,
  })

test("rotating a placement rotates pcb_copper_text orientation", () => {
  const elm = createCopperText()
  transformPCBElements([elm], rotateDEG(90))

  expect(elm.anchor_position.x).toBeCloseTo(0)
  expect(elm.anchor_position.y).toBeCloseTo(1)
  expect(elm.ccw_rotation).toBeCloseTo(120)
})

test("translating a placement keeps pcb_copper_text orientation", () => {
  const elm = createCopperText()
  transformPCBElements([elm], translate(5, -2))

  expect(elm.anchor_position.x).toBeCloseTo(6)
  expect(elm.anchor_position.y).toBeCloseTo(-2)
  expect(elm.ccw_rotation).toBeCloseTo(30)
})
