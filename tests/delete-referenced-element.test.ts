import type { AnyCircuitElement } from "circuit-json"
import { cju, cjuIndexed } from "../index"
import { expect, test } from "bun:test"

const implementations = [
  { name: "cju", create: cju },
  { name: "cjuIndexed without indexes", create: cjuIndexed },
  {
    name: "cjuIndexed with relation index",
    create: (soup: AnyCircuitElement[]) =>
      cjuIndexed(soup, { indexConfig: { byRelation: true } }),
  },
  {
    name: "cjuIndexed with ID index",
    create: (soup: AnyCircuitElement[]) =>
      cjuIndexed(soup, { indexConfig: { byId: true } }),
  },
  {
    name: "cjuIndexed with type index",
    create: (soup: AnyCircuitElement[]) =>
      cjuIndexed(soup, { indexConfig: { byType: true } }),
  },
]

function makeCircuit(): AnyCircuitElement[] {
  return [
    {
      type: "source_port",
      source_port_id: "source_port_0",
      source_component_id: "source_component_0",
      name: "left",
    },
    {
      type: "source_component",
      source_component_id: "source_component_0",
      name: "R1",
      supplier_part_numbers: {},
      ftype: "simple_resistor",
      resistance: 10_000,
    },
  ]
}

for (const { name, create } of implementations) {
  test(`${name}: delete targets the element, not an earlier reference`, () => {
    const soup = makeCircuit()
    const port = soup[0]
    if (port?.type !== "source_port") throw new Error("Expected source port")
    const util = create(soup)

    util.source_component.delete("source_component_0")

    expect([...soup]).toEqual([port])
    expect(util.source_component.get("source_component_0")).toBeFalsy()
    expect(util.source_port.get("source_port_0")).toBe(port)
    expect(util.editCount).toBe(1)

    util.source_component.delete("source_component_0")
    expect([...soup]).toEqual([port])
    expect(util.editCount).toBe(1)
  })

  test(`${name}: deleting a missing target preserves dangling references`, () => {
    const soup = makeCircuit().filter(
      (element) => element.type === "source_port",
    )
    const before = [...soup]
    const util = create(soup)

    util.source_component.delete("source_component_0")

    expect([...soup]).toEqual(before)
    expect(util.editCount).toBe(0)
  })
}
