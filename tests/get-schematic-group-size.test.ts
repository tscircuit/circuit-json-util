import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { getSchematicGroupSize } from "../lib/get-schematic-group-size"

const makeCircuitJsonWithGroup = (): AnyCircuitElement[] => [
  {
    type: "source_group",
    source_group_id: "g1",
  } as any,
  {
    type: "source_group",
    source_group_id: "g2",
    parent_source_group_id: "g1",
  } as any,
  {
    type: "schematic_group",
    schematic_group_id: "sg1",
    source_group_id: "g1",
    center: { x: 100, y: 100 },
    width: 0,
    height: 0,
  } as any,
  {
    type: "schematic_group",
    schematic_group_id: "sg2",
    source_group_id: "g2",
    center: { x: 100, y: 100 },
    width: 0,
    height: 0,
  } as any,
  {
    type: "schematic_component",
    schematic_component_id: "sc1",
    source_component_id: "source_component_1",
    schematic_group_id: "sg1",
    center: { x: 0, y: 0 },
    width: 2,
    height: 2,
  } as any,
  {
    type: "schematic_component",
    schematic_component_id: "sc2",
    source_component_id: "source_component_2",
    schematic_group_id: "sg2",
    center: { x: 5, y: 0 },
    width: 4,
    height: 2,
  } as any,
  {
    type: "schematic_port",
    schematic_port_id: "sp1",
    schematic_component_id: "sc1",
    center: { x: -1, y: 0 },
  } as any,
  {
    type: "schematic_port",
    schematic_port_id: "sp2",
    schematic_component_id: "sc2",
    center: { x: 7, y: 0 },
  } as any,
  {
    type: "schematic_trace",
    schematic_trace_id: "st1",
    route: [
      { x: -1, y: 0, route_type: "wire", start_schematic_port_id: "sp1" },
      { x: 2, y: 4, route_type: "wire" },
      { x: 7, y: 0, route_type: "wire", end_schematic_port_id: "sp2" },
    ],
  } as any,
  {
    type: "schematic_component",
    schematic_component_id: "sc3",
    schematic_group_id: "outside",
    center: { x: 40, y: 40 },
    width: 10,
    height: 10,
  } as any,
]

test("getSchematicGroupSize returns bounds for source group children", () => {
  const result = getSchematicGroupSize(makeCircuitJsonWithGroup(), "g1")

  expect(result.center.x).toBeCloseTo(3, 5)
  expect(result.center.y).toBeCloseTo(1.525, 5)
  expect(result.width).toBeCloseTo(8.1, 5)
  expect(result.height).toBeCloseTo(5.05, 5)
})

test("getSchematicGroupSize accepts schematic_group_id", () => {
  const result = getSchematicGroupSize(makeCircuitJsonWithGroup(), "sg1")

  expect(result.center.x).toBeCloseTo(3, 5)
  expect(result.center.y).toBeCloseTo(1.525, 5)
  expect(result.width).toBeCloseTo(8.1, 5)
  expect(result.height).toBeCloseTo(5.05, 5)
})

test("getSchematicGroupSize handles empty or missing groups", () => {
  const circuitJson: AnyCircuitElement[] = [
    { type: "source_group", source_group_id: "empty" } as any,
    {
      type: "schematic_component",
      schematic_component_id: "outside",
      center: { x: 10, y: 10 },
      width: 2,
      height: 2,
    } as any,
  ]

  expect(getSchematicGroupSize(circuitJson, "empty")).toEqual({
    center: { x: 0, y: 0 },
    width: 0,
    height: 0,
  })
  expect(getSchematicGroupSize(circuitJson, "missing")).toEqual({
    center: { x: 0, y: 0 },
    width: 0,
    height: 0,
  })
})
