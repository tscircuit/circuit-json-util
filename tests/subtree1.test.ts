import type { AnyCircuitElement } from "circuit-json"
import { cju } from "../index"
import { test, expect } from "bun:test"

test("subtree by subcircuit", () => {
  const soup: AnyCircuitElement[] = [
    {
      type: "source_component",
      source_component_id: "sc1",
      name: "S1",
      supplier_part_numbers: {},
      ftype: "simple_resistor",
      resistance: 1000,
      subcircuit_id: "sub1",
    },
    {
      type: "source_port",
      name: "p1",
      source_port_id: "sp1",
      source_component_id: "sc1",
    },
    {
      type: "pcb_component",
      pcb_component_id: "pc1",
      source_component_id: "sc1",
      center: { x: 0, y: 0 },
      layer: "top",
      rotation: 0,
      width: 1,
      height: 1,
      subcircuit_id: "sub1",
    },
    {
      type: "pcb_port",
      pcb_port_id: "pp1",
      source_port_id: "sp1",
      pcb_component_id: "pc1",
      x: 0,
      y: 0,
      layers: ["top"],
    },
    {
      type: "pcb_trace",
      pcb_trace_id: "pt1",
      pcb_component_id: "pc1",
      route: [],
    },
    {
      type: "source_component",
      source_component_id: "sc2",
      name: "S2",
      supplier_part_numbers: {},
      ftype: "simple_resistor",
      resistance: 2000,
      subcircuit_id: "sub2",
    },
  ]

  const st = cju(soup).subtree({ subcircuit_id: "sub1" })
  const result = st.toArray()

  expect(result.length).toBe(5)
  expect(st.pcb_trace.get("pt1")).toBeTruthy()
  expect(st.source_component.get("sc2")).toBeUndefined()
})
