import type { AnyCircuitElement } from "circuit-json"
import { cju } from "../index"
import { expect, test } from "bun:test"

test("insertAll inserts multiple elements with generated ids", () => {
  const soup: AnyCircuitElement[] = [
    {
      type: "source_component",
      source_component_id: "source_component_0",
      name: "R1",
      supplier_part_numbers: {},
      ftype: "simple_resistor",
      resistance: 10_000,
    },
  ]

  const inserted = cju(soup).insertAll([
    {
      type: "source_port",
      source_component_id: "source_component_0",
      name: "left",
    } as any,
    {
      type: "source_port",
      source_component_id: "source_component_0",
      name: "right",
    } as any,
  ])

  expect(inserted).toHaveLength(2)
  expect(inserted[0]).toMatchObject({
    type: "source_port",
    source_port_id: "source_port_0",
    name: "left",
  })
  expect(inserted[1]).toMatchObject({
    type: "source_port",
    source_port_id: "source_port_1",
    name: "right",
  })

  expect(cju(soup).source_port.get("source_port_0")).toBeTruthy()
  expect(cju(soup).source_port.get("source_port_1")).toBeTruthy()
})
