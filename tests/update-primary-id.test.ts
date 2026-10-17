import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { cju, cjuIndexed } from "../index"

const configurations = [
  { name: "standard", create: cju },
  { name: "indexed without ID index", create: cjuIndexed },
  {
    name: "ID index",
    create: (circuit: AnyCircuitElement[]) =>
      cjuIndexed(circuit, { indexConfig: { byId: true } }),
  },
  {
    name: "ID and type indexes",
    create: (circuit: AnyCircuitElement[]) =>
      cjuIndexed(circuit, { indexConfig: { byId: true, byType: true } }),
  },
]

for (const { name, create } of configurations) {
  test(`${name}: primary ID changes keep lookups and mutations consistent`, () => {
    const port = {
      type: "source_port" as const,
      source_port_id: "sp-old",
      name: "left",
    }
    const circuit: AnyCircuitElement[] = [port]
    const util = create(circuit)

    expect(
      util.source_port.update("sp-old", { source_port_id: "sp-new" }),
    ).toBe(port)
    expect(util.source_port.get("sp-old") ?? null).toBeNull()
    expect(util.source_port.get("sp-new")).toBe(port)
    expect(util.source_port.list()).toEqual([port])

    util.source_port.update("sp-new", { name: "right" })
    expect(port.name).toBe("right")
    expect(util.source_port.get("sp-new")).toBe(port)
    expect(util.editCount).toBe(2)

    util.source_port.delete("sp-old")
    expect([...circuit]).toEqual([port])
    expect(util.editCount).toBe(2)

    util.source_port.delete("sp-new")
    expect([...circuit]).toEqual([])
    expect(util.source_port.get("sp-new") ?? null).toBeNull()
    expect(util.editCount).toBe(3)
  })
}
