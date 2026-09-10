import { expect, test } from "bun:test"
import type { SourceNet } from "circuit-json"
import { cju, cjuIndexed } from "../index"

const createNets = (): SourceNet[] => [
  {
    type: "source_net",
    source_net_id: "source_net_0",
    name: "signal",
    member_source_group_ids: [],
    is_power: false,
    trace_width: 0.2,
    subcircuit_id: "main",
  },
  {
    type: "source_net",
    source_net_id: "source_net_1",
    name: "VCC",
    member_source_group_ids: [],
    is_power: true,
    trace_width: 1,
  },
  {
    type: "source_net",
    source_net_id: "source_net_2",
    name: "floating",
    member_source_group_ids: [],
    subcircuit_id: "",
  },
]

test.each([
  [{ is_power: true }, "source_net_1"],
  [{ is_power: false }, "source_net_0"],
  [{ is_power: undefined }, "source_net_2"],
  [{ is_power: null }, undefined],
  [{ trace_width: 1 }, "source_net_1"],
  [{ trace_width: "1" }, undefined],
  [{ name: "VCC" }, "source_net_1"],
] as const)(
  "custom-field getWhere preserves strict matching for %j",
  (where, id) => {
    const regular = cju(createNets())
    const indexed = cjuIndexed(createNets(), {
      indexConfig: { byCustomField: ["is_power", "trace_width", "name"] },
    })

    expect(regular.source_net.getWhere(where)?.source_net_id).toBe(id)
    expect(indexed.source_net.getWhere(where)?.source_net_id).toBe(id)
  },
)

test.each([
  [{ subcircuit_id: "main" }, "source_net_0"],
  [{ subcircuit_id: undefined }, "source_net_1"],
  [{ subcircuit_id: "" }, "source_net_2"],
  [{ subcircuit_id: "missing" }, undefined],
] as const)("subcircuit queries preserve matching for %j", (where, id) => {
  const regular = cju(createNets())
  const indexed = cjuIndexed(createNets(), {
    indexConfig: { bySubcircuit: true },
  })

  expect(regular.source_net.getWhere(where)?.source_net_id).toBe(id)
  expect(indexed.source_net.getWhere(where)?.source_net_id).toBe(id)
  expect(indexed.source_net.list(where)).toEqual(regular.source_net.list(where))
})
