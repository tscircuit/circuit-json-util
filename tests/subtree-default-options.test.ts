import { expect, test } from "bun:test"
import type { AnyCircuitElement, AnyCircuitElementInput } from "circuit-json"
import { cju } from "../lib/cju"
import { cjuIndexed } from "../lib/cju-indexed"

for (const [name, createUtil] of [
  ["cju", cju],
  ["cjuIndexed", cjuIndexed],
] as const) {
  for (const [description, args] of [
    ["omitted options", []],
    ["undefined options", [undefined]],
    ["empty options", [{}]],
  ] as const) {
    test(`${name} subtree with ${description} copies an empty collection`, () => {
      const records: AnyCircuitElement[] = []
      const subtree = createUtil(records).subtree(...args)

      expect(subtree.toArray()).toHaveLength(0)
      expect(subtree.toArray()).not.toBe(records)
    })

    test(`${name} subtree with ${description} preserves elements in an independent collection`, () => {
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
      ]
      const parent = createUtil(records)
      const subtree = parent.subtree(...args)

      expect(subtree.toArray()).not.toBe(records)
      expect([...subtree.toArray()]).toEqual([...records])
      expect(subtree.toArray()[0]).toBe(records[0])
      expect(subtree.toArray()[1]).toBe(records[1])

      subtree.source_component.update("source_component_0", { name: "R3" })
      expect(parent.source_component.get("source_component_0")?.name).toBe("R3")
      subtree.source_component.delete("source_component_1")
      expect(subtree.source_component.list()).toHaveLength(1)
      expect(parent.source_component.list()).toHaveLength(2)
    })

    test(`${name} subtree with ${description} retains insert validation`, () => {
      const subtree = createUtil([], { validateInserts: true }).subtree(...args)

      expect(() =>
        subtree.insert({ type: "source_component" } as AnyCircuitElementInput),
      ).toThrow()
      expect(subtree.toArray()).toHaveLength(0)
    })
  }
}

test("subtree without options supports indexed inserts", () => {
  const parent = cjuIndexed([], {
    indexConfig: { byId: true, byType: true },
  })
  const subtree = parent.subtree()
  const component = subtree.source_component.insert({
    name: "R1",
    ftype: "simple_resistor",
    resistance: 1000,
  })

  expect(subtree.source_component.get(component.source_component_id)).toBe(
    component,
  )
  expect(subtree.source_component.list()).toEqual([component])
  expect(parent.source_component.list()).toHaveLength(0)
})
