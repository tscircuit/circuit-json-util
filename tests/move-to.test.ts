import type { AnyCircuitElement } from "circuit-json"
import { cju } from "../index"
import { test, expect } from "bun:test"

test("move schematic component", () => {
  const soup: AnyCircuitElement[] = [
    {
      type: "source_component",
      source_component_id: "src1",
      name: "SC",
    },
    {
      type: "source_port",
      source_port_id: "sp1",
      source_component_id: "src1",
      name: "p1",
    },
    {
      type: "schematic_component",
      schematic_component_id: "sc1",
      source_component_id: "src1",
      size: { width: 1, height: 1 },
      center: { x: 0, y: 0 },
    },
    {
      type: "schematic_port",
      schematic_port_id: "scp1",
      source_port_id: "sp1",
      schematic_component_id: "sc1",
      center: { x: 1, y: 0 },
    },
    {
      type: "schematic_text",
      schematic_text_id: "st1",
      schematic_component_id: "sc1",
      text: "hi",
      position: { x: 0, y: -1 },
      rotation: 0,
    },
  ]

  cju(soup).schematic_component.moveTo("sc1", { x: 5, y: 5 })

  const sc = cju(soup).schematic_component.get("sc1")!
  const sp = cju(soup).schematic_port.get("scp1")!
  const st = cju(soup).schematic_text.get("st1")!

  expect(sc.center).toEqual({ x: 5, y: 5 })
  expect(sp.center).toEqual({ x: 6, y: 5 })
  expect(st.position).toEqual({ x: 5, y: 4 })
})
