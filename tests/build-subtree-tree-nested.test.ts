import type { AnyCircuitElement } from "circuit-json"
import { buildSubtree } from "../lib/subtree"
import { test, expect } from "bun:test"

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

  expect(tree).toMatchInlineSnapshot(`
  {
    "children": [
      {
        "children": [
          {
            "member_source_group_ids": [
              "g2",
            ],
            "source_group_id": "g1",
            "type": "source_group",
          },
          {
            "ftype": "simple_resistor",
            "name": "R1",
            "resistance": 1000,
            "source_component_id": "sc1",
            "source_group_id": "g1",
            "supplier_part_numbers": {},
            "type": "source_component",
          },
        ],
        "node_type": "group",
        "source_group_id": "g1",
      },
      {
        "children": [
          {
            "source_group_id": "g2",
            "type": "source_group",
          },
          {
            "capacitance": 0.000001,
            "ftype": "simple_capacitor",
            "name": "C1",
            "source_component_id": "sc2",
            "source_group_id": "g2",
            "supplier_part_numbers": {},
            "type": "source_component",
          },
        ],
        "node_type": "group",
        "source_group_id": "g2",
      },
      {
        "children": [
          {
            "center": {
              "x": 0,
              "y": 0,
            },
            "height": 1,
            "layer": "top",
            "pcb_component_id": "pc1",
            "rotation": 0,
            "source_component_id": "sc1",
            "type": "pcb_component",
            "width": 1,
          },
          {
            "pcb_component_id": "pc1",
            "pcb_trace_id": "pt1",
            "route": [],
            "type": "pcb_trace",
          },
        ],
        "node_type": "component",
        "pcb_component_id": "pc1",
      },
      {
        "children": [
          {
            "center": {
              "x": 1,
              "y": 1,
            },
            "height": 1,
            "layer": "top",
            "pcb_component_id": "pc2",
            "rotation": 0,
            "source_component_id": "sc2",
            "type": "pcb_component",
            "width": 1,
          },
          {
            "pcb_component_id": "pc2",
            "pcb_trace_id": "pt2",
            "route": [],
            "type": "pcb_trace",
          },
        ],
        "node_type": "component",
        "pcb_component_id": "pc2",
      },
    ],
    "node_type": "group",
    "source_group_id": "g1",
  }
  `)
})
