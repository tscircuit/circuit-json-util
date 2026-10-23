import { expect, test } from "bun:test"
import type { PcbTraceRoutePointWire } from "circuit-json"
import { buildTracePolygon } from "../index"

test("buildTracePolygon keeps empty and degenerate routes finite", () => {
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
  for (const points of [
    [point, point],
    [point, point, { ...point, x: 4 }],
    [point, { ...point, x: 4 }, point],
  ]) {
    const original = structuredClone(points)
    const polygon = buildTracePolygon(points)
    expect(polygon).toHaveLength(points.length * 2)
    expect(
      polygon.every(({ x, y }) => Number.isFinite(x) && Number.isFinite(y)),
    ).toBe(true)
    expect(points).toEqual(original)
  }
})
