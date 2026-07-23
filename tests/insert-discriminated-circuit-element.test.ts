import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { cju } from "../index"

test("table insert accepts every variant of a discriminated Circuit JSON type", () => {
  const circuitJson: AnyCircuitElement[] = []
  const db = cju(circuitJson)

  const circularPad = db.pcb_smtpad.insert({
    shape: "circle",
    x: 1,
    y: 2,
    radius: 0.5,
    layer: "top",
  })
  const rectangularPad = db.pcb_smtpad.insert({
    shape: "rect",
    x: 3,
    y: 4,
    width: 1,
    height: 2,
    layer: "bottom",
  })

  expect(circularPad.shape).toBe("circle")
  expect(rectangularPad.shape).toBe("rect")
})
