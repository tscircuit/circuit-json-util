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
