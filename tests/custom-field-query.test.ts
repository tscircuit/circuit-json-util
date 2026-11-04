import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { cju, cjuIndexed } from "../index"

const makeCircuit = (): AnyCircuitElement[] => [
  {
    type: "pcb_component",
    pcb_component_id: "pc1",
    source_component_id: "sc1",
    center: { x: 0, y: 0 },
    width: 2,
    height: 1,
    rotation: 0,
    layer: "top",
    obstructs_within_bounds: false,
  },
  {
    type: "pcb_component",
    pcb_component_id: "pc2",
    source_component_id: "sc2",
    center: { x: 5, y: 0 },
    width: 3,
    height: 1,
    rotation: 0,
    layer: "top",
    obstructs_within_bounds: true,
  },
]

for (const byType of [false, true]) {
  for (const where of [
    { obstructs_within_bounds: false },
    { obstructs_within_bounds: true },
    { width: "2" },
    { width: 2 },
    { subcircuit_id: undefined },
  ]) {
    test(`custom field lookup matches linear lookup: ${JSON.stringify(where)}, byType=${byType}`, () => {
      const circuit = makeCircuit()
      const regular = cju(circuit)
      const indexed = cjuIndexed(circuit, {
        indexConfig: {
          byType,
          byCustomField: ["width", "obstructs_within_bounds", "subcircuit_id"],
        },
      })
      expect(indexed.pcb_component.getWhere(where) ?? null).toBe(
        regular.pcb_component.getWhere(where) ?? null,
      )
    })
  }
}
