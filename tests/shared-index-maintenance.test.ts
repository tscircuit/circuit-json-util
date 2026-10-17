import { expect, test } from "bun:test"
import type { AnyCircuitElement, SourceNet } from "circuit-json"
import { cjuIndexed } from "../index"
import type { IndexedCircuitJsonUtilOptions } from "../lib/cju-indexed"

const readers = {
  byId: true,
  byType: true,
  byRelation: true,
  bySubcircuit: true,
  byCustomField: ["name"],
}

const writers: [string, IndexedCircuitJsonUtilOptions][] = [
  ["no indexes requested", {}],
  ["only ID index requested", { indexConfig: { byId: true } }],
  [
    "a different custom field requested",
    { indexConfig: { byCustomField: ["subcircuit_id"] } },
  ],
]

function setup(options: IndexedCircuitJsonUtilOptions) {
  const first: SourceNet = {
    type: "source_net",
    source_net_id: "source_net_0",
    name: "FIRST",
    subcircuit_id: "subcircuit_a",
    member_source_group_ids: [],
  }
  const circuit: AnyCircuitElement[] = [first]
  return {
    first,
    circuit,
    reader: cjuIndexed(circuit, { indexConfig: readers }),
    writer: cjuIndexed(circuit, options),
  }
}

for (const [description, options] of writers) {
  test(`shared indexes see inserts with ${description}`, () => {
    const { reader, writer, first, circuit } = setup(options)
    const inserted = writer.source_net.insert({
      name: "SECOND",
      subcircuit_id: "subcircuit_b",
      member_source_group_ids: [],
    })

    expect(reader.source_net.get(inserted.source_net_id)).toBe(inserted)
    expect(reader.source_net.list()).toEqual([first, inserted])
    expect(reader.source_net.getWhere({ name: "SECOND" })).toBe(inserted)
    expect(reader.source_net.list({ subcircuit_id: "subcircuit_b" })).toEqual([
      inserted,
    ])
    expect([...circuit]).toEqual([first, inserted])
    expect(reader.editCount).toBe(1)
  })

  test(`shared indexes see updates with ${description}`, () => {
    const { reader, writer, first } = setup(options)
    expect(
      writer.source_net.update(first.source_net_id, {
        name: "RENAMED",
        subcircuit_id: "subcircuit_b",
      }),
    ).toBe(first)

    expect(reader.source_net.getWhere({ name: "FIRST" })).toBeNull()
    expect(reader.source_net.getWhere({ name: "RENAMED" })).toBe(first)
    expect(reader.source_net.list({ subcircuit_id: "subcircuit_a" })).toEqual(
      [],
    )
    expect(reader.source_net.list({ subcircuit_id: "subcircuit_b" })).toEqual([
      first,
    ])
    expect(reader.editCount).toBe(1)
  })

  test(`shared indexes see deletions with ${description}`, () => {
    const { reader, writer, first, circuit } = setup(options)
    writer.source_net.delete(first.source_net_id)

    expect(reader.source_net.get(first.source_net_id)).toBeNull()
    expect(reader.source_net.list()).toEqual([])
    expect(reader.source_net.getWhere({ name: "FIRST" })).toBeNull()
    expect(reader.source_net.list({ subcircuit_id: "subcircuit_a" })).toEqual(
      [],
    )
    expect([...circuit]).toEqual([])
    expect(reader.editCount).toBe(1)
  })
}
