import { expect, test } from "bun:test"
import { getDebugLayoutObject } from "../lib/utils/get-layout-debug-object"

test("should handle regular elements with x, y, width, height", () => {
  const element = {
    type: "pcb_component",
    x: 10,
    y: 20,
    width: 5,
    height: 3,
  }

  const result = getDebugLayoutObject(element)

  expect(result).toEqual({
    x: 10,
    y: 20,
    width: 5,
    height: 3,
    title: "?",
    content: element,
    bg_color: expect.any(String),
  })
})

test("should handle polygon elements with points array", () => {
  const element = {
    type: "pcb_smtpad",
    pcb_smtpad_id: "pad1",
    shape: "polygon",
    points: [
      { x: 0, y: 0 },
      { x: 4, y: 0 },
      { x: 4, y: 6 },
      { x: 0, y: 6 },
    ],
    layer: "top",
  }

  const result = getDebugLayoutObject(element)

  expect(result).toEqual({
    x: 2, // center x: (0 + 4) / 2
    y: 3, // center y: (0 + 6) / 2
    width: 4, // maxX - minX: 4 - 0
    height: 6, // maxY - minY: 6 - 0
    title: "?",
    content: element,
    bg_color: expect.any(String),
  })
})

test("should handle polygon with irregular shape", () => {
  const element = {
    type: "pcb_smtpad",
    shape: "polygon",
    points: [
      { x: 1, y: 1 },
      { x: 5, y: 2 },
      { x: 3, y: 8 },
      { x: -1, y: 4 },
    ],
  }

  const result = getDebugLayoutObject(element)

  expect(result).toEqual({
    x: 2, // center x: (-1 + 5) / 2
    y: 4.5, // center y: (1 + 8) / 2
    width: 6, // maxX - minX: 5 - (-1)
    height: 7, // maxY - minY: 8 - 1
    title: "?",
    content: element,
    bg_color: expect.any(String),
  })
})

test("should return null for elements without coordinates or points", () => {
  const element = {
    type: "some_element",
    name: "test",
  }

  const result = getDebugLayoutObject(element)

  expect(result).toBeNull()
})

test("should handle empty points array", () => {
  const element = {
    type: "pcb_smtpad",
    points: [],
  }

  const result = getDebugLayoutObject(element)

  expect(result).toBeNull()
})
