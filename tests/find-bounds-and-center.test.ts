import { expect, test } from "bun:test"
import { findBoundsAndCenter } from "lib/find-bounds-and-center"
import type { AnyCircuitElement } from "circuit-json"

test("should return default values for empty input", () => {
  const result = findBoundsAndCenter([])
  expect(result).toEqual({ center: { x: 0, y: 0 }, width: 0, height: 0 })
})

test("should calculate bounds and center for a single element", () => {
  const elements = [
    { type: "pcb_component", x: 10, y: 20, width: 5, height: 5 } as unknown as AnyCircuitElement,
  ]
  const result = findBoundsAndCenter(elements as unknown as AnyCircuitElement[])
  expect(result).toEqual({
    center: { x: 10, y: 20 },
    width: 5,
    height: 5,
  })
})

test("should calculate bounds and center for multiple elements", () => {
  const elements = [
    { type: "pcb_component", x: 0, y: 0, width: 10, height: 10 } as unknown as AnyCircuitElement,
    { type: "pcb_component", x: 20, y: 20, width: 10, height: 10 } as unknown as AnyCircuitElement,
  ]
  const result = findBoundsAndCenter(elements as unknown as AnyCircuitElement[])
  expect(result).toEqual({
    center: { x: 10, y: 10 },
    width: 30,
    height: 30,
  })
})

test("should handle pcb_trace elements correctly", () => {
  const elements = [
    {
      type: "pcb_trace",
      route: [
        { x: 0, y: 0 },
        { x: 10, y: 10 },
      ],
    } as unknown as AnyCircuitElement,
    { type: "pcb_component", x: 20, y: 20, width: 10, height: 10 } as unknown as AnyCircuitElement,
  ]
  const result = findBoundsAndCenter(elements as unknown as AnyCircuitElement[])
  expect(result).toEqual({
    center: { x: 12.475, y: 12.475 },
    width: 25.05,
    height: 25.05,
  })
})

test("should handle polygon SMT pad elements correctly", () => {
  const elements = [
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "pad1",
      shape: "polygon",
      points: [
        { x: 0, y: 0 },
        { x: 5, y: 0 },
        { x: 5, y: 3 },
        { x: 0, y: 3 },
      ],
      layer: "top",
    } as unknown as AnyCircuitElement,
    {
      type: "pcb_component", 
      x: 10, 
      y: 10, 
      width: 4, 
      height: 4 
    } as unknown as AnyCircuitElement,
  ]
  const result = findBoundsAndCenter(elements as unknown as AnyCircuitElement[])
  expect(result).toEqual({
    center: { x: 6, y: 6 },
    width: 12,
    height: 12,
  })
})
