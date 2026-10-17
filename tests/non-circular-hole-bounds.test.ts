import { expect, test } from "bun:test"
import { pcb_hole } from "circuit-json"
import {
  getBoundsOfPcbElements,
  getPcbElementBounds,
  getPcbElementsWithinBounds,
} from "../lib/get-bounds-of-pcb-elements"

for (const hole_shape of ["circle", "square"] as const) {
  test(`${hole_shape} hole bounds use the diameter`, () => {
    const hole = pcb_hole.parse({
      type: "pcb_hole",
      hole_shape,
      x: 5,
      y: -3,
      hole_diameter: 4,
    })

    expect(getPcbElementBounds(hole)).toEqual({
      minX: 3,
      minY: -5,
      maxX: 7,
      maxY: -1,
    })
  })
}

for (const hole_shape of ["rect", "oval", "pill"] as const) {
  test(`${hole_shape} hole bounds include edges away from the center`, () => {
    const hole = pcb_hole.parse({
      type: "pcb_hole",
      hole_shape,
      x: 5,
      y: 3,
      hole_width: 4,
      hole_height: 2,
    })

    expect(getPcbElementBounds(hole)).toEqual({
      minX: 3,
      minY: 2,
      maxX: 7,
      maxY: 4,
    })
    expect(
      getPcbElementsWithinBounds([hole], {
        minX: 3,
        minY: 2.9,
        maxX: 3.1,
        maxY: 3.1,
      }),
    ).toEqual([hole])
  })
}

for (const [hole_width, hole_height, ccw_rotation, halfWidth, halfHeight] of [
  [6, 2, 0, 3, 1],
  [6, 2, 45, 1 + Math.SQRT2, 1 + Math.SQRT2],
  [6, 2, 90, 1, 3],
  [6, 2, -30, 1 + Math.sqrt(3), 2],
  [2, 6, 30, 2, 1 + Math.sqrt(3)],
  [2, 2, 45, 1, 1],
] as const) {
  test(`rotated pill hole ${hole_width}x${hole_height} at ${ccw_rotation} degrees has tight capsule bounds`, () => {
    const hole = pcb_hole.parse({
      type: "pcb_hole",
      hole_shape: "rotated_pill",
      x: 5,
      y: -3,
      hole_width,
      hole_height,
      ccw_rotation,
    })

    const bounds = getPcbElementBounds(hole)!
    expect(bounds.minX).toBeCloseTo(5 - halfWidth)
    expect(bounds.minY).toBeCloseTo(-3 - halfHeight)
    expect(bounds.maxX).toBeCloseTo(5 + halfWidth)
    expect(bounds.maxY).toBeCloseTo(-3 + halfHeight)
  })
}

test("rotated pill spatial queries use the capsule bounds", () => {
  const hole = pcb_hole.parse({
    type: "pcb_hole",
    hole_shape: "rotated_pill",
    x: 0,
    y: 0,
    hole_width: 6,
    hole_height: 2,
    ccw_rotation: 45,
  })

  expect(
    getPcbElementsWithinBounds([hole], {
      minX: 2.3,
      minY: 1.3,
      maxX: 2.4,
      maxY: 1.5,
    }),
  ).toEqual([hole])
  // A rotated rectangle would extend into this region, but the capsule does not.
  expect(
    getPcbElementsWithinBounds([hole], {
      minX: 2.5,
      minY: 1.3,
      maxX: 2.6,
      maxY: 1.5,
    }),
  ).toEqual([])
})

test("aggregate bounds include non-circular hole dimensions", () => {
  const holes = [
    pcb_hole.parse({
      type: "pcb_hole",
      hole_shape: "rect",
      x: 5,
      y: 3,
      hole_width: 4,
      hole_height: 2,
    }),
    pcb_hole.parse({
      type: "pcb_hole",
      hole_shape: "circle",
      x: 0,
      y: 0,
      hole_diameter: 2,
    }),
  ]

  expect(getBoundsOfPcbElements(holes)).toEqual({
    minX: -1,
    minY: -1,
    maxX: 7,
    maxY: 4,
  })
})
