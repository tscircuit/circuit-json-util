import { expect, test } from "bun:test"
import type { PcbPlatedHole } from "circuit-json"
import {
  type Matrix,
  applyToPoint,
  compose,
  rotateDEG,
  scale,
  translate,
} from "transformation-matrix"
import { transformPCBElement } from "../index"
import { getPlatedHolePolygon } from "../lib/copper-geometry"

// A 3x1mm pad with its drill off-center, in each shape that has a hole offset.
const getOffsetHoles = () => {
  const base = {
    type: "pcb_plated_hole",
    pcb_plated_hole_id: "hole",
    layers: ["top", "bottom"],
    x: 2,
    y: -1,
    hole_offset_x: 1,
    hole_offset_y: 0.1,
  }
  const rectPad = {
    pad_shape: "rect",
    rect_pad_width: 3,
    rect_pad_height: 1,
    rect_border_radius: 0,
  }
  return [
    {
      ...base,
      ...rectPad,
      shape: "circular_hole_with_rect_pad",
      hole_shape: "circle",
      hole_diameter: 0.5,
      rect_ccw_rotation: 0,
    },
    {
      ...base,
      ...rectPad,
      shape: "pill_hole_with_rect_pad",
      hole_shape: "pill",
      hole_width: 0.3,
      hole_height: 0.6,
    },
    {
      ...base,
      ...rectPad,
      shape: "rotated_pill_hole_with_rect_pad",
      hole_shape: "rotated_pill",
      hole_width: 0.3,
      hole_height: 0.6,
      hole_ccw_rotation: 0,
      rect_ccw_rotation: 0,
    },
    {
      ...base,
      shape: "hole_with_polygon_pad",
      hole_shape: "circle",
      hole_diameter: 0.5,
      ccw_rotation: 0,
      pad_outline: [
        { x: -1.5, y: -0.5 },
        { x: 1.5, y: -0.5 },
        { x: 1.5, y: 0.5 },
        { x: -1.5, y: 0.5 },
      ],
    },
  ] as unknown as Array<PcbPlatedHole & Record<string, number>>
}

const placements: Matrix[] = [
  rotateDEG(90),
  rotateDEG(-90),
  rotateDEG(180),
  compose(translate(3, -2), rotateDEG(37)),
  scale(1, -1),
  scale(-1, 1),
  compose(translate(4, 1), scale(-1, 1), rotateDEG(37)),
]

test("a quarter turn rotates the hole offset", () => {
  for (const hole of getOffsetHoles()) {
    transformPCBElement(hole, rotateDEG(90))
    expect(hole.hole_offset_x).toBeCloseTo(-0.1, 9)
    expect(hole.hole_offset_y).toBeCloseTo(1, 9)
  }
})

test("mirroring reflects the hole offset", () => {
  for (const hole of getOffsetHoles()) {
    transformPCBElement(hole, scale(1, -1))
    expect(hole.hole_offset_x).toBeCloseTo(1, 9)
    expect(hole.hole_offset_y).toBeCloseTo(-0.1, 9)
  }
  for (const hole of getOffsetHoles()) {
    transformPCBElement(hole, scale(-1, 1))
    expect(hole.hole_offset_x).toBeCloseTo(-1, 9)
    expect(hole.hole_offset_y).toBeCloseTo(0.1, 9)
  }
})

test("the drill center ends up where the placement sends it", () => {
  for (const placement of placements) {
    for (const hole of getOffsetHoles()) {
      const expected = applyToPoint(placement, {
        x: hole.x + hole.hole_offset_x!,
        y: hole.y + hole.hole_offset_y!,
      })

      transformPCBElement(hole, placement)

      expect(hole.x + hole.hole_offset_x!).toBeCloseTo(expected.x, 9)
      expect(hole.y + hole.hole_offset_y!).toBeCloseTo(expected.y, 9)
    }
  }
})

test("the drill stays inside the pad", () => {
  // Copper area is pad minus drill, so it only holds if the drill stays in the
  // pad. A drill that the pad rotates away from would add the drill area back.
  for (const placement of placements) {
    for (const hole of getOffsetHoles()) {
      const areaBefore = getPlatedHolePolygon(hole).area()

      transformPCBElement(hole, placement)

      expect(getPlatedHolePolygon(hole).area()).toBeCloseTo(areaBefore, 6)
    }
  }
})

test("translations leave hole offsets alone", () => {
  for (const hole of getOffsetHoles()) {
    transformPCBElement(hole, translate(5, 6))
    expect(hole.hole_offset_x).toBe(1)
    expect(hole.hole_offset_y).toBe(0.1)
  }
})

test("a rotation leaves zero and missing hole offsets as they were", () => {
  const [zero, missing] = getOffsetHoles()
  Object.assign(zero!, { hole_offset_x: 0, hole_offset_y: 0 })
  Reflect.deleteProperty(missing!, "hole_offset_x")
  Reflect.deleteProperty(missing!, "hole_offset_y")

  transformPCBElement(zero!, rotateDEG(90))
  transformPCBElement(missing!, rotateDEG(90))

  expect(zero!.hole_offset_x).toBe(0)
  expect(zero!.hole_offset_y).toBe(0)
  expect(missing).not.toHaveProperty("hole_offset_x")
  expect(missing).not.toHaveProperty("hole_offset_y")
})
