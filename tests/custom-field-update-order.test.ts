import { expect, test } from "bun:test"
import { pcb_component, source_net } from "circuit-json"
import { cju, cjuIndexed } from "../index"

const makeCircuit = () =>
  [1, 2, 3].map((n) =>
    pcb_component.parse({
      type: "pcb_component",
      pcb_component_id: `pc${n}`,
      source_component_id: `sc${n}`,
      center: { x: n * 5, y: 0 },
      width: n,
      height: n,
      rotation: 0,
      layer: "top",
      obstructs_within_bounds: false,
    }),
  )

for (const indexConfig of [
  { byCustomField: ["width", "height"] },
  { byType: true, byCustomField: ["width", "height"] },
  { byId: true, byType: true, byCustomField: ["width", "height"] },
]) {
  const label = JSON.stringify(indexConfig)

  test(`earlier and middle joins retain first circuit match: ${label}`, () => {
    const circuit = makeCircuit()
    const indexed = cjuIndexed(circuit, { indexConfig })
    expect(indexed.pcb_component.getWhere({ width: 2 })).toBe(circuit[1])
    indexed.pcb_component.update("pc1", { width: 2 })
    expect(indexed.pcb_component.getWhere({ width: 2 })).toBe(circuit[0])
    expect(cju(circuit).pcb_component.getWhere({ width: 2 })).toBe(circuit[0])
    indexed.pcb_component.update("pc2", { height: 3 })
    expect(indexed.pcb_component.getWhere({ height: 3 })).toBe(circuit[1])
    expect(indexed.editCount).toBe(2)
    expect(circuit.map((e) => e.pcb_component_id)).toEqual([
      "pc1",
      "pc2",
      "pc3",
    ])
  })

  test(`later joins do not overtake earlier matches: ${label}`, () => {
    const circuit = makeCircuit()
    const indexed = cjuIndexed(circuit, { indexConfig })
    indexed.pcb_component.update("pc3", { width: 1, height: 1 })
    expect(indexed.pcb_component.getWhere({ width: 1 })).toBe(circuit[0])
    expect(indexed.pcb_component.getWhere({ height: 1 })).toBe(circuit[0])
  })

  test(`leaving and rejoining a bucket restores circuit order: ${label}`, () => {
    const circuit = makeCircuit()
    circuit[0]!.width = 2
    const indexed = cjuIndexed(circuit, { indexConfig })
    expect(indexed.pcb_component.getWhere({ width: 2 })).toBe(circuit[0])
    indexed.pcb_component.update("pc1", { width: 1 })
    expect(indexed.pcb_component.getWhere({ width: 2 })).toBe(circuit[1])
    indexed.pcb_component.update("pc1", { width: 2 })
    expect(indexed.pcb_component.getWhere({ width: 2 })).toBe(circuit[0])
    indexed.pcb_component.update("pc1", { width: 2, rotation: 90 })
    expect(indexed.pcb_component.getWhere({ width: 2 })).toBe(circuit[0])
    expect(indexed.pcb_component.list({ width: 2 })).toEqual([
      circuit[0],
      circuit[1],
    ])
  })

  test(`deleting a joined element leaves the next match: ${label}`, () => {
    const circuit = makeCircuit()
    const next = circuit[1]!
    const indexed = cjuIndexed(circuit, { indexConfig })
    indexed.pcb_component.update("pc1", { width: 2 })
    indexed.pcb_component.delete("pc1")
    expect(indexed.pcb_component.getWhere({ width: 2 })).toBe(next)
    expect(indexed.editCount).toBe(2)
  })
}

test("custom buckets retain order with another element type before the match", () => {
  const first = source_net.parse({
    type: "source_net",
    source_net_id: "n1",
    name: "first",
    member_source_group_ids: [],
  })
  const otherType = {
    type: "source_group" as const,
    source_group_id: "g1",
    name: "shared",
  }
  const second = source_net.parse({
    type: "source_net",
    source_net_id: "n2",
    name: "shared",
    member_source_group_ids: [],
  })
  const circuit = [first, otherType, second]
  const indexed = cjuIndexed(circuit, {
    indexConfig: { byCustomField: ["name"] },
  })
  indexed.source_net.update("n1", { name: "shared" })
  expect(indexed.source_net.getWhere({ name: "shared" })).toBe(first)
  expect(indexed.source_group.getWhere({ name: "shared" })).toBe(otherType)
})
