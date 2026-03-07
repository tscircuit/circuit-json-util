import { getBoundsOfPcbElements } from "../lib/get-bounds-of-pcb-elements"
import type { AnyCircuitElement } from "circuit-json"
import { expect, test } from "bun:test"

test("getBoundsOfPcbElements", () => {
  const elements: AnyCircuitElement[] = [
    {
      type: "pcb_component",
      pcb_component_id: "comp1",
      source_component_id: "source_comp1",
      center: { x: 0, y: 0 },
      width: 10,
      height: 5,
      rotation: 0,
      layer: "top",
      obstructs_within_bounds: false,
    },
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "pad1",
      x: 15,
      y: 15,
      width: 2,
      height: 2,
      layer: "top",
      shape: "rect",
    },
    {
      type: "pcb_trace",
      pcb_trace_id: "trace1",
      route: [
        { x: -5, y: -5, width: 1, layer: "top", route_type: "wire" },
        { x: 20, y: 20, width: 1, layer: "top", route_type: "wire" },
      ],
    },
  ]

  const bounds = getBoundsOfPcbElements(elements)

  expect(bounds).toEqual({ minX: -5, minY: -5, maxX: 20, maxY: 20 })
})

test("getBoundsOfPcbElements with polygon-shaped SMT pad", () => {
  const elements: AnyCircuitElement[] = [
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "pcb_smtpad_2",
      pcb_component_id: "pcb_component_0",
      pcb_port_id: "pcb_port_2",
      layer: "top",
      shape: "polygon",
      x: 0,
      y: 0,
      points: [
        { x: 0.22597110000003795, y: 0.47454819999995834 },
        { x: 0.585965299999998, y: 0.47454819999995834 },
        { x: 0.585965299999998, y: 0.17452339999999822 },
        { x: 0.4059555000000046, y: 0.17452339999999822 },
        { x: 0.22597110000003795, y: 0.35453319999999167 },
      ],
    } as any,
  ]

  const bounds = getBoundsOfPcbElements(elements)

  expect(bounds).toEqual({
    minX: 0.22597110000003795,
    minY: 0.17452339999999822,
    maxX: 0.585965299999998,
    maxY: 0.47454819999995834,
  })
})

const expectBoundsClose = (
  actual: { minX: number; minY: number; maxX: number; maxY: number },
  expected: { minX: number; minY: number; maxX: number; maxY: number },
) => {
  expect(actual.minX).toBeCloseTo(expected.minX, 8)
  expect(actual.minY).toBeCloseTo(expected.minY, 8)
  expect(actual.maxX).toBeCloseTo(expected.maxX, 8)
  expect(actual.maxY).toBeCloseTo(expected.maxY, 8)
}

test("getBoundsOfPcbElements handles pcb_plated_hole oval rotation", () => {
  const elements: AnyCircuitElement[] = [
    {
      type: "pcb_plated_hole",
      shape: "oval",
      pcb_plated_hole_id: "ph1",
      x: 10,
      y: 20,
      outer_width: 8,
      outer_height: 4,
      hole_width: 4,
      hole_height: 2,
      ccw_rotation: 30,
      layers: ["top", "bottom"],
    } as any,
  ]

  const bounds = getBoundsOfPcbElements(elements)
  expectBoundsClose(bounds, {
    minX: 5.53589838,
    minY: 16.26794919,
    maxX: 14.46410162,
    maxY: 23.73205081,
  })
})

test("getBoundsOfPcbElements handles pcb_plated_hole circular_hole_with_rect_pad", () => {
  const elements: AnyCircuitElement[] = [
    {
      type: "pcb_plated_hole",
      shape: "circular_hole_with_rect_pad",
      pcb_plated_hole_id: "ph2",
      x: 0,
      y: 0,
      hole_shape: "circle",
      pad_shape: "rect",
      hole_diameter: 4,
      rect_pad_width: 6,
      rect_pad_height: 2,
      hole_offset_x: 4,
      hole_offset_y: 0,
      layers: ["top", "bottom"],
    } as any,
  ]

  const bounds = getBoundsOfPcbElements(elements)
  expect(bounds).toEqual({ minX: -3, minY: -2, maxX: 6, maxY: 2 })
})

test("getBoundsOfPcbElements handles pcb_plated_hole pill_hole_with_rect_pad", () => {
  const elements: AnyCircuitElement[] = [
    {
      type: "pcb_plated_hole",
      shape: "pill_hole_with_rect_pad",
      pcb_plated_hole_id: "ph3",
      x: 0,
      y: 0,
      hole_shape: "pill",
      pad_shape: "rect",
      hole_width: 10,
      hole_height: 2,
      rect_pad_width: 4,
      rect_pad_height: 4,
      hole_offset_x: 5,
      hole_offset_y: 0,
      layers: ["top", "bottom"],
    } as any,
  ]

  const bounds = getBoundsOfPcbElements(elements)
  expect(bounds).toEqual({ minX: -2, minY: -2, maxX: 10, maxY: 2 })
})

test("getBoundsOfPcbElements handles pcb_plated_hole rotated_pill_hole_with_rect_pad", () => {
  const elements: AnyCircuitElement[] = [
    {
      type: "pcb_plated_hole",
      shape: "rotated_pill_hole_with_rect_pad",
      pcb_plated_hole_id: "ph4",
      x: 0,
      y: 0,
      hole_shape: "rotated_pill",
      pad_shape: "rect",
      hole_width: 8,
      hole_height: 2,
      hole_ccw_rotation: 45,
      rect_pad_width: 4,
      rect_pad_height: 2,
      rect_ccw_rotation: 0,
      hole_offset_x: 0,
      hole_offset_y: 0,
      layers: ["top", "bottom"],
    } as any,
  ]

  const bounds = getBoundsOfPcbElements(elements)
  expectBoundsClose(bounds, {
    minX: -3.53553391,
    minY: -3.53553391,
    maxX: 3.53553391,
    maxY: 3.53553391,
  })
})

test("getBoundsOfPcbElements handles pcb_plated_hole hole_with_polygon_pad with rotation", () => {
  const elements: AnyCircuitElement[] = [
    {
      type: "pcb_plated_hole",
      shape: "hole_with_polygon_pad",
      pcb_plated_hole_id: "ph5",
      x: 10,
      y: 5,
      hole_shape: "circle",
      hole_diameter: 2,
      hole_offset_x: 3,
      hole_offset_y: 0,
      ccw_rotation: 90,
      pad_outline: [
        { x: -1, y: -2 },
        { x: 2, y: -2 },
        { x: 2, y: 1 },
        { x: -1, y: 1 },
      ],
      layers: ["top", "bottom"],
    } as any,
  ]

  const bounds = getBoundsOfPcbElements(elements)
  expect(bounds).toEqual({ minX: 9, minY: 4, maxX: 12, maxY: 7 })
})
