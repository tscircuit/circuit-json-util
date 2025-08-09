import { expect, test } from "bun:test"
import { getMinimumFlexContainer } from "../lib/get-minimum-flex-container"

test("getMinimumFlexContainer computes correct size for row direction", () => {
  const children = [
    { width: 10, height: 5 },
    { width: 20, height: 7 },
  ]
  const { width, height } = getMinimumFlexContainer(children, {
    direction: "row",
  })

  expect(width).toBe(30)
  expect(height).toBe(7)
})

test("getMinimumFlexContainer computes correct size for column direction", () => {
  const children = [
    { width: 10, height: 5 },
    { width: 20, height: 7 },
  ]
  const { width, height } = getMinimumFlexContainer(children, {
    direction: "column",
  })

  expect(width).toBe(20)
  expect(height).toBe(12)
})
