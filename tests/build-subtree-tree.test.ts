import type { AnyCircuitElement } from "circuit-json"
import { buildSubtree } from "../lib/subtree"
import { test, expect } from "bun:test"

test("buildSubtree returns tree", () => {
  const soup: AnyCircuitElement[] = [
    { type: "source_group", source_group_id: "g1" } as any,
    {
      type: "source_component",
      source_component_id: "sc1",
      name: "C1",
      supplier_part_numbers: {},
      ftype: "simple_resistor",
      resistance: 1000,
      source_group_id: "g1",
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
      type: "pcb_trace",
      pcb_trace_id: "pt1",
      pcb_component_id: "pc1",
      route: [],
    } as any,
  ]

  const { tree, elements } = buildSubtree(soup, { source_group_id: "g1" })

  expect(elements.length).toBe(4)
  expect(tree.children.length).toBeGreaterThan(0)
  const groupNode = tree.children.find(
    (c: any) => c.node_type === "group",
  ) as any
  expect(groupNode.node_type).toBe("group")
  expect(groupNode.children.length).toBeGreaterThan(0)
})
