import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { compose, rotateDEG, translate } from "transformation-matrix"
import { transformPCBElements } from "../lib/transform-soup-elements"

test("transformPCBElements rotates PCB text orientation", () => {
  const circuitJson: AnyCircuitElement[] = [
    {
      type: "pcb_silkscreen_text",
      pcb_silkscreen_text_id: "pcb_silkscreen_text_1",
      pcb_component_id: "pcb_component_1",
      anchor_position: { x: 1, y: 0 },
      anchor_alignment: "center",
      text: "R1",
      font: "tscircuit2024",
      font_size: 1,
      layer: "top",
      ccw_rotation: 30,
    },
  ]

  transformPCBElements(circuitJson, compose(translate(10, 20), rotateDEG(90)))

  const transformedText = circuitJson[0]
  expect(transformedText).toMatchObject({
    anchor_position: { x: 10, y: 21 },
    ccw_rotation: 120,
  })

  transformPCBElements(circuitJson, rotateDEG(-180))

  expect(transformedText).toMatchObject({ ccw_rotation: 300 })
})
