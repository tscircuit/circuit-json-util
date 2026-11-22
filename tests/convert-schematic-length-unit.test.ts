import { expect, test } from "bun:test"
import { LEGACY_SCHEMATIC_LENGTH_UNIT, type CircuitJson } from "circuit-json"
import { convertSchematicLengthUnits } from "../index"

test("record units are local to geometry and legacy records can be detached", () => {
  const input: CircuitJson = [
    {
      type: "source_group",
      source_group_id: "g",
      is_subcircuit: true,
      subcircuit_id: "s",
      default_schematic_length_unit: "in",
    },
    {
      type: "schematic_sheet",
      schematic_sheet_id: "s",
      center: { x: 2.75, y: 0 },
      subcircuit_id: "s",
      sheet_width: 100,
    },
    {
      type: "schematic_trace",
      schematic_trace_id: "t",
      schematic_length_unit: "in",
      edges: [{ from: { x: 0, y: 0 }, to: { x: 1, y: 0 }, is_crossing: true }],
      junctions: [{ x: 1, y: 0 }],
    },
    {
      type: "source_failed_to_create_component_error",
      source_failed_to_create_component_error_id: "e",
      error_type: "source_failed_to_create_component_error",
      message: "error",
      schematic_length_unit: "in",
      schematic_center: { y: -1 },
      pcb_center: { y: -1 },
    },
  ]
  const mm = convertSchematicLengthUnits(input, "mm")
  expect(mm[0]).toBe(input[0])
  expect(mm[1]).toMatchObject({
    schematic_length_unit: "mm",
    center: { x: 25.4, y: 0 },
    sheet_width: 100,
  })
  expect(mm[2]).toMatchObject({
    schematic_length_unit: "mm",
    edges: [{ to: { x: 25.4, y: 0 }, is_crossing: true }],
    junctions: [{ x: 25.4, y: 0 }],
  })
  expect(mm[3]).toMatchObject({
    schematic_center: { y: -25.4 },
    pcb_center: { y: -1 },
  })
  expect(input[2]).toMatchObject({
    schematic_length_unit: "in",
    junctions: [{ x: 1, y: 0 }],
  })
  expect(
    convertSchematicLengthUnits(mm, LEGACY_SCHEMATIC_LENGTH_UNIT)[2],
  ).toMatchObject({ junctions: [{ x: 2.75, y: 0 }] })
})
