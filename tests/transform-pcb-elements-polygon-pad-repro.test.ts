import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { getSvgFromGraphicsObject } from "graphics-debug"
import { identity, rotateDEG, translate } from "transformation-matrix"
import { transformPCBElements } from "../lib/transform-soup-elements"

test("polygon SMT pad transforms introduce NaN center coordinates (issue #122)", () => {
  const cases = [
    {
      name: "identity",
      matrix: identity(),
      expectedPoints: [
        { x: 4, y: 2 },
        { x: 6, y: 2 },
        { x: 6, y: 4 },
        { x: 4, y: 4 },
      ],
    },
    {
      name: "translation",
      matrix: translate(5, -2),
      expectedPoints: [
        { x: 9, y: 0 },
        { x: 11, y: 0 },
        { x: 11, y: 2 },
        { x: 9, y: 2 },
      ],
    },
    {
      name: "rotation",
      matrix: rotateDEG(90),
      expectedPoints: [
        { x: -2, y: 4 },
        { x: -2, y: 6 },
        { x: -4, y: 6 },
        { x: -4, y: 4 },
      ],
    },
  ]

  for (const { name, matrix, expectedPoints } of cases) {
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

    // Render the vertices and report the actual center fields, including NaN.
    expect(
      getSvgFromGraphicsObject(
        {
          coordinateSystem: "cartesian",
          texts: [
            {
              x:
                pad.points.reduce((sum, point) => sum + point.x, 0) /
                pad.points.length,
              y: Math.max(...pad.points.map((point) => point.y)) + 0.35,
              text: `${name}: x=${Reflect.get(pad, "x")}, y=${Reflect.get(pad, "y")}`,
              fontSize: 0.12,
            },
          ],
          points: pad.points.map((point, index) => ({
            ...point,
            label: `P${index + 1}`,
          })),
          lines: [
            {
              points: [...pad.points, pad.points[0]!],
              strokeColor: "#2563eb",
            },
          ],
        },
        { includeTextLabels: true },
      ),
    ).toMatchSvgSnapshot(import.meta.path, name)

    // Repro-only: vertices are correct, but the generic center transform
    // adds these invalid fields. The fix should invert these assertions.
    expect(pad).toHaveProperty("x", Number.NaN)
    expect(pad).toHaveProperty("y", Number.NaN)
  }
})
