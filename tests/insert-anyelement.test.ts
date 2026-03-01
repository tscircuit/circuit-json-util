import type { AnyCircuitElement } from "circuit-json"
import { cju } from "../index"
import { expect, test } from "bun:test"

test("insert any element via cju(elms).insert", () => {
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

  const insertedSourcePort = cju(soup).insert({
    type: "source_port",
    source_component_id: "source_component_0",
    name: "left",
  } as any)

  expect(insertedSourcePort.type).toBe("source_port")
  expect((insertedSourcePort as any).source_port_id).toBe("source_port_0")

  const sourcePort = cju(soup).source_port.get("source_port_0")
  expect(sourcePort).toBeTruthy()
})
