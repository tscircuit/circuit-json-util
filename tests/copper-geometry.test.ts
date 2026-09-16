import { expect, test } from "bun:test"
import { Point } from "@flatten-js/core"
import type { PcbCopperPourBRep, PcbPlatedHole } from "circuit-json"
import {
  circlePolygon,
  copperPolygonsTouch,
  getPlatedHolePolygon,
  getPourPolygon,
  getSmtPadPolygon,
  getTraceSegmentPolygon,
  getViaPolygon,
  placePolygon,
  roundedRectangle,
} from "../index"

function pourWithAntipad(): PcbCopperPourBRep {
  return {
    type: "pcb_copper_pour",
    pcb_copper_pour_id: "pcb_copper_pour_0",
    shape: "brep",
    layer: "bottom",
    covered_with_solder_mask: true,
    brep_shape: {
      outer_ring: {
        vertices: [
          { x: -4, y: -3 },
          { x: 4, y: -3 },
          { x: 4, y: 3 },
          { x: -4, y: 3 },
        ],
      },
      inner_rings: [
        {
          vertices: [
            { x: 1, y: -1 },
            { x: 3, y: -1 },
            { x: 3, y: 1 },
            { x: 1, y: 1 },
          ],
        },
      ],
    },
  }
}

test("placePolygon rotates local points before translating to board coordinates", () => {
  const local = roundedRectangle({ x: 1, y: 0 }, 2, 1)
  const placed = placePolygon(local, { x: 10, y: 20 }, 90)
  expect(placed.box.xmin).toBeCloseTo(9.5)
  expect(placed.box.xmax).toBeCloseTo(10.5)
  expect(placed.box.ymin).toBeCloseTo(20)
  expect(placed.box.ymax).toBeCloseTo(22)
  expect(local.box.xmin).toBeCloseTo(0)
})

test("circlePolygon retains analytic circular area", () => {
  const polygon = circlePolygon({ x: 3, y: -2 }, 2)
  expect(polygon.area()).toBeCloseTo(4 * Math.PI)
  expect(polygon.contains(new Point(4.9, -2))).toBe(true)
  expect(polygon.contains(new Point(5.1, -2))).toBe(false)
})

test("roundedRectangle preserves rounded corners and rotation", () => {
  const polygon = roundedRectangle({ x: 0, y: 0 }, 4, 2, 0.5, 90)
  expect(polygon.area()).toBeCloseTo(8 - (4 - Math.PI) * 0.25)
  expect(polygon.box.xmax).toBeCloseTo(1)
  expect(polygon.box.ymax).toBeCloseTo(2)
  expect(polygon.contains(new Point(0.99, 1.99))).toBe(false)
})

test("getPourPolygon applies a rectangular pour's rotation", () => {
  const polygon = getPourPolygon({
    type: "pcb_copper_pour",
    pcb_copper_pour_id: "pcb_copper_pour_0",
    shape: "rect",
    center: { x: 5, y: 2 },
    width: 4,
    height: 2,
    rotation: 90,
    layer: "bottom",
    covered_with_solder_mask: true,
  })
  expect(polygon.box.xmin).toBeCloseTo(4)
  expect(polygon.box.ymin).toBeCloseTo(0)
  expect(polygon.area()).toBeCloseTo(8)
})

test("getPourPolygon normalizes clockwise polygon vertices", () => {
  const polygon = getPourPolygon({
    type: "pcb_copper_pour",
    pcb_copper_pour_id: "pcb_copper_pour_0",
    shape: "polygon",
    points: [
      { x: 0, y: 0 },
      { x: 0, y: 2 },
      { x: 2, y: 0 },
    ],
    layer: "top",
    covered_with_solder_mask: true,
  })
  expect(polygon.area()).toBeCloseTo(2)
  expect(polygon.contains(new Point(0.5, 0.5))).toBe(true)
})

test("getPourPolygon excludes straight BRep antipads without mutating input", () => {
  const pour = pourWithAntipad()
  const before = structuredClone(pour)
  const polygon = getPourPolygon(pour)
  expect(polygon.area()).toBeCloseTo(44)
  expect(polygon.contains(new Point(-2, 0))).toBe(true)
  expect(polygon.contains(new Point(2, 0))).toBe(false)
  expect(pour).toEqual(before)
})

test("getPourPolygon preserves curved BRep antipads", () => {
  const pour = pourWithAntipad()
  pour.brep_shape.inner_rings = [
    {
      vertices: [
        { x: 1, y: 0, bulge: 1 },
        { x: 3, y: 0, bulge: 1 },
      ],
    },
  ]
  const polygon = getPourPolygon(pour)
  expect(polygon.area()).toBeCloseTo(48 - Math.PI)
  expect(polygon.contains(new Point(2, 0.9))).toBe(false)
  expect(polygon.contains(new Point(2, 1.1))).toBe(true)
})

test("getPourPolygon preserves clockwise bulge arcs", () => {
  const pour = pourWithAntipad()
  pour.brep_shape = {
    outer_ring: {
      vertices: [
        { x: -2, y: 0, bulge: -1 },
        { x: 2, y: 0, bulge: -1 },
      ],
    },
    inner_rings: [],
  }
  const polygon = getPourPolygon(pour)
  expect(polygon.area()).toBeCloseTo(4 * Math.PI)
  expect(polygon.contains(new Point(0, 1.9))).toBe(true)
})

test("getSmtPadPolygon preserves a rotated pill outline", () => {
  const polygon = getSmtPadPolygon({
    type: "pcb_smtpad",
    pcb_smtpad_id: "pcb_smtpad_0",
    shape: "rotated_pill",
    x: 0,
    y: 0,
    width: 4,
    height: 2,
    radius: 1,
    ccw_rotation: 90,
    layer: "top",
  })
  expect(polygon.area()).toBeCloseTo(4 + Math.PI)
  expect(polygon.box.xmax).toBeCloseTo(1)
  expect(polygon.box.ymax).toBeCloseTo(2)
})

test("getPlatedHolePolygon excludes the circular drill", () => {
  const polygon = getPlatedHolePolygon({
    type: "pcb_plated_hole",
    pcb_plated_hole_id: "pcb_plated_hole_0",
    shape: "circle",
    x: 2,
    y: 3,
    outer_diameter: 2,
    hole_diameter: 1,
    layers: ["top", "bottom"],
  })
  expect(polygon.area()).toBeCloseTo(0.75 * Math.PI)
  expect(polygon.contains(new Point(2, 3))).toBe(false)
  expect(polygon.contains(new Point(2.75, 3))).toBe(true)
})

test("getPlatedHolePolygon places local polygon pads using component rotation", () => {
  const pad: PcbPlatedHole = {
    type: "pcb_plated_hole",
    pcb_plated_hole_id: "pcb_plated_hole_0",
    shape: "hole_with_polygon_pad",
    hole_shape: "circle",
    x: 10,
    y: 20,
    pad_outline: [
      { x: -2, y: -1 },
      { x: 2, y: -1 },
      { x: 2, y: 1 },
      { x: -2, y: 1 },
    ],
    hole_diameter: 0.6,
    hole_offset_x: 0,
    hole_offset_y: 0,
    layers: ["top", "bottom"],
  }
  const polygon = getPlatedHolePolygon(pad, 90)
  expect(polygon.box.xmin).toBeCloseTo(9)
  expect(polygon.box.ymin).toBeCloseTo(18)
  expect(polygon.contains(new Point(10, 20))).toBe(false)
})

test("getViaPolygon creates an annulus at its board position", () => {
  const polygon = getViaPolygon({ x: -3, y: 1 }, 1, 0.4)
  expect(polygon.area()).toBeCloseTo(Math.PI * (0.25 - 0.04))
  expect(polygon.contains(new Point(-3, 1))).toBe(false)
  expect(polygon.contains(new Point(-2.6, 1))).toBe(true)
})

test("getTraceSegmentPolygon includes round constant-width end caps", () => {
  const polygon = getTraceSegmentPolygon({ x: 0, y: 0 }, { x: 4, y: 0 }, 2)
  expect(polygon.area()).toBeCloseTo(8 + Math.PI)
  expect(polygon.box.xmin).toBeCloseTo(-1)
  expect(polygon.box.xmax).toBeCloseTo(5)
})

test("getTraceSegmentPolygon supports different endpoint widths", () => {
  const polygon = getTraceSegmentPolygon({ x: 0, y: 0 }, { x: 4, y: 0 }, 1, 2)
  expect(polygon.box.xmin).toBeCloseTo(-0.5)
  expect(polygon.box.xmax).toBeCloseTo(5)
  expect(polygon.contains(new Point(4, 0.9))).toBe(true)
  expect(polygon.contains(new Point(0, 0.9))).toBe(false)
})

test("getTraceSegmentPolygon handles coincident endpoints", () => {
  const polygon = getTraceSegmentPolygon({ x: 1, y: 2 }, { x: 1, y: 2 }, 1, 2)
  expect(polygon.area()).toBeCloseTo(Math.PI)
})

test("copperPolygonsTouch detects tangent copper edges", () => {
  expect(
    copperPolygonsTouch(
      circlePolygon({ x: 0, y: 0 }, 1),
      circlePolygon({ x: 2, y: 0 }, 1),
    ),
  ).toBe(true)
})

test("copperPolygonsTouch rejects a real gap", () => {
  expect(
    copperPolygonsTouch(
      circlePolygon({ x: 0, y: 0 }, 1),
      circlePolygon({ x: 2.001, y: 0 }, 1),
    ),
  ).toBe(false)
})

test("copperPolygonsTouch rejects copper inside an antipad", () => {
  expect(
    copperPolygonsTouch(
      getPourPolygon(pourWithAntipad()),
      getViaPolygon({ x: 2, y: 0 }, 1.4, 0.8),
    ),
  ).toBe(false)
})

test("copperPolygonsTouch detects contained copper", () => {
  expect(
    copperPolygonsTouch(
      getPourPolygon(pourWithAntipad()),
      getViaPolygon({ x: -2, y: 0 }, 1.4, 0.8),
    ),
  ).toBe(true)
})
