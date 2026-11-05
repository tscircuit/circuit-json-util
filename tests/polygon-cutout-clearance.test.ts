import { expect, test, describe } from "bun:test"
import { computeClearanceBetweenElements } from "lib/compute-clearance-between-elements"
import type { AnyCircuitElement } from "circuit-json"

const polygonCutout = {
  type: "pcb_cutout",
  pcb_cutout_id: "cutout0",
  shape: "polygon",
  points: [
    { x: 0, y: 0 },
    { x: 2, y: 0 },
    { x: 2, y: 2 },
    { x: 0, y: 2 },
  ],
} as any

const circleElement = {
  type: "pcb_cutout",
  pcb_cutout_id: "cutout1",
  shape: "circle",
  center: { x: 4, y: 1 },
  radius: 0.5,
} as any

describe("computeClearanceBetweenElements — points-only polygon (issue #284)", () => {
  test("polygon without center gets real clearance, not Infinity", () => {
    const d = computeClearanceBetweenElements(
      polygonCutout as AnyCircuitElement,
      circleElement as AnyCircuitElement,
    )
    expect(d).toBe(1.5)
  })

  test("argument order does not matter", () => {
    const d = computeClearanceBetweenElements(
      circleElement as AnyCircuitElement,
      polygonCutout as AnyCircuitElement,,
    )
    expect(d).toBe(1.5)
  })

  test("touching geometry returns zero clearance", () => {
    const circleTouching = {
      ...circleElement,
      center: { x: 2.5, y: 1 },
    }
    const d = computeClearanceBetweenElements(
      polygonCutout as AnyCircuitElement,
      circleTouching as AnyCircuitElement,,
    )
    expect(d).toBe(0)
  })

  test("contained circle returns zero clearance", () => {
    const circleInside = {
      ...circleElement,
      center: { x: 1, y: 1 },
      radius: 0.2,
    }
    const d = computeClearanceBetweenElements(
      polygonCutout as AnyCircuitElement,
      circleInside as AnyCircuitElement,,
    )
    expect(d).toBe(0)
  })

  test("polygons with fewer than 3 finite points are ignored (no crash)", () => {
    const degenerate = {
      ...polygonCutout,
      points: [
        { x: 0, y: 0 },
        { x: 2, y: 0 },
      ],
    }
    const d = computeClearanceBetweenElements(
      degenerate as AnyCircuitElement,
      circleElement as AnyCircuitElement,,
    )
    expect(d).toBe(Number.POSITIVE_INFINITY)
  })

  test("zero coordinates in polygon points work", () => {
    const shifted = {
      ...polygonCutout,
      points: [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 1, y: 1 },
        { x: 0, y: 1 },
      ],
    }
    const d = computeClearanceBetweenElements(
      shifted as AnyCircuitElement,
      circleElement as AnyCircuitElement,,
    )
    expect(d).toBeGreaterThan(0)
    expect(Number.isFinite(d)).toBe(true)
  })

  test("center-based circle/rect shapes still work (control)", () => {
    const rect = {
      type: "pcb_cutout",
      pcb_cutout_id: "r0",
      shape: "rect",
      center: { x: 0, y: 0 },
      width: 2,
      height: 2,
    } as any
    const d = computeClearanceBetweenElements(
      rect as AnyCircuitElement,
      circleElement as AnyCircuitElement,,
    )
    expect(d).toBe(1.5)
  })
})
