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

test("getBoundsOfPcbElements with pcb_hole uses hole_diameter", () => {
  const elements: AnyCircuitElement[] = [
    {
      type: "pcb_hole",
      pcb_hole_id: "pcb_hole_0",
      hole_shape: "circle",
      hole_diameter: 3.2,
      x: -15.5,
      y: -15.5,
    } as any,
  ]

  const bounds = getBoundsOfPcbElements(elements)

  expect(bounds).toEqual({
    minX: -17.1,
    minY: -17.1,
    maxX: -13.9,
    maxY: -13.9,
  })
})

test("getBoundsOfPcbElements with pcb_courtyard_rect", () => {
  const elements: AnyCircuitElement[] = [
    {
      type: "pcb_courtyard_rect",
      pcb_courtyard_rect_id: "cr1",
      pcb_component_id: "pc1",
      center: { x: 2, y: 3 },
      width: 4,
      height: 6,
      layer: "top",
    } as any,
  ]

  const bounds = getBoundsOfPcbElements(elements)

  expect(bounds).toEqual({ minX: 0, minY: 0, maxX: 4, maxY: 6 })
})

test("getBoundsOfPcbElements with pcb_courtyard_circle", () => {
  const elements: AnyCircuitElement[] = [
    {
      type: "pcb_courtyard_circle",
      pcb_courtyard_circle_id: "cc1",
      pcb_component_id: "pc1",
      center: { x: 5, y: 5 },
      radius: 3,
      layer: "top",
    } as any,
  ]

  const bounds = getBoundsOfPcbElements(elements)

  expect(bounds).toEqual({ minX: 2, minY: 2, maxX: 8, maxY: 8 })
})

test("getBoundsOfPcbElements with pcb_courtyard_outline", () => {
  const elements: AnyCircuitElement[] = [
    {
      type: "pcb_courtyard_outline",
      pcb_courtyard_outline_id: "co1",
      pcb_component_id: "pc1",
      layer: "top",
      outline: [
        { x: -3, y: -2 },
        { x: 7, y: -2 },
        { x: 7, y: 4 },
        { x: -3, y: 4 },
      ],
    } as any,
  ]

  const bounds = getBoundsOfPcbElements(elements)

  expect(bounds).toEqual({ minX: -3, minY: -2, maxX: 7, maxY: 4 })
})

test("getBoundsOfPcbElements with pcb_courtyard_polygon", () => {
  const elements: AnyCircuitElement[] = [
    {
      type: "pcb_courtyard_polygon",
      pcb_courtyard_polygon_id: "cp1",
      pcb_component_id: "pc1",
      layer: "top",
      points: [
        { x: 1, y: 1 },
        { x: 6, y: 1 },
        { x: 6, y: 8 },
        { x: 1, y: 8 },
      ],
    } as any,
  ]

  const bounds = getBoundsOfPcbElements(elements)

  expect(bounds).toEqual({ minX: 1, minY: 1, maxX: 6, maxY: 8 })
})

test("getBoundsOfPcbElements with rectangular plated hole pad includes pad extents", () => {
  const elements: AnyCircuitElement[] = [
    {
      type: "pcb_plated_hole",
      pcb_plated_hole_id: "pcb_plated_hole_4",
      x: -15.81,
      y: -13.5,
      shape: "circular_hole_with_rect_pad",
      hole_diameter: 1,
      rect_pad_width: 1.5,
      rect_pad_height: 1.5,
      hole_offset_x: 0,
      hole_offset_y: 0,
      rect_ccw_rotation: 0,
      layers: ["top", "bottom"],
    } as any,
  ]

  const bounds = getBoundsOfPcbElements(elements)

  expect(bounds.minX).toBeCloseTo(-16.56)
  expect(bounds.minY).toBeCloseTo(-14.25)
  expect(bounds.maxX).toBeCloseTo(-15.06)
  expect(bounds.maxY).toBeCloseTo(-12.75)
})
