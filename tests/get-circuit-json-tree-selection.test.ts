import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { getCircuitJsonTree } from "../lib/getCircuitJsonTree"

const groups: AnyCircuitElement[] = [
  { type: "source_group", source_group_id: "g1", is_subcircuit: false },
  { type: "source_group", source_group_id: "g2", is_subcircuit: false },
]

test("rejects a missing explicit group rather than returning undefined", () => {
  expect(() =>
    getCircuitJsonTree(groups, { source_group_id: "missing" }),
  ).toThrow('Unable to build circuit tree for source_group_id "missing"')
})

test("does not ignore an explicit group when the circuit has no groups", () => {
  expect(() => getCircuitJsonTree([], { source_group_id: "missing" })).toThrow(
    'Unable to build circuit tree for source_group_id "missing"',
  )
})

test("rejects an explicit group whose parent cycle prevents building its tree", () => {
  const cyclic: AnyCircuitElement[] = [
    ...groups,
    {
      type: "source_group",
      source_group_id: "cycle",
      parent_source_group_id: "cycle",
      is_subcircuit: false,
    },
  ]
  expect(() =>
    getCircuitJsonTree(cyclic, { source_group_id: "cycle" }),
  ).toThrow('Unable to build circuit tree for source_group_id "cycle"')
})

test("returns the requested group even when a different group is processed last", () => {
  expect(
    getCircuitJsonTree(groups, { source_group_id: "g1" }).sourceGroup
      ?.source_group_id,
  ).toBe("g1")
})

test("preserves the no-selector fallback for a circuit with no groups", () => {
  expect(getCircuitJsonTree([])).toEqual({
    nodeType: "group",
    childNodes: [],
    otherChildElements: [],
  })
})
