import { expect, test } from "bun:test"
import { rotateDEG } from "transformation-matrix"
import type { AnyCircuitElement } from "circuit-json"
import { transformPCBElements } from "../lib/transform-soup-elements"

test(
  "transformPCBElements swaps rect-pad plated hole dimensions on 90 degree rotation",
  () => {
    const hole: AnyCircuitElement = {
      type: "pcb_plated_hole",
      shape: "circular_hole_with_rect_pad",
      x: 0,
      y: 0,
      hole_diameter: 0.8,
      rect_pad_width: 1.0,
      rect_pad_height: 2.5,
      hole_offset_x: 0,
      hole_offset_y: 0,
      layers: ["top", "bottom"],
      pcb_plated_hole_id: "ph1",
    } as unknown as AnyCircuitElement

    transformPCBElements([hole], rotateDEG(90))

    const transformed = hole as unknown as Record<string, number>
    expect(transformed.rect_pad_width).toBe(2.5)
    expect(transformed.rect_pad_height).toBe(1.0)
  },
)

test(
  "transformPCBElements swaps pill-hole drill dimensions on 90 degree rotation",
  () => {
    const hole: AnyCircuitElement = {
      type: "pcb_plated_hole",
      shape: "pill_hole_with_rect_pad",
      x: 0,
      y: 0,
      hole_shape: "pill",
      pad_shape: "rect",
      hole_width: 1.2,
      hole_height: 0.6,
      rect_pad_width: 2.0,
      rect_pad_height: 1.0,
      hole_offset_x: 0,
      hole_offset_y: 0,
      layers: ["top", "bottom"],
      pcb_plated_hole_id: "ph2",
    } as unknown as AnyCircuitElement

    transformPCBElements([hole], rotateDEG(90))

    const transformed = hole as unknown as Record<string, number>
    expect(transformed.hole_width).toBe(0.6)
    expect(transformed.hole_height).toBe(1.2)
    expect(transformed.rect_pad_width).toBe(1.0)
    expect(transformed.rect_pad_height).toBe(2.0)
  },
)

test(
  "transformPCBElements swaps oval plated hole outer and drill dimensions on 90 degree rotation",
  () => {
    const hole: AnyCircuitElement = {
      type: "pcb_plated_hole",
      shape: "oval",
      x: 0,
      y: 0,
      outer_width: 2.0,
      outer_height: 1.0,
      hole_width: 1.0,
      hole_height: 0.5,
      ccw_rotation: 0,
      layers: ["top", "bottom"],
      pcb_plated_hole_id: "ph3",
    } as unknown as AnyCircuitElement

    transformPCBElements([hole], rotateDEG(90))

    const transformed = hole as unknown as Record<string, number>
    expect(transformed.outer_width).toBe(1.0)
    expect(transformed.outer_height).toBe(2.0)
    expect(transformed.hole_width).toBe(0.5)
    expect(transformed.hole_height).toBe(1.0)
    expect(transformed.ccw_rotation).toBe(0)
  },
)

test("transformPCBElements leaves circular plated holes unchanged on rotation", () => {
  const hole: AnyCircuitElement = {
    type: "pcb_plated_hole",
    shape: "circle",
    x: 1,
    y: 2,
    outer_diameter: 1.0,
    hole_diameter: 0.5,
    layers: ["top", "bottom"],
    pcb_plated_hole_id: "ph4",
  } as unknown as AnyCircuitElement

  transformPCBElements([hole], rotateDEG(90))

  expect((hole as unknown as Record<string, number>).outer_diameter).toBe(1.0)
  expect((hole as unknown as Record<string, number>).hole_diameter).toBe(0.5)
})
