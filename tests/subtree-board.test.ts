import type {
  AnyCircuitElement,
  PcbBoard,
  AnySourceComponent,
  SourceGroup,
} from "circuit-json"
import { cju } from "../index"
import { test, expect } from "bun:test"

test("pcb_board included when using source group", () => {
  const circuitJson: AnyCircuitElement[] = [
    {
      type: "source_group",
      source_group_id: "g1",
      subcircuit_id: "sub1",
    } as SourceGroup,
    {
      type: "pcb_board",
      pcb_board_id: "b1",
      subcircuit_id: "sub1",
      width: 10,
      height: 10,
      center: { x: 0, y: 0 },
    } as PcbBoard,
    {
      type: "source_component",
      source_component_id: "sc1",
      name: "R1",
      ftype: "simple_resistor",
      resistance: 1000,
      supplier_part_numbers: {},
      source_group_id: "g1",
    } as AnySourceComponent,
  ]

  const st = cju(circuitJson).subtree({ source_group_id: "g1" })

  expect(st.pcb_board.list().length).toBe(1)
  expect(st.pcb_board.get("b1")).toBeTruthy()
})
