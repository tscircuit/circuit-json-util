import type { AnyCircuitElement } from "circuit-json"
import { cju, cjuIndexed, type CircuitJsonUtilObjects } from "../index"
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

const implementations: [
  string,
  (soup: AnyCircuitElement[]) => CircuitJsonUtilObjects,
][] = [
  ["cju", cju],
  ["cjuIndexed without indexes", cjuIndexed],
  [
    "cjuIndexed byId",
    (soup) => cjuIndexed(soup, { indexConfig: { byId: true } }),
  ],
  [
    "cjuIndexed byType",
    (soup) => cjuIndexed(soup, { indexConfig: { byType: true } }),
  ],
  [
    "cjuIndexed byRelation",
    (soup) => cjuIndexed(soup, { indexConfig: { byRelation: true } }),
  ],
  [
    "cjuIndexed bySubcircuit",
    (soup) => cjuIndexed(soup, { indexConfig: { bySubcircuit: true } }),
  ],
  [
    "cjuIndexed byCustomField",
    (soup) => cjuIndexed(soup, { indexConfig: { byCustomField: ["name"] } }),
  ],
]

for (const [name, createUtil] of implementations) {
  test(`${name}: delete preserves an earlier element referencing the target`, () => {
    const port: AnyCircuitElement = {
      type: "source_port",
      source_port_id: "source_port_0",
      source_component_id: "simple_resistor_0",
      name: "left",
    }
    const component: AnyCircuitElement = {
      type: "source_component",
      source_component_id: "simple_resistor_0",
      name: "R1",
      supplier_part_numbers: {},
      ftype: "simple_resistor",
      resistance: 10_000,
    }
    const soup: AnyCircuitElement[] = [port, component]
    const util = createUtil(soup)

    util.source_component.delete(component.source_component_id)

    expect([...soup]).toEqual([port])
    expect(util.source_component.get(component.source_component_id)).toBeFalsy()
    expect(util.source_component.list()).toEqual([])
    expect(util.source_port.get(port.source_port_id)).toBe(port)
    expect(util.source_port.list()).toEqual([port])
    expect(util.source_port.getWhere({ name: "left" })).toBe(port)
    expect(util.editCount).toBe(1)
  })

  test(`${name}: delete is a no-op when only a reference to the ID exists`, () => {
    const port: AnyCircuitElement = {
      type: "source_port",
      source_port_id: "source_port_0",
      source_component_id: "simple_resistor_0",
      name: "left",
    }
    const soup: AnyCircuitElement[] = [port]
    const util = createUtil(soup)

    util.source_component.delete("simple_resistor_0")

    expect([...soup]).toEqual([port])
    expect(util.source_port.get(port.source_port_id)).toBe(port)
    expect(util.source_port.list()).toEqual([port])
    expect(util.editCount).toBe(0)
  })
}
