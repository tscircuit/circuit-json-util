import { expect, test } from "bun:test"
import { source_net, source_simple_resistor } from "circuit-json"
import { cjuIndexed } from "../index"

const makeNet = (id: string, subcircuitId: string) =>
  source_net.parse({
    type: "source_net",
    source_net_id: id,
    name: "SIGNAL",
    subcircuit_id: subcircuitId,
    member_source_group_ids: [],
  })

const makeResistor = (id: string, subcircuitId: string) =>
  source_simple_resistor.parse({
    type: "source_component",
    source_component_id: id,
    name: id,
    ftype: "simple_resistor",
    resistance: 1000,
    subcircuit_id: subcircuitId,
  })

for (const indexConfig of [
  { bySubcircuit: true },
  { byId: true, byType: true, bySubcircuit: true },
]) {
  const label = JSON.stringify(indexConfig)

  for (const joiningId of ["n1", "n2", "n3"]) {
    test(`subcircuit joins retain circuit order (${joiningId}, ${label})`, () => {
      const circuit = ["n1", "n2", "n3"].map((id) =>
        makeNet(id, id === joiningId ? "other" : "target"),
      )
      const originalOrder = [...circuit]
      const db = cjuIndexed(circuit, { indexConfig })
      db.source_net.update(joiningId, { subcircuit_id: "target" })

      const result = db.source_net.list({ subcircuit_id: "target" })
      expect(result.map((net) => net.source_net_id)).toEqual(["n1", "n2", "n3"])
      expect(result[0]).toBe(originalOrder[0]!)
      expect(db.source_net.list({ subcircuit_id: "other" })).toEqual([])
      for (let repeat = 0; repeat < 2; repeat++) {
        expect(db.source_net.getWhere({ subcircuit_id: "target" })).toBe(
          originalOrder[0]!,
        )
        expect(
          db.source_net.getWhere({
            subcircuit_id: "target",
            name: "SIGNAL",
          }),
        ).toBe(originalOrder[0]!)
      }
      expect([...db.toArray()]).toEqual(originalOrder)
      expect(db.editCount).toBe(1)
    })
  }

  test(`leaving and rejoining restores first-match order (${label})`, () => {
    const circuit = [
      makeNet("n1", "target"),
      makeNet("n2", "target"),
      makeNet("n3", "unrelated"),
    ]
    const db = cjuIndexed(circuit, { indexConfig })
    db.source_net.update("n1", { subcircuit_id: "other" })
    expect(db.source_net.list({ subcircuit_id: "target" })).toEqual([
      circuit[1]!,
    ])
    expect(db.source_net.getWhere({ subcircuit_id: "target" })).toBe(
      circuit[1]!,
    )
    db.source_net.update("n1", { subcircuit_id: "target" })
    db.source_net.update("n1", { subcircuit_id: "target" })
    db.source_net.update("n1", { name: "RENAMED" })
    expect(db.source_net.list({ subcircuit_id: "target" })).toEqual([
      circuit[0]!,
      circuit[1]!,
    ])
    expect(db.source_net.getWhere({ subcircuit_id: "target" })).toBe(
      circuit[0]!,
    )
    expect(db.source_net.list({ subcircuit_id: "other" })).toEqual([])
    expect(db.source_net.list({ subcircuit_id: "unrelated" })).toEqual([
      circuit[2]!,
    ])
    expect(db.source_net.getWhere({ subcircuit_id: "missing" })).toBeNull()
    expect(circuit.map((net) => net.source_net_id)).toEqual(["n1", "n2", "n3"])
  })

  test(`component queries retain order in mixed-type subcircuits (${label})`, () => {
    const first = makeResistor("R1", "target")
    const middle = makeResistor("R2", "other")
    const last = makeResistor("R3", "target")
    const net = makeNet("n1", "target")
    const circuit = [net, first, middle, last]
    const db = cjuIndexed(circuit, { indexConfig })
    db.source_component.update("R2", { subcircuit_id: "target" })
    expect(db.source_component.list({ subcircuit_id: "target" })).toEqual([
      first,
      middle,
      last,
    ])
    expect(db.source_component.getWhere({ subcircuit_id: "target" })).toBe(
      first,
    )
    expect(db.source_net.getWhere({ subcircuit_id: "target" })).toBe(net)
    expect(db.source_net.list({ subcircuit_id: "target" })).toEqual([net])
    expect([...db.toArray()]).toEqual([net, first, middle, last])
  })
}

test("indexed moves into an empty subcircuit do not scan the circuit array", () => {
  const moved = makeNet("n15", "old15")
  const records = [
    ...Array.from({ length: 15 }, (_, i) => makeNet(`n${i}`, `old${i}`)),
    moved,
  ]
  let indexedReads = 0
  const circuit = new Proxy(records, {
    get(target, property, receiver) {
      if (typeof property === "string" && /^(0|[1-9]\d*)$/.test(property)) {
        indexedReads++
      }
      return Reflect.get(target, property, receiver)
    },
  })
  const db = cjuIndexed(circuit, {
    indexConfig: { byId: true, byType: true, bySubcircuit: true },
  })
  indexedReads = 0
  expect(db.source_net.update("n15", { subcircuit_id: "new" })).toBe(moved)
  expect(indexedReads).toBe(0)
  expect(db.source_net.list({ subcircuit_id: "old15" })).toEqual([])
  expect(db.source_net.list({ subcircuit_id: "new" })).toEqual([moved])
  expect(db.source_net.getWhere({ subcircuit_id: "new" })).toBe(moved)
  expect(db.source_net.list()[15]).toBe(moved)
  expect(db.editCount).toBe(1)
})
