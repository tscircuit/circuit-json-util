import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { buildSubtree } from "../lib/subtree"

const circuit: AnyCircuitElement[] = [
  { type: "source_group", source_group_id: "g1", subcircuit_id: "s1" },
  { type: "source_group", source_group_id: "g2", subcircuit_id: "s2" },
  { type: "source_group", source_group_id: "g3", subcircuit_id: "s3" },
  {
    type: "source_component",
    source_component_id: "c1",
    name: "R1",
    ftype: "simple_resistor",
    resistance: 1000,
    source_group_id: "g1",
  },
]

test("subcircuit list selects only requested subcircuits and their relations", () => {
  expect(buildSubtree(circuit, { subcircuit_ids: ["s1"] })).toEqual([
    circuit[0]!,
    circuit[3]!,
  ])
  expect(buildSubtree(circuit, { subcircuit_ids: ["s1", "s2"] })).toEqual([
    circuit[0]!,
    circuit[1]!,
    circuit[3]!,
  ])
})

test("empty and unknown subcircuit lists do not select the whole circuit", () => {
  expect(buildSubtree(circuit, { subcircuit_ids: [] })).toEqual([])
  expect(buildSubtree(circuit, { subcircuit_ids: ["unknown"] })).toEqual([])
})

test("a singular subcircuit selector preserves explicit additional selections", () => {
  expect(
    buildSubtree(circuit, { subcircuit_id: "s1", subcircuit_ids: ["s2"] }),
  ).toEqual([circuit[0]!, circuit[1]!, circuit[3]!])
})

test("no selector still returns a shallow copy of the entire circuit", () => {
  const result = buildSubtree(circuit, {})
  expect(result).toEqual(circuit)
  expect(result).not.toBe(circuit)
})
