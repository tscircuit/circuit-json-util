import type { AnyCircuitElement } from "circuit-json"
import { cju, cjuIndexed } from "../index"
import { test, expect } from "bun:test"

test("cju editCount increments correctly", () => {
  const soup: AnyCircuitElement[] = [
    {
      type: "source_component",
      source_component_id: "sc1",
      name: "R1",
      ftype: "simple_resistor",
      resistance: 100,
    },
  ]

  const su = cju(soup)
  expect(su.editCount).toBe(0)
  expect((su.toArray() as unknown as { editCount: number }).editCount).toBe(0)

  // Insert
  su.source_port.insert({
    name: "left",
    source_component_id: "sc1",
  })
  expect(su.editCount).toBe(1)
  expect((su.toArray() as unknown as { editCount: number }).editCount).toBe(1)

  // Update
  su.source_component.update("sc1", { resistance: 200 })
  expect(su.editCount).toBe(2)
  expect((su.toArray() as unknown as { editCount: number }).editCount).toBe(2)

  // Delete
  su.source_port.delete("source_port_0")
  expect(su.editCount).toBe(3)
  expect((su.toArray() as unknown as { editCount: number }).editCount).toBe(3)

  // Get should not increment
  su.source_component.get("sc1")
  expect(su.editCount).toBe(3)

  // List should not increment
  su.source_component.list()
  expect(su.editCount).toBe(3)

  // toArray should not increment
  su.toArray()
  expect(su.editCount).toBe(3)
})

test("cjuIndexed editCount increments correctly", () => {
  const soup: AnyCircuitElement[] = [
    {
      type: "source_component",
      source_component_id: "sc1",
      name: "R1",
      ftype: "simple_resistor",
      resistance: 100,
    },
  ]

  const su = cjuIndexed(soup, {
    indexConfig: { byId: true, byType: true },
  })
  expect(su.editCount).toBe(0)
  expect((su.toArray() as unknown as { editCount: number }).editCount).toBe(0)

  // Insert
  su.source_port.insert({
    name: "left",
    source_component_id: "sc1",
  })
  expect(su.editCount).toBe(1)
  expect((su.toArray() as unknown as { editCount: number }).editCount).toBe(1)

  // Update
  su.source_component.update("sc1", { resistance: 200 })
  expect(su.editCount).toBe(2)
  expect((su.toArray() as unknown as { editCount: number }).editCount).toBe(2)

  // Delete
  su.source_port.delete("source_port_0")
  expect(su.editCount).toBe(3)
  expect((su.toArray() as unknown as { editCount: number }).editCount).toBe(3)

  // Get should not increment
  su.source_component.get("sc1")
  expect(su.editCount).toBe(3)

  // List should not increment
  su.source_component.list()
  expect(su.editCount).toBe(3)

  // toArray should not increment
  su.toArray()
  expect(su.editCount).toBe(3)
})
