import { expect, test } from "bun:test"
import type { PcbTraceRoutePointWire } from "circuit-json"
import { buildTracePolygon } from "../index"

test("buildTracePolygon uses both endpoint widths and preserves input when reversed", () => {
  const points: PcbTraceRoutePointWire[] = [
    { route_type: "wire", x: 0, y: 0, width: 1, layer: "top" },
    { route_type: "wire", x: 4, y: 0, width: 3, layer: "top" },
  ]
  const original = structuredClone(points)
  expect(buildTracePolygon(points)).toEqual([
    { x: 0, y: 0.5 },
    { x: 4, y: 1.5 },
    { x: 4, y: -1.5 },
    { x: 0, y: -0.5 },
  ])
  expect(buildTracePolygon([...points].reverse())).toEqual([
    { x: 4, y: -1.5 },
    { x: 0, y: -0.5 },
    { x: 0, y: 0.5 },
    { x: 4, y: 1.5 },
  ])
  expect(points).toEqual(original)
})
