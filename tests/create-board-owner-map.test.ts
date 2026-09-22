import { expect, test } from "bun:test"
import type { AnyCircuitElement, PcbBoard, PcbVia } from "circuit-json"
import { createBoardOwnerMap } from "../index"

test("resolves board ownership from IDs across panels and nested groups", () => {
  const boardA: PcbBoard = {
    type: "pcb_board",
    pcb_board_id: "board_A",
    subcircuit_id: "subcircuit_A",
    pcb_panel_id: "panel",
    center: { x: 0, y: 0 },
    width: 10,
    height: 10,
    thickness: 1.6,
    num_layers: 2,
    material: "fr4",
  }
  const boardB: PcbBoard = {
    ...boardA,
    pcb_board_id: "board_B",
    subcircuit_id: "subcircuit_B",
  }
  const unowned: PcbVia = {
    type: "pcb_via",
    pcb_via_id: "unowned",
    x: 0,
    y: 0,
    layers: ["top", "bottom"],
    hole_diameter: 0.3,
    outer_diameter: 0.6,
  }
  const elements: AnyCircuitElement[] = [
    {
      type: "pcb_panel",
      pcb_panel_id: "panel",
      center: { x: 0, y: 0 },
      width: 20,
      height: 10,
      thickness: 1.6,
      covered_with_solder_mask: false,
    },
    boardA,
    boardB,
    {
      type: "source_group",
      source_group_id: "source_child_A",
      subcircuit_id: "child_A",
      parent_subcircuit_id: "subcircuit_A",
      is_subcircuit: true,
    },
    {
      type: "source_group",
      source_group_id: "source_nested_A",
      parent_source_group_id: "source_child_A",
    },
    {
      type: "pcb_group",
      pcb_group_id: "group_A",
      source_group_id: "source_nested_A",
      center: { x: 0, y: 0 },
      pcb_component_ids: ["component_A"],
      anchor_alignment: "center",
    },
    {
      type: "pcb_component",
      pcb_component_id: "component_A",
      source_component_id: "source_component_A",
      pcb_group_id: "group_A",
      center: { x: 0, y: 0 },
      width: 1,
      height: 1,
      rotation: 0,
      layer: "top",
      obstructs_within_bounds: true,
    },
    {
      type: "pcb_trace",
      pcb_trace_id: "trace_A",
      pcb_component_id: "component_A",
      route: [],
    },
    { ...unowned, pcb_via_id: "via_child_A", subcircuit_id: "child_A" },
    { ...unowned, pcb_via_id: "via_group_A", pcb_group_id: "group_A" },
    { ...unowned, pcb_via_id: "via_trace_A", pcb_trace_id: "trace_A" },
    { ...unowned, pcb_via_id: "via_B", subcircuit_id: "subcircuit_B" },
    {
      type: "source_group",
      source_group_id: "cycle_group",
      subcircuit_id: "cycle",
      parent_subcircuit_id: "cycle",
      is_subcircuit: true,
    },
    unowned,
  ]

  const owners = createBoardOwnerMap(elements)
  expect(owners.get("board_A")).toBe(boardA)
  expect(owners.get("subcircuit_A")).toBe(boardA)
  expect(owners.get("source_child_A")).toBe(boardA)
  expect(owners.get("child_A")).toBe(boardA)
  expect(owners.get("source_nested_A")).toBe(boardA)
  expect(owners.get("group_A")).toBe(boardA)
  expect(owners.get("component_A")).toBe(boardA)
  expect(owners.get("trace_A")).toBe(boardA)
  expect(owners.get("via_child_A")).toBe(boardA)
  expect(owners.get("via_group_A")).toBe(boardA)
  expect(owners.get("via_trace_A")).toBe(boardA)
  expect(owners.get("via_B")).toBe(boardB)
  expect(owners.get("unowned")).toBeUndefined()
  expect(owners.get("cycle")).toBeUndefined()
  expect(createBoardOwnerMap([...elements].reverse())).toEqual(owners)
  expect(createBoardOwnerMap([boardB, unowned]).get("unowned")).toBe(boardB)
  expect(createBoardOwnerMap([unowned]).get("unowned")).toBeUndefined()
  expect(
    createBoardOwnerMap([boardB, { ...unowned, subcircuit_id: "missing" }]).get(
      "unowned",
    ),
  ).toBeUndefined()
})
