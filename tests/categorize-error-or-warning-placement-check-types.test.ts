import { expect, test } from "bun:test"
import { categorizeErrorOrWarning } from "../lib/categorize-error-or-warning"

test("categorizeErrorOrWarning categorizes every diagnostic emitted by runAllPlacementChecks", () => {
  expect(categorizeErrorOrWarning("pcb_pad_pad_clearance_error")).toBe(
    "placement",
  )
  expect(
    categorizeErrorOrWarning("pcb_component_missing_courtyard_warning"),
  ).toBe("placement")
  expect(categorizeErrorOrWarning("pcb_keepout_overlap_warning")).toBe(
    "placement",
  )
})
