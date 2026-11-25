import { expect, test } from "bun:test"
import { categorizeErrorOrWarning } from "../lib/categorize-error-or-warning"

test("categorizeErrorOrWarning leaves placement-check diagnostics uncategorized", () => {
  expect(categorizeErrorOrWarning("pcb_pad_pad_clearance_error")).toBe(
    "unknown",
  )
  expect(
    categorizeErrorOrWarning("pcb_component_missing_courtyard_warning"),
  ).toBe("unknown")
  expect(categorizeErrorOrWarning("pcb_keepout_overlap_warning")).toBe(
    "unknown",
  )
})
