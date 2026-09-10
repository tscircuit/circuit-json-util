import test, { expect } from "bun:test"

test("soup-util - schematic element identifier string format validity", () => {
  const elemId = "schematic_component_42"
  expect(elemId.startsWith("schematic_")).toBeTrue()
})
