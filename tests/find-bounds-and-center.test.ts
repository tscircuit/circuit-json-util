import { expect, test } from "bun:test"
import { findBoundsAndCenter } from "lib/find-bounds-and-center"
import type { AnyCircuitElement } from "circuit-json"

test("should return default values for empty input", () => {
  const result = findBoundsAndCenter([])
  expect(result).toEqual({ center: { x: 0, y: 0 }, width: 0, height: 0 })
})

test("should calculate bounds and center for a single element", () => {
  const elements = [
    {
      type: "pcb_component",
      x: 10,
      y: 20,
      width: 5,
      height: 5,
    } as unknown as AnyCircuitElement,
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
    {
      type: "pcb_component",
      x: 0,
      y: 0,
      width: 10,
      height: 10,
    } as unknown as AnyCircuitElement,
    {
      type: "pcb_component",
      x: 20,
      y: 20,
      width: 10,
      height: 10,
    } as unknown as AnyCircuitElement,
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
    {
      type: "pcb_component",
      x: 20,
      y: 20,
      width: 10,
      height: 10,
    } as unknown as AnyCircuitElement,
  ]
  const result = findBoundsAndCenter(elements as unknown as AnyCircuitElement[])
  expect(result).toEqual({
    center: { x: 12.475, y: 12.475 },
    width: 25.05,
    height: 25.05,
  })
})

test("should handle circular_hole_with_rect_pad plated hole correctly", () => {
  const elements = [
    {
      type: "pcb_plated_hole",
      pcb_plated_hole_id: "pcb_plated_hole_0",
      x: 0,
      y: 0,
      shape: "circular_hole_with_rect_pad",
      hole_diameter: 1,
      rect_pad_width: 1.5,
      rect_pad_height: 1.5,
      hole_offset_x: 0,
      hole_offset_y: 0,
      rect_ccw_rotation: 0,
      layers: ["top", "bottom"],
    } as AnyCircuitElement,
  ]
  const result = findBoundsAndCenter(elements as unknown as AnyCircuitElement[])
  expect(result).toEqual({
    center: { x: 0, y: 0 },
    width: 1.5,
    height: 1.5,
  })
})

test("should handle circular_hole_with_rect_pad where hole is larger than pad", () => {
  const elements = [
    {
      type: "pcb_plated_hole",
      pcb_plated_hole_id: "pcb_plated_hole_1",
      x: 5,
      y: 5,
      shape: "circular_hole_with_rect_pad",
      hole_diameter: 3,
      rect_pad_width: 2,
      rect_pad_height: 2,
      hole_offset_x: 0,
      hole_offset_y: 0,
      rect_ccw_rotation: 0,
      layers: ["top", "bottom"],
    } as unknown as AnyCircuitElement,
  ]
  const result = findBoundsAndCenter(elements as unknown as AnyCircuitElement[])
  expect(result).toEqual({
    center: { x: 5, y: 5 },
    width: 3,
    height: 3,
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
      height: 4,
    } as unknown as AnyCircuitElement,
  ]
  const result = findBoundsAndCenter(elements as unknown as AnyCircuitElement[])
  expect(result).toEqual({
    center: { x: 6, y: 6 },
    width: 12,
    height: 12,
  })
})
