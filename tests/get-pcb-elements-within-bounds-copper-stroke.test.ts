import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import {
  getPcbElementBounds,
  getPcbElementCopperBounds,
  getPcbElementsWithinBounds,
} from "../lib/get-bounds-of-pcb-elements"

const mkTrace = (
  route: Array<{ x: number; y: number; width: number }>,
): AnyCircuitElement =>
  ({
    type: "pcb_trace",
    pcb_trace_id: "trace",
    route: route.map((p) => ({
      route_type: "wire",
      layer: "top",
      ...p,
    })),
  }) as AnyCircuitElement

/**
 * https://github.com/tscircuit/circuit-json-util/issues/217
 *
 * A trace's centerline bounds exclude the rendered copper stroke, so a
 * spatial query that lands inside the stroke — but outside the bare
 * centerline bbox — used to omit the element even though its copper
 * intersects the queried region.
 */
test("trace within query bounds through copper stroke", () => {
  const trace = mkTrace([
    { x: 0, y: 0, width: 1 },
    { x: 10, y: 0, width: 1 },
  ])

  // Bare centerline bounds: y spans just [0, 0].
  expect(getPcbElementBounds(trace)).toEqual({
    minX: 0,
    minY: 0,
    maxX: 10,
    maxY: 0,
  })
  // Copper bounds grow by strokeWidth/2 in every direction.
  expect(getPcbElementCopperBounds(trace)).toEqual({
    minX: -0.5,
    minY: -0.5,
    maxX: 10.5,
    maxY: 0.5,
  })

  const hits = getPcbElementsWithinBounds([trace], {
    minX: 4,
    maxX: 6,
    minY: 0.3,
    maxY: 0.4,
  })
  expect(hits).toHaveLength(1)
  expect(hits[0]?.type).toBe("pcb_trace")
})

test("trace reported when only its round end cap reaches the region", () => {
  const trace = mkTrace([{ x: 0, y: 0, width: 0.8 }])

  // Round cap copper extends to x in [-0.4, 0.4], y in [-0.4, 0.4].
  const hits = getPcbElementsWithinBounds([trace], {
    minX: -0.35,
    maxX: -0.2,
    minY: -0.1,
    maxY: 0.1,
  })
  expect(hits).toHaveLength(1)
})

test("query fully outside the copper still omits the trace", () => {
  const trace = mkTrace([
    { x: 0, y: 0, width: 1 },
    { x: 10, y: 0, width: 1 },
  ])

  const missed = getPcbElementsWithinBounds([trace], {
    minX: 4,
    maxX: 6,
    minY: 0.6,
    maxY: 0.8,
  })
  expect(missed).toHaveLength(0)
})

test("unrouted elements are unaffected", () => {
  const pad: AnyCircuitElement = {
    type: "pcb_smtpad",
    pcb_smtpad_id: "pad1",
    x: 5,
    y: 5,
    width: 2,
    height: 2,
    layer: "top",
    shape: "rect",
  } as any

  // Bare bounds [4..6] x [4..6]: inside this query it still hits.
  expect(
    getPcbElementsWithinBounds([pad], { minX: 5, maxX: 6, minY: 5, maxY: 6 }),
  ).toHaveLength(1)
  // And just outside it, it still misses (no extra stroke tail applied).
  expect(
    getPcbElementsWithinBounds([pad], { minX: 7, maxX: 8, minY: 5, maxY: 6 }),
  ).toHaveLength(0)
})

test("multilayer trace widths are taken from the widest wire", () => {
  const trace = mkTrace([
    { x: 0, y: 0, width: 0.5 },
    { x: 10, y: 0, width: 2 }, // wider segment
  ])

  expect(getPcbElementCopperBounds(trace)).toEqual({
    minX: -1,
    minY: -1,
    maxX: 11,
    maxY: 1,
  })
})
