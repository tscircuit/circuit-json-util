import { expect, test } from "bun:test"
import { type AnyCircuitElement, pcb_trace } from "circuit-json"
import { convertCircuitJsonToPcbSvg } from "circuit-to-svg"
import {
  getPcbElementBounds,
  getPcbElementsWithinBounds,
} from "../lib/get-bounds-of-pcb-elements"

for (const [name, points, query] of [
  [
    "horizontal",
    [
      [0, 0],
      [10, 0],
    ],
    { minX: 4, maxX: 6, minY: 0.3, maxY: 0.4 },
  ],
  [
    "reversed",
    [
      [10, 0],
      [0, 0],
    ],
    { minX: 4, maxX: 6, minY: -0.4, maxY: -0.3 },
  ],
  [
    "vertical",
    [
      [0, 0],
      [0, 10],
    ],
    { minX: 0.3, maxX: 0.4, minY: 4, maxY: 6 },
  ],
] as const) {
  test(`${name} trace remains selectable when only its stroke intersects`, () => {
    const trace = pcb_trace.parse({
      type: "pcb_trace",
      pcb_trace_id: "trace",
      route: points.map(([x, y]) => ({
        x,
        y,
        width: 1,
        layer: "top",
        route_type: "wire",
      })),
    })
    const selected = getPcbElementsWithinBounds([trace], query)
    expect(selected).toEqual([trace])
    expect(convertCircuitJsonToPcbSvg(selected)).toContain('class="pcb-trace"')
  })
}

test("stroke boundary is inclusive and distant region is excluded", () => {
  const trace = pcb_trace.parse({
    type: "pcb_trace",
    pcb_trace_id: "trace",
    route: [
      { x: 0, y: 0, width: 1, layer: "top", route_type: "wire" },
      { x: 10, y: 0, width: 1, layer: "top", route_type: "wire" },
    ],
  })
  expect(getPcbElementBounds(trace)).toEqual({
    minX: -0.5,
    minY: -0.5,
    maxX: 10.5,
    maxY: 0.5,
  })
  expect(
    getPcbElementsWithinBounds([trace], {
      minX: 4,
      maxX: 6,
      minY: 0.5,
      maxY: 0.5,
    }),
  ).toEqual([trace])
  expect(
    getPcbElementsWithinBounds([trace], {
      minX: 4,
      maxX: 6,
      minY: 0.6,
      maxY: 0.7,
    }),
  ).toEqual([])
})

test("stepped trace widths follow each segment's starting wire", () => {
  const trace = pcb_trace.parse({
    type: "pcb_trace",
    pcb_trace_id: "trace",
    route: [
      { x: 0, y: 0, width: 2, layer: "top", route_type: "wire" },
      { x: 10, y: 0, width: 0.2, layer: "top", route_type: "wire" },
      { x: 10, y: 10, width: 8, layer: "top", route_type: "wire" },
    ],
  })
  expect(getPcbElementBounds(trace)).toEqual({
    minX: -1,
    minY: -1,
    maxX: 11,
    maxY: 10.1,
  })
  const svg = convertCircuitJsonToPcbSvg([trace])
  const paths = [...svg.matchAll(/<path class="pcb-trace"[^>]*>/g)].map(
    ([path]) => path,
  )
  expect(paths).toHaveLength(2)
  const widths = paths.map((path) =>
    Number(path.match(/stroke-width="([^"]+)"/)?.[1]),
  )
  expect(widths[0]! / widths[1]!).toBeCloseTo(10)
})

test("round end caps remain within selectable bounds", () => {
  const trace = pcb_trace.parse({
    type: "pcb_trace",
    pcb_trace_id: "trace",
    route: [
      { x: 0, y: 0, width: 1, layer: "top", route_type: "wire" },
      { x: 10, y: 0, width: 1, layer: "top", route_type: "wire" },
    ],
  })
  const selected = getPcbElementsWithinBounds([trace], {
    minX: 10.3,
    maxX: 10.4,
    minY: -0.1,
    maxY: 0.1,
  })
  expect(selected).toEqual([trace])
  expect(convertCircuitJsonToPcbSvg(selected)).toContain(
    'stroke-linecap="round"',
  )
})

test("mixed wire and via routes include wire segment stroke bounds", () => {
  const trace = pcb_trace.parse({
    type: "pcb_trace",
    pcb_trace_id: "trace_with_via",
    route: [
      { x: 0, y: 0, width: 1, layer: "top", route_type: "wire" },
      { x: 5, y: 0, width: 1, layer: "top", route_type: "wire" },
      { x: 5, y: 0, from_layer: "top", to_layer: "bottom", route_type: "via" },
      { x: 5, y: 0, width: 0.6, layer: "bottom", route_type: "wire" },
      { x: 5, y: 8, width: 0.6, layer: "bottom", route_type: "wire" },
    ],
  })
  expect(getPcbElementBounds(trace)).toEqual({
    minX: -0.5,
    minY: -0.5,
    maxX: 5.5,
    maxY: 8.3,
  })
})

test("interpolated thickness routes include both endpoint radii", () => {
  const trace = pcb_trace.parse({
    type: "pcb_trace",
    pcb_trace_id: "interpolated_trace",
    route_thickness_mode: "interpolated",
    route: [
      { x: 0, y: 0, width: 1, layer: "top", route_type: "wire" },
      { x: 10, y: 0, width: 3, layer: "top", route_type: "wire" },
    ],
  })
  expect(getPcbElementBounds(trace)).toEqual({
    minX: -0.5,
    minY: -1.5,
    maxX: 11.5,
    maxY: 1.5,
  })
})

test("incomplete routes retain the existing fallback instead of throwing", () => {
  for (const route of [undefined, null, {}, [null]]) {
    const trace = { type: "pcb_trace", route } as unknown as AnyCircuitElement
    expect(getPcbElementBounds(trace)).toBeNull()
  }
})

test("wire coordinates without widths retain centerline bounds", () => {
  const trace = {
    type: "pcb_trace",
    route: [
      { route_type: "wire", x: 0, y: 0 },
      { route_type: "wire", x: 10, y: 0 },
    ],
  } as unknown as AnyCircuitElement
  expect(getPcbElementBounds(trace)).toEqual({
    minX: 0,
    minY: 0,
    maxX: 10,
    maxY: 0,
  })
})

test("duplicate points do not expand bounds with an undrawn segment's width", () => {
  const trace = pcb_trace.parse({
    type: "pcb_trace",
    pcb_trace_id: "trace",
    route: [
      { route_type: "wire", x: 0, y: 0, width: 8, layer: "top" },
      { route_type: "wire", x: 0, y: 0, width: 1, layer: "top" },
      { route_type: "wire", x: 10, y: 0, width: 1, layer: "top" },
    ],
  })
  expect(getPcbElementBounds(trace)).toEqual({
    minX: -0.5,
    minY: -0.5,
    maxX: 10.5,
    maxY: 0.5,
  })
  const svg = convertCircuitJsonToPcbSvg([trace])
  expect([...svg.matchAll(/<path class="pcb-trace"[^>]*>/g)]).toHaveLength(1)
})
