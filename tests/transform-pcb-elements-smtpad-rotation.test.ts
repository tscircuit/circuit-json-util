import { expect, test } from "bun:test"
import { transformPCBElements } from "lib/transform-soup-elements"
import type { AnyCircuitElement } from "circuit-json"
import { rotate } from "transformation-matrix"

test("transformPCBElements rotates ccw_rotation on rotated_rect and rotated_pill smtpads (circuit-json-util#160)", () => {
  const elements: AnyCircuitElement[] = [
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "pad_rot_rect",
      shape: "rotated_rect",
      x: 10,
      y: 0,
      width: 4,
      height: 2,
      ccw_rotation: 30,
      layer: "top",
    },
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "pad_rot_pill",
      shape: "rotated_pill",
      x: 0,
      y: 10,
      width: 4,
      height: 2,
      radius: 1,
      ccw_rotation: 45,
      layer: "top",
    },
  ]

  const matrix = rotate((90 * Math.PI) / 180)
  const transformed = transformPCBElements(elements, matrix)

  const rectPad = transformed.find((e) => e.pcb_smtpad_id === "pad_rot_rect") as any
  expect(rectPad).toBeDefined()
  expect(rectPad.ccw_rotation).toBeCloseTo(120)

  const pillPad = transformed.find((e) => e.pcb_smtpad_id === "pad_rot_pill") as any
  expect(pillPad).toBeDefined()
  expect(pillPad.ccw_rotation).toBeCloseTo(135)
})
