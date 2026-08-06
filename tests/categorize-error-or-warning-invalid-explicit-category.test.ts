import { expect, test } from "bun:test"
import { categorizeErrorOrWarning } from "../lib/categorize-error-or-warning"

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
