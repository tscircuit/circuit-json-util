import { test, expect } from "bun:test"
import type { CircuitJson } from "circuit-json"
import { moveSchematicElement } from "../index"

test("move schematic component also moves ports", () => {
  const db: CircuitJson = [
    {
      type: "schematic_component",
      schematic_component_id: "sc_0",
      source_component_id: "src_0",
      size: { width: 10, height: 10 },
      center: { x: 0, y: 0 },
    } as any,
    {
      type: "schematic_port",
      schematic_port_id: "sp_0",
      source_port_id: "sp0",
      schematic_component_id: "sc_0",
      center: { x: 1, y: 1 },
    } as any,
  ]

  moveSchematicElement("sc_0", db, { x: 5, y: 5 })

  const comp = db.find(e => (e as any).schematic_component_id === "sc_0" && e.type === "schematic_component") as any
  const port = db.find(e => (e as any).schematic_port_id === "sp_0") as any
  expect(comp.center).toEqual({ x: 5, y: 5 })
  expect(port.center).toEqual({ x: 6, y: 6 })
})

test("move schematic port only", () => {
  const db: CircuitJson = [
    {
      type: "schematic_port",
      schematic_port_id: "sp_1",
      source_port_id: "sp1",
      center: { x: 0, y: 0 },
    } as any,
  ]
  moveSchematicElement("sp_1", db, { x: 2, y: 3 })
  const port = db[0] as any
  expect(port.center).toEqual({ x: 2, y: 3 })
})
