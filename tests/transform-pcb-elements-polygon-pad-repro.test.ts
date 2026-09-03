import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { identity, rotateDEG, translate } from "transformation-matrix"
import { transformPCBElements } from "../lib/transform-soup-elements"

test("polygon SMT pad transforms introduce NaN center coordinates (issue #122)", () => {
  const cases = [
    {
      matrix: identity(),
      expectedPoints: [
        { x: 4, y: 2 },
        { x: 6, y: 2 },
        { x: 6, y: 4 },
        { x: 4, y: 4 },
      ],
    },
    {
      matrix: translate(5, -2),
      expectedPoints: [
        { x: 9, y: 0 },
        { x: 11, y: 0 },
        { x: 11, y: 2 },
        { x: 9, y: 2 },
      ],
    },
    {
      matrix: rotateDEG(90),
      expectedPoints: [
        { x: -2, y: 4 },
        { x: -2, y: 6 },
        { x: -4, y: 6 },
        { x: -4, y: 4 },
      ],
    },
  ]

  for (const { matrix, expectedPoints } of cases) {
    const pad: Extract<AnyCircuitElement, { type: "pcb_smtpad" }> = {
      type: "pcb_smtpad",
      pcb_smtpad_id: "pcb_smtpad_0",
      pcb_component_id: "pcb_component_0",
      pcb_port_id: "pcb_port_0",
      layer: "top",
      shape: "polygon",
      points: [
        { x: 4, y: 2 },
        { x: 6, y: 2 },
        { x: 6, y: 4 },
        { x: 4, y: 4 },
      ],
    }

    expect(pad).not.toHaveProperty("x")
    expect(pad).not.toHaveProperty("y")
    transformPCBElements([pad], matrix)

    for (const [index, point] of pad.points.entries()) {
      expect(point.x).toBeCloseTo(expectedPoints[index]!.x)
      expect(point.y).toBeCloseTo(expectedPoints[index]!.y)
    }

    // Repro-only: vertices are correct, but the generic center transform
    // adds these invalid fields. The fix should invert these assertions.
    expect(pad).toHaveProperty("x", Number.NaN)
    expect(pad).toHaveProperty("y", Number.NaN)
  }
})
