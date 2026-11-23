import type { AnyCircuitElement } from "circuit-json"
import { cju, cjuIndexed } from "../index"
import { test, expect } from "bun:test"

test("delete", () => {
  const soup: AnyCircuitElement[] = [
    {
      type: "source_component",
      source_component_id: "simple_resistor_0",
      name: "R1",
      supplier_part_numbers: {},
      ftype: "simple_resistor",
      resistance: 10_000,
    },
    {
      type: "source_port",
      name: "left",
      source_port_id: "source_port_0",
      source_component_id: "simple_resistor_0",
    },
  ]

  cju(soup).source_port.delete("source_port_0")

  const sp = cju(soup)
    .toArray()
    .find((e) => e.type === "source_port")

  expect(sp).toBeFalsy()
})

test("delete only removes elements matching component_type and not child elements referencing foreign key", () => {
  const soup: AnyCircuitElement[] = [
    {
      type: "source_port",
      name: "left",
      source_port_id: "source_port_0",
      source_component_id: "simple_resistor_0",
    },
    {
      type: "source_component",
      source_component_id: "simple_resistor_0",
      name: "R1",
      supplier_part_numbers: {},
      ftype: "simple_resistor",
      resistance: 10_000,
    },
  ]

  cju(soup).source_component.delete("simple_resistor_0")

  expect(soup.length).toBe(1)
  expect(soup[0]?.type).toBe("source_port")

  // Deleting again when already removed should not delete the remaining source_port
  cju(soup).source_component.delete("simple_resistor_0")
  expect(soup.length).toBe(1)

  // Unindexed cjuIndexed fallback should also check e.type === component_type
  cjuIndexed(soup, { indexConfig: {} }).source_component.delete(
    "simple_resistor_0",
  )
  expect(soup.length).toBe(1)
})
