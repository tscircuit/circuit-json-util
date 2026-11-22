import { expect, test } from "bun:test"
import { buildTracePolygon } from "../index"

test("buildTracePolygon joins a bend using the averaged unit direction", () => {
  const polygon = buildTracePolygon([
    { route_type: "wire", x: 0, y: 0, width: 1, layer: "top" },
    { route_type: "wire", x: 4, y: 0, width: 2, layer: "top" },
    { route_type: "wire", x: 4, y: 4, width: 3, layer: "top" },
  ])
  expect(polygon).toHaveLength(6)
  const expected = [
    { x: 0, y: 0.5 },
    { x: 4 - Math.SQRT1_2, y: Math.SQRT1_2 },
    { x: 2.5, y: 4 },
    { x: 5.5, y: 4 },
    { x: 4 + Math.SQRT1_2, y: -Math.SQRT1_2 },
    { x: 0, y: -0.5 },
  ]
  for (const [index, point] of expected.entries()) {
    expect(polygon[index]!.x).toBeCloseTo(point.x)
    expect(polygon[index]!.y).toBeCloseTo(point.y)
  }
})
