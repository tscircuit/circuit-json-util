import type { AnyCircuitElement } from "circuit-json"
import { buildSubtree } from "../lib/subtree"
import { test, expect } from "bun:test"
import { stringifyCircuitJsonTree } from "lib/stringifyCircuitJsonTree"

test("buildSubtree returns nested tree snapshot", () => {
  const soup: AnyCircuitElement[] = [
    {
      type: "source_group",
      source_group_id: "g1",
      member_source_group_ids: ["g2"],
    } as any,
    { type: "source_group", source_group_id: "g2" } as any,
    {
      type: "source_component",
      source_component_id: "sc1",
      name: "R1",
      supplier_part_numbers: {},
      ftype: "simple_resistor",
      resistance: 1000,
      source_group_id: "g1",
    } as any,
    {
      type: "source_component",
      source_component_id: "sc2",
      name: "C1",
      supplier_part_numbers: {},
      ftype: "simple_capacitor",
      capacitance: 1e-6,
      source_group_id: "g2",
    } as any,
    {
      type: "pcb_component",
      pcb_component_id: "pc1",
      source_component_id: "sc1",
      layer: "top",
      center: { x: 0, y: 0 },
      rotation: 0,
      width: 1,
      height: 1,
    } as any,
    {
      type: "pcb_component",
      pcb_component_id: "pc2",
      source_component_id: "sc2",
      layer: "top",
      center: { x: 1, y: 1 },
      rotation: 0,
      width: 1,
      height: 1,
    } as any,
    {
      type: "pcb_trace",
      pcb_trace_id: "pt1",
      pcb_component_id: "pc1",
      route: [],
    } as any,
    {
      type: "pcb_trace",
      pcb_trace_id: "pt2",
      pcb_component_id: "pc2",
      route: [],
    } as any,
  ]

  const { tree } = buildSubtree(soup, { source_group_id: "g1" })

  expect(stringifyCircuitJsonTree(tree)).toMatchInlineSnapshot()
})
