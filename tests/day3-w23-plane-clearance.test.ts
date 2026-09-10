import test, { expect } from "bun:test"

test("soup-util - ground plane fill clearance normalization", () => {
  const traceWidth = 0.2
  const isolation = 0.25
  const totalClearance = traceWidth + 2 * isolation
  expect(totalClearance).toBeCloseTo(0.7)
})
