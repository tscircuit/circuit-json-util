import { expect, test } from "bun:test"
import { categorizeErrorOrWarning } from "../lib/categorize-error-or-warning"

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
    "unknown",
  ] as const) {
    expect(
      categorizeErrorOrWarning({
        type: "source_property_ignored_warning",
        drc_category: category,
      }),
    ).toBe(category)
  }
})
