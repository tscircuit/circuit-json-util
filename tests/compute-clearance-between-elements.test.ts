import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { computeClearanceBetweenElements } from "../lib/compute-clearance-between-elements"

test("computeClearanceBetweenElements includes pcb_hole geometry", () => {
  const hole = {
    type: "pcb_hole",
    pcb_hole_id: "h1",
    hole_shape: "circle",
    hole_diameter: 2,
    x: 0,
    y: 0,
  } satisfies AnyCircuitElement

  const smtPad = {
    type: "pcb_smtpad",
    pcb_smtpad_id: "p1",
    shape: "circle",
    radius: 1,
    x: 4,
    y: 0,
    layer: "top",
  } satisfies AnyCircuitElement

  expect(computeClearanceBetweenElements(hole, smtPad)).toBeCloseTo(2)
})

test("computeClearanceBetweenElements includes pcb_keepout geometry", () => {
  const keepout = {
    type: "pcb_keepout",
    pcb_keepout_id: "k1",
    shape: "rect",
    center: { x: 0, y: 0 },
    width: 2,
    height: 2,
    ccw_rotation: 0,
    layers: ["top"],
  } as AnyCircuitElement

  const via = {
    type: "pcb_via",
    pcb_via_id: "v1",
    x: 4,
    y: 0,
    hole_diameter: 0.3,
    outer_diameter: 1,
    layers: ["top", "bottom"],
  } satisfies AnyCircuitElement

  expect(computeClearanceBetweenElements(keepout, via)).toBeCloseTo(2.5)
})

test("computeClearanceBetweenElements still works for copper trace decomposition", () => {
  const trace = {
    type: "pcb_trace",
    pcb_trace_id: "t1",
    route: [
      { route_type: "wire", x: 0, y: 0, width: 1, layer: "top" },
      { route_type: "wire", x: 10, y: 0, width: 1, layer: "top" },
    ],
  } satisfies AnyCircuitElement

  const circlePad = {
    type: "pcb_smtpad",
    pcb_smtpad_id: "p2",
    shape: "circle",
    x: 5,
    y: 2,
    radius: 1,
    layer: "top",
  } satisfies AnyCircuitElement

  expect(computeClearanceBetweenElements(trace, circlePad)).toBeCloseTo(0.5)
})
