import type { AnyCircuitElement } from "circuit-json"
import { cju } from "../index"
import { test, expect } from "bun:test"

test("subtree by source group", () => {
  const soup: AnyCircuitElement[] = [
    {
      type: "source_group",
      source_group_id: "g1",
    } as unknown as AnyCircuitElement,
    {
      type: "source_trace",
      source_trace_id: "st1",
      source_group_id: "g1",
      connected_source_port_ids: [],
      connected_source_net_ids: [],
    } as unknown as AnyCircuitElement,
    {
      type: "schematic_trace",
      schematic_trace_id: "sct1",
      source_trace_id: "st1",
      junctions: [],
      edges: [],
    } as unknown as AnyCircuitElement,
    {
      type: "pcb_trace",
      pcb_trace_id: "pt1",
      source_trace_id: "st1",
      route: [],
    } as unknown as AnyCircuitElement,
    {
      type: "source_group",
      source_group_id: "g2",
    } as unknown as AnyCircuitElement,
    {
      type: "source_trace",
      source_trace_id: "st2",
      source_group_id: "g2",
      connected_source_port_ids: [],
      connected_source_net_ids: [],
    } as unknown as AnyCircuitElement,
  ]

  const st = cju(soup).subtree({ source_group_id: "g1" })
  const result = st.toArray()

  expect(result.length).toBe(4)
  expect(st.schematic_trace.get("sct1")).toBeTruthy()
  expect(st.source_trace.list().length).toBe(1)
})
