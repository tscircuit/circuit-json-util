import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { computeGapBetweenCopper } from "../lib/compute-gap-between-copper"

test("computeGapBetweenCopper for two circles", () => {
  const a = {
    type: "pcb_smtpad",
    pcb_smtpad_id: "a",
    shape: "circle",
    x: 0,
    y: 0,
    radius: 1,
    layer: "top",
  } satisfies AnyCircuitElement

  const b = {
    type: "pcb_smtpad",
    pcb_smtpad_id: "b",
    shape: "circle",
    x: 5,
    y: 0,
    radius: 1,
    layer: "top",
  } satisfies AnyCircuitElement

  expect(computeGapBetweenCopper(a, b)).toBeCloseTo(3)
})

test("computeGapBetweenCopper for circle to rect", () => {
  const circle = {
    type: "pcb_smtpad",
    pcb_smtpad_id: "c1",
    shape: "circle",
    x: 0,
    y: 0,
    radius: 1,
    layer: "top",
  } satisfies AnyCircuitElement

  const rect = {
    type: "pcb_smtpad",
    pcb_smtpad_id: "r1",
    shape: "rect",
    x: 5,
    y: 0,
    width: 2,
    height: 2,
    layer: "top",
  } satisfies AnyCircuitElement

  expect(computeGapBetweenCopper(circle, rect)).toBeCloseTo(3)
})

test("computeGapBetweenCopper for polygon to polygon", () => {
  const left = {
    type: "pcb_smtpad",
    pcb_smtpad_id: "poly1",
    shape: "polygon",
    layer: "top",
    points: [
      { x: 0, y: 0 },
      { x: 2, y: 0 },
      { x: 2, y: 2 },
      { x: 0, y: 2 },
    ],
  } satisfies AnyCircuitElement

  const right = {
    type: "pcb_smtpad",
    pcb_smtpad_id: "poly2",
    shape: "polygon",
    layer: "top",
    points: [
      { x: 4, y: 0 },
      { x: 6, y: 0 },
      { x: 6, y: 2 },
      { x: 4, y: 2 },
    ],
  } satisfies AnyCircuitElement

  expect(computeGapBetweenCopper(left, right)).toBeCloseTo(2)
})

test("computeGapBetweenCopper handles traces by decomposing into circles and rects", () => {
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
    pcb_smtpad_id: "p1",
    shape: "circle",
    x: 5,
    y: 2,
    radius: 1,
    layer: "top",
  } satisfies AnyCircuitElement

  expect(computeGapBetweenCopper(trace, circlePad)).toBeCloseTo(0.5)
})

test("computeGapBetweenCopper returns 0 for overlapping shapes", () => {
  const a = {
    type: "pcb_smtpad",
    pcb_smtpad_id: "oa",
    shape: "rect",
    x: 0,
    y: 0,
    width: 4,
    height: 4,
    layer: "top",
  } satisfies AnyCircuitElement

  const b = {
    type: "pcb_smtpad",
    pcb_smtpad_id: "ob",
    shape: "circle",
    x: 1,
    y: 0,
    radius: 1,
    layer: "top",
  } satisfies AnyCircuitElement

  expect(computeGapBetweenCopper(a, b)).toBe(0)
})
