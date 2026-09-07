import { expect, test } from "bun:test"
import type { AnyCircuitElement, AnyCircuitElementInput } from "circuit-json"
import { cju, cjuIndexed } from "../index"

const indexConfig = {
  byId: true,
  byType: true,
  byRelation: true,
  bySubcircuit: true,
  byCustomField: ["name"],
}

test("indexed generic insert generates IDs and updates lookup indexes", () => {
  const initial: AnyCircuitElement[] = [
    {
      type: "source_port",
      source_port_id: "source_port_7",
      source_component_id: "source_component_0",
      name: "left",
    },
  ]
  const regular = cju(structuredClone(initial))
  const indexed = cjuIndexed(structuredClone(initial), { indexConfig })
  const input: AnyCircuitElementInput = {
    type: "source_port",
    source_port_id: "source_port_99",
    source_component_id: "source_component_0",
    name: "right",
    subcircuit_id: "subcircuit_a",
  }

  const inserted = indexed.insert(input)

  expect(inserted).toEqual(regular.insert(input))
  expect(inserted).toMatchObject({ source_port_id: "source_port_8" })
  expect(input.source_port_id).toBe("source_port_99")
  expect(inserted).toBe(indexed.source_port.get("source_port_8")!)
  expect(inserted).toBe(indexed.source_port.getWhere({ name: "right" })!)
  expect([inserted]).toEqual(
    indexed.source_port.list({ subcircuit_id: "subcircuit_a" }),
  )
  expect(indexed.source_port.list()).toHaveLength(2)
  expect(indexed.editCount).toBe(1)
})

test("indexed insertAll preserves mixed input order and per-type ID counters", () => {
  const regular = cju([])
  const indexed = cjuIndexed([], { indexConfig })
  const inputs: AnyCircuitElementInput[] = [
    {
      type: "source_net",
      source_net_id: "imported_vcc",
      name: "VCC",
      member_source_group_ids: [],
    },
    {
      type: "source_port",
      source_port_id: "imported_power",
      source_component_id: "source_component_0",
      name: "power",
    },
    {
      type: "source_net",
      source_net_id: "imported_gnd",
      name: "GND",
      member_source_group_ids: [],
    },
  ]

  const inserted = indexed.insertAll(inputs)

  expect(inserted).toEqual(regular.insertAll(inputs))
  expect(inserted).toMatchObject([
    { source_net_id: "source_net_0" },
    { source_port_id: "source_port_0" },
    { source_net_id: "source_net_1" },
  ])
  expect([...indexed.toArray()]).toEqual(inserted)
  expect([inserted[0], inserted[2]]).toEqual(indexed.source_net.list())
  expect(inserted[2]).toBe(indexed.source_net.get("source_net_1")!)
  expect(inserted[1]).toBe(indexed.source_port.getWhere({ name: "power" })!)
  expect(indexed.editCount).toBe(3)
  expect(
    indexed.source_net.insert({ name: "SIGNAL", member_source_group_ids: [] }),
  ).toMatchObject({ source_net_id: "source_net_2" })
})

test("an empty indexed insertAll leaves the circuit unchanged", () => {
  const indexed = cjuIndexed([], { indexConfig })
  expect(indexed.insertAll([])).toEqual([])
  expect(indexed.editCount).toBe(0)
  expect([...indexed.toArray()]).toEqual([])
})

test("indexed generic insertion honors insert validation", () => {
  const indexed = cjuIndexed([], { validateInserts: true, indexConfig })

  expect(() =>
    indexed.insert({
      type: "source_net",
      name: 123,
      member_source_group_ids: [],
    } as any),
  ).toThrow("Expected string, received number")
  expect(indexed.editCount).toBe(0)
  expect(indexed.source_net.list()).toEqual([])

  const [inserted] = indexed.insertAll([
    {
      type: "source_net",
      source_net_id: "imported_vcc",
      name: "VCC",
      member_source_group_ids: [],
    },
  ])
  expect(inserted).toBe(indexed.source_net.getWhere({ name: "VCC" })!)
  expect(indexed.editCount).toBe(1)
})

test("indexed generic insert rejects a missing type without changing the circuit", () => {
  const indexed = cjuIndexed([], { indexConfig })
  expect(() => indexed.insert({ name: "VCC" } as any)).toThrow(
    "insert requires an element with a type",
  )
  expect(indexed.editCount).toBe(0)
  expect([...indexed.toArray()]).toEqual([])
})
