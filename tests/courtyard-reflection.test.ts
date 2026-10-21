import { expect, test } from "bun:test"
import { pcb_courtyard_rect, type PcbCourtyardRect } from "circuit-json"
import {
  applyToPoint,
  compose,
  identity,
  rotateDEG,
  scale,
  translate,
} from "transformation-matrix"
import { transformPCBElements } from "../lib/transform-soup-elements"

const corners = (rect: PcbCourtyardRect) => {
  const radians = ((rect.ccw_rotation ?? 0) * Math.PI) / 180
  return (
    [
      [-1, -1],
      [-1, 1],
      [1, 1],
      [1, -1],
    ] as const
  ).map(([sx, sy]) => {
    const x = (sx * rect.width) / 2
    const y = (sy * rect.height) / 2
    return {
      x: rect.center.x + x * Math.cos(radians) - y * Math.sin(radians),
      y: rect.center.y + x * Math.sin(radians) + y * Math.cos(radians),
    }
  })
}

const cases = [
  { name: "identity", matrix: identity() },
  {
    name: "rotation with translation",
    matrix: compose(translate(10, -20), rotateDEG(90)),
  },
  { name: "X reflection", matrix: scale(-1, 1) },
  { name: "Y reflection", matrix: scale(1, -1) },
  {
    name: "reflection before rotation",
    matrix: compose(translate(10, -20), rotateDEG(41), scale(1, -1)),
  },
  {
    name: "reflection after rotation",
    matrix: compose(translate(10, -20), scale(1, -1), rotateDEG(41)),
  },
]
for (const { name, matrix } of cases) {
  test(`courtyard rectangle corners follow ${name}`, () => {
    const original = pcb_courtyard_rect.parse({
      type: "pcb_courtyard_rect",
      pcb_courtyard_rect_id: "courtyard1",
      pcb_component_id: "component1",
      center: { x: 2, y: 3 },
      width: 4,
      height: 1,
      ccw_rotation: 30,
      layer: "top",
    })
    const expected = corners(original).map((point) =>
      applyToPoint(matrix, point),
    )
    const [result] = transformPCBElements([structuredClone(original)], matrix)
    if (result?.type !== "pcb_courtyard_rect")
      throw new Error("Expected courtyard rectangle")
    const actual = corners(result)
    for (const point of expected) {
      const error = Math.min(
        ...actual.map((candidate) =>
          Math.hypot(candidate.x - point.x, candidate.y - point.y),
        ),
      )
      expect(error).toBeLessThan(1e-8)
    }
    expect(result.width).toBe(original.width)
    expect(result.height).toBe(original.height)
    expect(result.layer).toBe(original.layer)
    expect(pcb_courtyard_rect.parse(result)).toEqual(result)
  })
}
