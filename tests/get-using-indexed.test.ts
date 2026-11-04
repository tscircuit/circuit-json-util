import { expect, test } from "bun:test"
import { source_simple_resistor, type AnyCircuitElement } from "circuit-json"
import { cju, cjuIndexed } from "../index"

test.each([
  { byRelation: true },
  { byRelation: true, byId: true },
  { byRelation: true, byType: true },
  { byRelation: true, byId: true, byType: true },
])("getUsing resolves the joiner with indexes %j", (indexConfig) => {
  const component = source_simple_resistor.parse({
    type: "source_component",
    source_component_id: "source_component_0",
    name: "R1",
    supplier_part_numbers: {},
    ftype: "simple_resistor",
    resistance: 10000,
  })
  const soup: AnyCircuitElement[] = [
    component,
    {
      type: "pcb_component",
      pcb_component_id: "pcb_component_0",
      source_component_id: component.source_component_id,
      center: { x: 0, y: 0 },
      width: 5,
      height: 2,
      layer: "top",
      rotation: 0,
      obstructs_within_bounds: false,
    },
    {
      type: "pcb_port",
      pcb_port_id: "pcb_port_0",
      pcb_component_id: "pcb_component_0",
      source_port_id: "source_port_0",
      x: 0,
      y: 0,
      layers: ["top"],
    },
  ]
  const regular = cju(soup)
  const indexed = cjuIndexed(soup, { indexConfig })
  const using = { pcb_component_id: "pcb_component_0" }

  expect(regular.source_component.getUsing(using)).toBe(component)
  expect(indexed.source_component.getUsing(using)).toBe(component)
  expect(
    indexed.source_component.getUsing({ pcb_component_id: "missing" }),
  ).toBeNull()
})
