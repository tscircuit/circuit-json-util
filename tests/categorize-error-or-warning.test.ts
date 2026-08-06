import { expect, test } from "bun:test"
import { categorizeErrorOrWarning } from "../lib/categorize-error-or-warning"

test("categorizeErrorOrWarning categorizes known DRC error/warning types", () => {
  expect(categorizeErrorOrWarning("source_pin_must_be_connected_error")).toBe(
    "netlist",
  )
  expect(categorizeErrorOrWarning("source_property_ignored_warning")).toBe(
    "unknown",
  )
  expect(
    categorizeErrorOrWarning("source_component_pins_underspecified_warning"),
  ).toBe("pin_specification")
  expect(categorizeErrorOrWarning("source_no_power_pin_defined_warning")).toBe(
    "pin_specification",
  )
  expect(categorizeErrorOrWarning("source_no_ground_pin_defined_warning")).toBe(
    "pin_specification",
  )

  expect(categorizeErrorOrWarning("pcb_component_outside_board_error")).toBe(
    "placement",
  )
  expect(categorizeErrorOrWarning("pcb_courtyard_overlap_error")).toBe(
    "placement",
  )
  expect(
    categorizeErrorOrWarning(
      "pcb_connector_not_in_accessible_orientation_warning",
    ),
  ).toBe("placement")

  expect(categorizeErrorOrWarning("pcb_trace_missing_error")).toBe("routing")
  expect(categorizeErrorOrWarning("pcb_via_clearance_error")).toBe("routing")
})

test("categorizeErrorOrWarning reads error_type/warning_type/type from objects", () => {
  expect(
    categorizeErrorOrWarning({
      error_type: "source_pin_must_be_connected_error",
    }),
  ).toBe("netlist")
  expect(
    categorizeErrorOrWarning({
      type: "source_property_ignored_warning",
      error_type: "source_property_ignored_warning",
    }),
  ).toBe("unknown")
  expect(
    categorizeErrorOrWarning({
      warning_type: "source_no_power_pin_defined_warning",
    }),
  ).toBe("pin_specification")

  expect(
    categorizeErrorOrWarning({
      warning_type: "pcb_connector_not_in_accessible_orientation_warning",
    }),
  ).toBe("placement")

  expect(categorizeErrorOrWarning({ type: "pcb_trace_error" })).toBe("routing")
})

test("categorizeErrorOrWarning returns unknown when no mapping exists", () => {
  expect(categorizeErrorOrWarning("totally_unknown_error")).toBe("unknown")
  expect(categorizeErrorOrWarning({})).toBe("unknown")
})

test("categorizeErrorOrWarning honors valid explicit categories", () => {
  expect(
    categorizeErrorOrWarning({
      type: "source_property_ignored_warning",
      drc_category: "netlist",
    }),
  ).toBe("netlist")

  for (const category of [
    "pin_specification",
    "placement",
    "routing",
  ] as const) {
    expect(
      categorizeErrorOrWarning({
        type: "source_property_ignored_warning",
        drc_category: category,
      }),
    ).toBe(category)
  }
})

test("explicit categories take precedence over inferred types", () => {
  expect(
    categorizeErrorOrWarning({
      error_type: "source_pin_must_be_connected_error",
      drc_category: "routing",
    }),
  ).toBe("routing")
})

test("invalid explicit categories fall back to type inference", () => {
  expect(
    categorizeErrorOrWarning({
      error_type: "source_pin_must_be_connected_error",
      drc_category: "invalid",
    }),
  ).toBe("netlist")
  expect(
    categorizeErrorOrWarning({
      type: "source_property_ignored_warning",
      drc_category: "invalid",
    }),
  ).toBe("unknown")
})
