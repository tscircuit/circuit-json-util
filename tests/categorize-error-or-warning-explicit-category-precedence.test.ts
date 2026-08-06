import { expect, test } from "bun:test"
import { categorizeErrorOrWarning } from "../lib/categorize-error-or-warning"

test("explicit categories take precedence over inferred types", () => {
  expect(
    categorizeErrorOrWarning({
      error_type: "source_pin_must_be_connected_error",
      drc_category: "routing",
    }),
  ).toBe("routing")

  expect(
    categorizeErrorOrWarning({
      type: "pcb_trace_error",
      drc_category: "unknown",
    }),
  ).toBe("unknown")
})
