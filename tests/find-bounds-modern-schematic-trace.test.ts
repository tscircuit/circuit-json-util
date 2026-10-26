import { expect, test } from "bun:test"
import { type AnyCircuitElement, schematic_trace } from "circuit-json"
import { findBoundsAndCenter } from "../lib/find-bounds-and-center"

const cases = [
  {
    name: "diagonal edges",
    edges: [{ from: { x: 0, y: 0 }, to: { x: 10, y: 4 } }],
    junctions: [],
    center: { x: 5, y: 2 },
    width: 10.1,
    height: 4.1,
  },
  {
    name: "vertical negative coordinates",
    edges: [{ from: { x: -4, y: -8 }, to: { x: -4, y: -2 } }],
    junctions: [],
    center: { x: -4, y: -5 },
    width: 0.1,
    height: 6.1,
  },
  {
    name: "disconnected edges",
    edges: [
      { from: { x: -5, y: 1 }, to: { x: -3, y: 1 } },
      { from: { x: 4, y: 6 }, to: { x: 7, y: 6 } },
    ],
    junctions: [],
    center: { x: 1, y: 3.5 },
    width: 12.1,
    height: 5.1,
  },
  {
    name: "junction outside edges",
    edges: [{ from: { x: 0, y: 0 }, to: { x: 2, y: 0 } }],
    junctions: [{ x: 8, y: 6 }],
    center: { x: 4, y: 3 },
    width: 8.1,
    height: 6.1,
  },
  {
    name: "junction only",
    edges: [],
    junctions: [{ x: -2, y: 3 }],
    center: { x: -2, y: 3 },
    width: 0.1,
    height: 0.1,
  },
  {
    name: "duplicate vertices",
    edges: [{ from: { x: 2, y: 4 }, to: { x: 2, y: 4 } }],
    junctions: [{ x: 2, y: 4 }],
    center: { x: 2, y: 4 },
    width: 0.1,
    height: 0.1,
  },
  {
    name: "empty modern trace",
    edges: [],
    junctions: [],
    center: { x: 0, y: 0 },
    width: 0,
    height: 0,
  },
]

for (const item of cases) {
  test(`findBoundsAndCenter measures ${item.name}`, () => {
    const trace = schematic_trace.parse({
      type: "schematic_trace",
      schematic_trace_id: "trace",
      edges: item.edges,
      junctions: item.junctions,
    })
    const before = structuredClone(trace)
    const result = findBoundsAndCenter([trace])
    expect(result.center.x).toBeCloseTo(item.center.x, 12)
    expect(result.center.y).toBeCloseTo(item.center.y, 12)
    expect(result.width).toBeCloseTo(item.width, 12)
    expect(result.height).toBeCloseTo(item.height, 12)
    expect(trace).toEqual(before)
  })
}

test("modern trace expands existing component bounds", () => {
  const trace = schematic_trace.parse({
    type: "schematic_trace",
    schematic_trace_id: "trace",
    edges: [{ from: { x: 0, y: 0 }, to: { x: 10, y: 4 } }],
    junctions: [],
  })
  const component = {
    type: "schematic_component",
    schematic_component_id: "component",
    center: { x: -4, y: 0 },
    size: { width: 2, height: 2 },
  } as AnyCircuitElement
  const result = findBoundsAndCenter([component, trace])
  expect(result.center.x).toBeCloseTo(2.525, 12)
  expect(result.center.y).toBeCloseTo(1.525, 12)
  expect(result.width).toBeCloseTo(15.05, 12)
  expect(result.height).toBeCloseTo(5.05, 12)
})

for (const type of ["pcb_trace", "schematic_trace"]) {
  test(`legacy ${type} route points retain existing bounds`, () => {
    const legacy = {
      type,
      route: [
        { x: 0, y: 0 },
        { x: 2, y: 4 },
      ],
    } as unknown as AnyCircuitElement
    const result = findBoundsAndCenter([legacy])
    expect(result.center.x).toBeCloseTo(1, 12)
    expect(result.center.y).toBeCloseTo(2, 12)
    expect(result.width).toBeCloseTo(2.1, 12)
    expect(result.height).toBeCloseTo(4.1, 12)
  })
}

test("empty circuit remains zero sized", () => {
  expect(findBoundsAndCenter([])).toEqual({
    center: { x: 0, y: 0 },
    width: 0,
    height: 0,
  })
})
