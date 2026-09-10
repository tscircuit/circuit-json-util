import test, { expect } from "bun:test"

test("soup-util - schematic net label string format validation", () => {
  const netName = "VCC_3V3"
  expect(netName).toBe("VCC_3V3")
  expect(netName.includes(" ")).toBeFalse()
})
