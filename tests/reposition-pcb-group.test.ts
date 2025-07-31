import type { AnyCircuitElement } from "circuit-json"
import { repositionPcbGroupTo } from "../lib/reposition-pcb-group"
import { test, expect } from "bun:test"

const makeSoupWithGroup = (): AnyCircuitElement[] => [
  {
    type: "source_group",
    source_group_id: "g1",
  } as any,
  {
    type: "source_group",
    source_group_id: "g2",
    parent_source_group_id: "g1", // nested group
  } as any,
  {
    type: "pcb_component",
    pcb_component_id: "pc1",
    source_component_id: "sc1",
    source_group_id: "g1",
    center: { x: 0, y: 0 },
    layer: "top",
    rotation: 0,
    width: 2,
    height: 2,
  } as any,
  {
    type: "pcb_component",
    pcb_component_id: "pc2",
    source_component_id: "sc2",
    source_group_id: "g2", // component in nested group
    center: { x: 5, y: 0 },
    layer: "top",
    rotation: 0,
    width: 2,
    height: 2,
  } as any,
  {
    type: "pcb_port",
    pcb_port_id: "pp1",
    pcb_component_id: "pc1",
    source_port_id: "sp1",
    x: 0,
    y: 0,
    layers: ["top"],
  } as any,
  {
    type: "pcb_port",
    pcb_port_id: "pp2",
    pcb_component_id: "pc2",
    source_port_id: "sp2",
    x: 5,
    y: 0,
    layers: ["top"],
  } as any,
  {
    type: "pcb_smtpad",
    pcb_smtpad_id: "pad1",
    pcb_port_id: "pp1",
    x: 0,
    y: 0,
    width: 1,
    height: 1,
    layer: "top",
    shape: "rect",
  } as any,
  {
    type: "pcb_smtpad",
    pcb_smtpad_id: "pad2",
    pcb_port_id: "pp2",
    x: 5,
    y: 0,
    width: 1,
    height: 1,
    layer: "top",
    shape: "rect",
  } as any,
  {
    type: "pcb_trace",
    pcb_trace_id: "t1",
    route: [
      {
        x: 0,
        y: 0,
        width: 1,
        layer: "top",
        route_type: "wire",
        start_pcb_port_id: "pp1",
      },
      {
        x: 5,
        y: 0,
        width: 1,
        layer: "top",
        route_type: "wire",
        end_pcb_port_id: "pp2",
      },
    ],
  } as any,
  {
    type: "pcb_component",
    pcb_component_id: "pc3",
    source_component_id: "sc3",
    // not in any group - should not move
    center: { x: 10, y: 10 },
    layer: "top",
    rotation: 0,
    width: 2,
    height: 2,
  } as any,
]

test("repositionPcbGroupTo moves group elements and deep children", () => {
  const soup = makeSoupWithGroup()

  // Original positions: pc1 at (0,0), pc2 at (5,0), group center should be around (2.5, 0)
  // Move group to center at (20, 15)
  repositionPcbGroupTo(soup, "g1", { x: 20, y: 15 })

  const comp1 = soup.find((e) => (e as any).pcb_component_id === "pc1") as any
  const comp2 = soup.find((e) => (e as any).pcb_component_id === "pc2") as any
  const comp3 = soup.find((e) => (e as any).pcb_component_id === "pc3") as any
  const port1 = soup.find((e) => (e as any).pcb_port_id === "pp1") as any
  const port2 = soup.find((e) => (e as any).pcb_port_id === "pp2") as any
  const pad1 = soup.find((e) => (e as any).pcb_smtpad_id === "pad1") as any
  const pad2 = soup.find((e) => (e as any).pcb_smtpad_id === "pad2") as any
  const trace = soup.find((e) => e.type === "pcb_trace") as any

  // Components in group should be moved
  expect(comp1.center.x).toBeCloseTo(17.5, 1) // moved from 0 to 17.5 (20 - 2.5)
  expect(comp1.center.y).toBeCloseTo(15, 1)   // moved from 0 to 15

  expect(comp2.center.x).toBeCloseTo(22.5, 1) // moved from 5 to 22.5 (20 + 2.5)
  expect(comp2.center.y).toBeCloseTo(15, 1)   // moved from 0 to 15

  // Component not in group should remain unchanged
  expect(comp3.center).toEqual({ x: 10, y: 10 })

  // Ports should move with their components
  expect(port1.x).toBeCloseTo(17.5, 1)
  expect(port1.y).toBeCloseTo(15, 1)
  expect(port2.x).toBeCloseTo(22.5, 1)
  expect(port2.y).toBeCloseTo(15, 1)

  // Pads should move with their ports
  expect(pad1.x).toBeCloseTo(17.5, 1)
  expect(pad1.y).toBeCloseTo(15, 1)
  expect(pad2.x).toBeCloseTo(22.5, 1)
  expect(pad2.y).toBeCloseTo(15, 1)

  // Trace route points should move
  expect(trace.route[0].x).toBeCloseTo(17.5, 1)
  expect(trace.route[0].y).toBeCloseTo(15, 1)
  expect(trace.route[1].x).toBeCloseTo(22.5, 1)
  expect(trace.route[1].y).toBeCloseTo(15, 1)
})

test("repositionPcbGroupTo handles empty group", () => {
  const soup: AnyCircuitElement[] = [
    {
      type: "source_group",
      source_group_id: "empty_group",
    } as any,
    {
      type: "pcb_component",
      pcb_component_id: "pc1",
      center: { x: 0, y: 0 },
      layer: "top",
      rotation: 0,
      width: 2,
      height: 2,
    } as any,
  ]

  // Should not throw error or modify anything
  repositionPcbGroupTo(soup, "empty_group", { x: 10, y: 10 })
  
  const comp = soup.find((e) => e.type === "pcb_component") as any
  expect(comp.center).toEqual({ x: 0, y: 0 })
})

test("repositionPcbGroupTo handles nonexistent group", () => {
  const soup: AnyCircuitElement[] = [
    {
      type: "pcb_component",
      pcb_component_id: "pc1",
      center: { x: 0, y: 0 },
      layer: "top",
      rotation: 0,
      width: 2,
      height: 2,
    } as any,
  ]

  // Should not throw error or modify anything
  repositionPcbGroupTo(soup, "nonexistent", { x: 10, y: 10 })
  
  const comp = soup.find((e) => e.type === "pcb_component") as any
  expect(comp.center).toEqual({ x: 0, y: 0 })
})