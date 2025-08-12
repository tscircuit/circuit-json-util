import type { AnyCircuitElement } from "circuit-json"
import { repositionSchematicGroupTo } from "../lib/reposition-schematic-group"
import { test, expect } from "bun:test"

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
    type: "schematic_component",
    schematic_component_id: "sc1",
    source_component_id: "scomp1",
    source_group_id: "g1",
    center: { x: 0, y: 0 },
    width: 2,
    height: 2,
  } as any,
  {
    type: "schematic_component",
    schematic_component_id: "sc2",
    source_component_id: "scomp2",
    source_group_id: "g2",
    center: { x: 5, y: 0 },
    width: 2,
    height: 2,
  } as any,
  {
    type: "schematic_port",
    schematic_port_id: "sp1",
    schematic_component_id: "sc1",
    center: { x: 0, y: 0 },
  } as any,
  {
    type: "schematic_port",
    schematic_port_id: "sp2",
    schematic_component_id: "sc2",
    center: { x: 5, y: 0 },
  } as any,
  {
    type: "schematic_text",
    schematic_text_id: "txt1",
    position: { x: 0, y: 0 },
    text: "t1",
    schematic_component_id: "sc1",
  } as any,
  {
    type: "schematic_trace",
    schematic_trace_id: "t1",
    route: [
      {
        x: 0,
        y: 0,
        route_type: "wire",
        start_schematic_port_id: "sp1",
      },
      {
        x: 5,
        y: 0,
        route_type: "wire",
        end_schematic_port_id: "sp2",
      },
    ],
  } as any,
  {
    type: "schematic_component",
    schematic_component_id: "sc3",
    center: { x: 10, y: 10 },
    width: 2,
    height: 2,
  } as any,
]

test("repositionSchematicGroupTo moves group elements and deep children", () => {
  const circuitJson = makeCircuitJsonWithGroup()

  repositionSchematicGroupTo(circuitJson, "g1", { x: 20, y: 15 })

  const comp1 = circuitJson.find(
    (e) => (e as any).schematic_component_id === "sc1",
  ) as any
  const comp2 = circuitJson.find(
    (e) => (e as any).schematic_component_id === "sc2",
  ) as any
  const comp3 = circuitJson.find(
    (e) => (e as any).schematic_component_id === "sc3",
  ) as any
  const port1 = circuitJson.find(
    (e) => (e as any).schematic_port_id === "sp1",
  ) as any
  const port2 = circuitJson.find(
    (e) => (e as any).schematic_port_id === "sp2",
  ) as any
  const text1 = circuitJson.find(
    (e) => (e as any).schematic_text_id === "txt1",
  ) as any
  const trace = circuitJson.find((e) => e.type === "schematic_trace") as any

  expect(comp1.center.x).toBeCloseTo(17.5, 1)
  expect(comp1.center.y).toBeCloseTo(15, 1)
  expect(comp2.center.x).toBeCloseTo(22.5, 1)
  expect(comp2.center.y).toBeCloseTo(15, 1)

  expect(comp3.center).toEqual({ x: 10, y: 10 })

  expect(port1.center.x).toBeCloseTo(17.5, 1)
  expect(port1.center.y).toBeCloseTo(15, 1)
  expect(port2.center.x).toBeCloseTo(22.5, 1)
  expect(port2.center.y).toBeCloseTo(15, 1)

  expect(text1.position.x).toBeCloseTo(17.5, 1)
  expect(text1.position.y).toBeCloseTo(15, 1)

  expect(trace.route[0].x).toBeCloseTo(17.5, 1)
  expect(trace.route[0].y).toBeCloseTo(15, 1)
  expect(trace.route[1].x).toBeCloseTo(22.5, 1)
  expect(trace.route[1].y).toBeCloseTo(15, 1)
})

test("repositionSchematicGroupTo handles empty group", () => {
  const circuitJson: AnyCircuitElement[] = [
    {
      type: "source_group",
      source_group_id: "empty_group",
    } as any,
    {
      type: "schematic_component",
      schematic_component_id: "sc1",
      center: { x: 0, y: 0 },
      width: 2,
      height: 2,
    } as any,
  ]

  repositionSchematicGroupTo(circuitJson, "empty_group", { x: 10, y: 10 })

  const comp = circuitJson.find((e) => e.type === "schematic_component") as any
  expect(comp.center).toEqual({ x: 0, y: 0 })
})

test("repositionSchematicGroupTo handles nonexistent group", () => {
  const circuitJson: AnyCircuitElement[] = [
    {
      type: "schematic_component",
      schematic_component_id: "sc1",
      center: { x: 0, y: 0 },
      width: 2,
      height: 2,
    } as any,
  ]

  repositionSchematicGroupTo(circuitJson, "nonexistent", { x: 10, y: 10 })

  const comp = circuitJson.find((e) => e.type === "schematic_component") as any
  expect(comp.center).toEqual({ x: 0, y: 0 })
})
