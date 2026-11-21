import type { AnyCircuitElement } from "circuit-json"
import { expect, test } from "bun:test"
import { cju, cjuIndexed } from "../index"

test("cju lookups return null, not undefined, when nothing matches", () => {
  const circuitJson: AnyCircuitElement[] = [
    {
      type: "source_component",
      source_component_id: "source_component_0",
      name: "J1",
      ftype: "simple_chip",
    },
    {
      type: "source_port",
      source_port_id: "source_port_0",
      source_component_id: "source_component_0",
      name: "CC1",
    },
    // J1 has no footprint, so its port has no pcb_port and it has no
    // pcb_component.
  ]

  for (const db of [cju(circuitJson), cjuIndexed(circuitJson)]) {
    expect(db.pcb_port.get("pcb_port_0")).toBeNull()
    expect(db.pcb_port.getWhere({ source_port_id: "source_port_0" })).toBeNull()
    expect(
      db.pcb_component.getUsing({ source_component_id: "source_component_0" }),
    ).toBeNull()
    expect(db.source_component.select(".R1")).toBeNull()
    expect(db.pcb_port.select(".J1 > .CC1")).toBeNull()
    expect(db.schematic_port.select(".J1 > .CC1")).toBeNull()

    // The pattern core relies on to drop ports that have no pads.
    const pcbPorts = ["source_port_0"]
      .map((source_port_id) => db.pcb_port.getWhere({ source_port_id }))
      .filter((pcbPort) => pcbPort !== null)
    expect(pcbPorts).toEqual([])

    expect(db.source_port.get("source_port_0")?.name).toBe("CC1")
    expect(db.source_port.select(".J1 > .CC1")?.source_port_id).toBe(
      "source_port_0",
    )
  }
})
