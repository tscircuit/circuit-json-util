import { expect, test } from "bun:test"
import type { PcbTraceRoutePointWire } from "circuit-json"
import { buildTracePolygon } from "../index"

test("buildTracePolygon preserves geometry for empty, repeated, and reversing routes", () => {
  const point: PcbTraceRoutePointWire = {
    route_type: "wire",
    x: 0,
    y: 0,
    width: 1,
    layer: "top",
  }
  expect(buildTracePolygon([])).toEqual([])
  expect(buildTracePolygon([point])).toEqual([
    { x: 0, y: 0.5 },
    { x: 0, y: -0.5 },
  ])
  for (const { points, expected } of [
    {
      points: [point, point],
      expected: [
        [0, 0.5],
        [0, 0.5],
        [0, -0.5],
        [0, -0.5],
      ],
    },
    {
      points: [point, point, { ...point, x: 4 }],
      expected: [
        [0, 0.5],
        [0, 0.5],
        [4, 0.5],
        [4, -0.5],
        [0, -0.5],
        [0, -0.5],
      ],
    },
    {
      points: [point, { ...point, x: 4 }, point],
      expected: [
        [0, 0.5],
        [4, 0.5],
        [0, -0.5],
        [0, 0.5],
        [4, -0.5],
        [0, -0.5],
      ],
    },
  ]) {
    const original = structuredClone(points)
    const polygon = buildTracePolygon(points)
    expect(polygon.map(({ x, y }) => [x, y])).toEqual(expected)
    expect(points).toEqual(original)
  }
})
