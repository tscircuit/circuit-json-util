import { expect, test } from "bun:test"
import { source_simple_resistor } from "circuit-json"
import { cju, cjuIndexed } from "../index"

test.each([undefined, {}])(
  "editing a list result does not remove elements from the type index (%j)",
  (where) => {
    const soup = ["R1", "R2"].map((name, index) =>
      source_simple_resistor.parse({
        type: "source_component",
        ftype: "simple_resistor",
        source_component_id: `source_component_${index}`,
        name,
        resistance: 1000,
        supplier_part_numbers: {},
      }),
    )
    const indexed = cjuIndexed(soup, { indexConfig: { byType: true } })
    const result = indexed.source_component.list(where)
    const removed = result.pop()!

    expect(result).toHaveLength(1)
    expect(indexed.toArray()).toHaveLength(2)
    expect(indexed.source_component.list()).toEqual(
      cju(soup).source_component.list(),
    )
    expect(indexed.source_component.get(removed.source_component_id)).toBe(
      removed,
    )
  },
)
