import { expect, test } from "bun:test"
import type { AnyCircuitElement, AnyCircuitElementInput } from "circuit-json"
import { cju, cjuIndexed, type CircuitJsonUtilObjects } from "../index"

for (const indexConfig of [{}, { byId: true, byType: true }]) {
  test(`indexed root insert and bulk insert preserve IDs, validation and edit counts (${JSON.stringify(indexConfig)})`, () => {
    const run = (db: CircuitJsonUtilObjects) => {
      const explicit = {
        type: "source_component",
        source_component_id: "ignored",
        ftype: "simple_resistor",
        name: "R1",
        resistance: 1000,
      } as AnyCircuitElementInput
      const inserted = db.insert(explicit)
      expect(inserted).toMatchObject({
        source_component_id: "source_component_0",
      })
      const bulk = db.insertAll([
        {
          type: "source_component",
          source_component_id: "ignored-capacitor",
          ftype: "simple_capacitor",
          name: "C1",
          capacitance: 1e-7,
        },
        {
          type: "source_port",
          source_port_id: "ignored-port",
          source_component_id: "source_component_0",
          name: "1",
          pin_number: 1,
        },
      ])
      for (const elm of [inserted, ...bulk]) {
        const id = (elm as unknown as Record<string, string>)[`${elm.type}_id`]!
        expect(db[elm.type].get(id)).toEqual(elm)
      }
      expect(db.source_component.list()).toHaveLength(2)
      expect(db.editCount).toBe(3)
      expect(() => db.insert({} as AnyCircuitElementInput)).toThrow(
        "insert requires an element with a type",
      )
      expect(() =>
        db.insert({ type: "source_component" } as AnyCircuitElementInput),
      ).toThrow()
      return { records: [...db.toArray()], editCount: db.editCount }
    }
    expect(run(cjuIndexed([], { indexConfig, validateInserts: true }))).toEqual(
      run(cju([], { validateInserts: true })),
    )
  })
}

test("indexed subtree retains connectivity, index options and an independent collection", () => {
  const records: AnyCircuitElement[] = [
    {
      type: "source_component",
      source_component_id: "source_component_0",
      name: "R1",
      ftype: "simple_resistor",
      resistance: 1000,
      subcircuit_id: "sub1",
    },
    {
      type: "source_component",
      source_component_id: "source_component_1",
      name: "R2",
      ftype: "simple_resistor",
      resistance: 2000,
      subcircuit_id: "sub2",
    },
    {
      type: "source_port",
      source_port_id: "source_port_0",
      source_component_id: "source_component_0",
      name: "1",
      pin_number: 1,
    },
  ]
  const db = cjuIndexed(structuredClone(records), {
    indexConfig: { byId: true, byType: true },
    validateInserts: true,
  })
  const subtree = db.subtree({ subcircuit_id: "sub1" })
  expect([...subtree.toArray()]).toEqual([
    ...cju(records).subtree({ subcircuit_id: "sub1" }).toArray(),
  ])
  expect(subtree.source_port.get("source_port_0")?.source_component_id).toBe(
    "source_component_0",
  )
  expect(subtree.source_component.get("source_component_1")).toBeFalsy()
  const part = subtree.insert({
    type: "source_component",
    name: "R3",
    source_component_id: "ignored",
    ftype: "simple_resistor",
    resistance: 3000,
  })
  expect(subtree.source_component.list().some((elm) => elm === part)).toBe(true)
  expect(db.source_component.list()).toHaveLength(2)
  expect(subtree.source_component.list()).toHaveLength(2)
  expect(() =>
    subtree.insert({ type: "source_component" } as AnyCircuitElementInput),
  ).toThrow()
})

test("list results cannot corrupt type indexes but contained elements remain live", () => {
  const db = cjuIndexed([], { indexConfig: { byId: true, byType: true } })
  const r1 = db.source_component.insert({
    name: "R1",
    ftype: "simple_resistor",
    resistance: 1000,
  })
  const r2 = db.source_component.insert({
    name: "R2",
    ftype: "simple_resistor",
    resistance: 2000,
  })
  const all = db.source_component.list()
  all.reverse()
  all.pop()
  all.length = 0
  const emptyFilter = db.source_component.list({})
  emptyFilter.splice(0)
  expect(db.source_component.list()).toEqual([r1, r2])
  expect(db.source_component.get(r1.source_component_id)).toBe(r1)
  expect(db.source_component.list()[0]).toBe(r1)
  db.source_component.update(r1.source_component_id, { name: "R3" })
  expect(db.source_component.list()[0]?.name).toBe("R3")
})
