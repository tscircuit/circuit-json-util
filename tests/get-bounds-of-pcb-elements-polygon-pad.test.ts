import { expect, test } from "bun:test"
import type { AnyCircuitElement, PcbPlatedHole } from "circuit-json"
import { getPcbElementBounds } from "../lib/get-bounds-of-pcb-elements"

const makePolygonPadHole = (
  ccwRotation?: number,
  holeOffsetX = 2,
): PcbPlatedHole =>
  ({
    type: "pcb_plated_hole",
    pcb_plated_hole_id: "ph1",
    shape: "hole_with_polygon_pad",
    hole_shape: "circle",
    hole_diameter: 1,
    hole_offset_x: holeOffsetX,
    hole_offset_y: 0,
    pad_outline: [
      { x: -3, y: -0.5 },
      { x: 3, y: -0.5 },
      { x: 3, y: 0.5 },
      { x: -3, y: 0.5 },
    ],
    x: 0,
    y: 0,
    layers: ["top", "bottom"],
    ...(ccwRotation === undefined ? {} : { ccw_rotation: ccwRotation }),
  }) as PcbPlatedHole

test("polygon pad hole bounds cover the copper, not just the drill", () => {
  const bounds = getPcbElementBounds(makePolygonPadHole() as AnyCircuitElement)

  // Copper is a 6x1 bar plus the drill at offset (2, 0) with diameter 1
  expect(bounds!.minX).toBeCloseTo(-3, 1)
  expect(bounds!.maxX).toBeCloseTo(3, 1)
  expect(bounds!.minY).toBeCloseTo(-0.5, 1)
  expect(bounds!.maxY).toBeCloseTo(0.5, 1)
})

test("polygon pad hole bounds respect ccw_rotation on copper and drill offset", () => {
  // Drill offset (4, 0) puts the drill outside the copper bar in both frames
  const unrotated = getPcbElementBounds(
    makePolygonPadHole(undefined, 4) as AnyCircuitElement,
  )
  expect(unrotated!.minX).toBeCloseTo(-3, 1)
  expect(unrotated!.maxX).toBeCloseTo(4.5, 1)
  expect(unrotated!.minY).toBeCloseTo(-0.5, 1)
  expect(unrotated!.maxY).toBeCloseTo(0.5, 1)

  const rotated = getPcbElementBounds(
    makePolygonPadHole(90, 4) as AnyCircuitElement,
  )

  // Rotated: 1x6 copper bar, drill offset (4, 0) -> (0, 4), diameter 1
  expect(rotated!.minX).toBeCloseTo(-0.5, 1)
  expect(rotated!.maxX).toBeCloseTo(0.5, 1)
  expect(rotated!.minY).toBeCloseTo(-3, 1)
  expect(rotated!.maxY).toBeCloseTo(4.5, 1)
})
