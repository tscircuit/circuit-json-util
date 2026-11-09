import { expect, test } from "bun:test"
import { pcb_component, pcb_group } from "circuit-json"
import { createBoardOwnerMap } from "../index"
import {
  makeSourceAncestryCircuit,
  sourceAncestryCases,
} from "./fixtures/source-ancestry-circuit"

for (const { name, options, expectedOwner } of sourceAncestryCases) {
  for (const reversed of [false, true]) {
    test(`${name}; reversed=${reversed}`, () => {
      const circuit = makeSourceAncestryCircuit(options)
      if (reversed) circuit.reverse()
      const owners = createBoardOwnerMap(circuit)
      for (const id of ["trace_A", "via_direct", "via_indirect"]) {
        expect(owners.get(id)?.pcb_board_id).toBe(expectedOwner)
      }
    })
  }
}

for (const physicalParent of ["group", "component"] as const) {
  test(`resolved physical ${physicalParent} wins over a different source board`, () => {
    const circuit = makeSourceAncestryCircuit({
      source: "valid",
      boardCount: 2,
    })
    circuit.push(
      pcb_group.parse({
        type: "pcb_group",
        pcb_group_id: "physical_group_B",
        source_group_id: "source_group_B",
        subcircuit_id: "subcircuit_B",
        center: { x: 20, y: 0 },
        pcb_component_ids: [],
        anchor_alignment: "center",
      }),
      pcb_component.parse({
        type: "pcb_component",
        pcb_component_id: "physical_component_B",
        source_component_id: "source_component_B",
        subcircuit_id: "subcircuit_B",
        center: { x: 20, y: 0 },
        width: 1,
        height: 1,
        rotation: 0,
        layer: "top",
      }),
    )
    const trace = circuit.find((element) => element.type === "pcb_trace")
    const via = circuit.find((element) => element.type === "pcb_via")
    if (!trace || !via) throw new Error("Missing physical fixture elements")
    if (physicalParent === "group") {
      trace.pcb_group_id = "physical_group_B"
      via.pcb_group_id = "physical_group_B"
    } else {
      trace.pcb_component_id = "physical_component_B"
      via.pcb_trace_id = "trace_A"
    }
    const owners = createBoardOwnerMap(circuit)
    for (const id of ["trace_A", "via_direct", "via_indirect"]) {
      expect(owners.get(id)?.pcb_board_id).toBe("board_B")
    }
  })
}
