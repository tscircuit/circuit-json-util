import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { cju, cjuIndexed } from "../index"

const implementations = [
  { name: "standard", create: cju },
  {
    name: "type index",
    create: (circuit: AnyCircuitElement[]) =>
      cjuIndexed(circuit, { indexConfig: { byType: true } }),
  },
  {
    name: "type and ID indexes",
    create: (circuit: AnyCircuitElement[]) =>
      cjuIndexed(circuit, { indexConfig: { byType: true, byId: true } }),
  },
]

for (const { name, create } of implementations) {
  for (const where of [undefined, {}]) {
    test(`${name}: list(${JSON.stringify(where)}) returns an independent array`, () => {
      const first = {
        type: "source_port" as const,
        source_port_id: "sp1",
        name: "a",
      }
      const second = {
        type: "source_port" as const,
        source_port_id: "sp2",
        name: "b",
      }
      const circuit: AnyCircuitElement[] = [first, second]
      const util = create(circuit)
      const result = util.source_port.list(where)

      result.pop()
      expect(util.source_port.list()).toEqual([first, second])
      expect(util.source_port.get("sp2")).toBe(second)
      expect([...circuit]).toEqual([first, second])

      util.source_port.list(where).reverse()
      expect(util.source_port.list()).toEqual([first, second])

      util.source_port.list(where).push({
        type: "source_port",
        source_port_id: "not-in-circuit",
        name: "extra",
      })
      expect(util.source_port.get("not-in-circuit") ?? null).toBeNull()
      expect(util.source_port.list()).toEqual([first, second])
      expect(util.editCount).toBe(0)
    })
  }
}
