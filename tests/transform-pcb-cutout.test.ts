import { expect, test } from "bun:test"
import { rotateDEG } from "transformation-matrix"
import type { AnyCircuitElement } from "circuit-json"
import { transformPCBElements } from "../lib/transform-soup-elements"

test("transformPCBElements rotates pcb_cutout and swaps width/height for 90 degree rotation", () => {
  const elms: AnyCircuitElement[] = [
    {
      type: "pcb_cutout",
      pcb_cutout_id: "cutout1",
      shape: "rect",
      x: 10,
      y: 5,
      width: 20,
      height: 10,
    } as any,
  ]

  const rotated = transformPCBElements(elms, rotateDEG(90))

  const cutout = rotated[0] as any
  
  // Position should be rotated
  expect(cutout.x).toBeCloseTo(-5)
  expect(cutout.y).toBeCloseTo(10)
  
  // Width and height should be swapped for 90 degree rotation
  expect(cutout.width).toBe(10)
  expect(cutout.height).toBe(20)
})

test("transformPCBElements does not swap width/height for 180 degree rotation", () => {
  const elms: AnyCircuitElement[] = [
    {
      type: "pcb_cutout",
      pcb_cutout_id: "cutout1",
      shape: "rect",
      x: 10,
      y: 5,
      width: 20,
      height: 10,
    } as any,
  ]

  const rotated = transformPCBElements(elms, rotateDEG(180))

  const cutout = rotated[0] as any
  
  // Position should be rotated
  expect(cutout.x).toBeCloseTo(-10)
  expect(cutout.y).toBeCloseTo(-5)
  
  // Width and height should NOT be swapped for 180 degree rotation
  expect(cutout.width).toBe(20)
  expect(cutout.height).toBe(10)
})

test("transformPCBElements handles pcb_cutout without shape property", () => {
  const elms: AnyCircuitElement[] = [
    {
      type: "pcb_cutout",
      pcb_cutout_id: "cutout1",
      x: 10,
      y: 5,
      width: 20,
      height: 10,
    } as any,
  ]

  const rotated = transformPCBElements(elms, rotateDEG(90))

  const cutout = rotated[0] as any
  
  // Position should be rotated
  expect(cutout.x).toBeCloseTo(-5)
  expect(cutout.y).toBeCloseTo(10)
  
  // Width and height should NOT be swapped if shape is not explicitly "rect"
  expect(cutout.width).toBe(20)
  expect(cutout.height).toBe(10)
})