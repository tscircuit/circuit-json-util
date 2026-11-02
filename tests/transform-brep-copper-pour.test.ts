import { expect, test } from "bun:test"
import type { PcbCopperPourBRep } from "circuit-json"
import { rotateDEG, scale } from "transformation-matrix"
import { getPourPolygon, transformPCBElements } from "../index"

const curvedPour: PcbCopperPourBRep = {
  type: "pcb_copper_pour",
  pcb_copper_pour_id: "pour",
  shape: "brep",
  layer: "bottom",
  covered_with_solder_mask: true,
  brep_shape: {
    outer_ring: {
      vertices: [
        { x: 0, y: 0, bulge: 0.5 },
        { x: 0, y: 4 },
        { x: 4, y: 4 },
        { x: 4, y: 0 },
      ],
    },
    inner_rings: [
      {
        vertices: [
          { x: 2, y: 1, bulge: 0.2 },
          { x: 3, y: 1 },
          { x: 3, y: 2 },
          { x: 2, y: 2 },
        ],
      },
    ],
  },
}

test("rotating a BREP pour preserves curved outer edges and holes", () => {
  const moved = structuredClone(curvedPour)
  transformPCBElements([moved], rotateDEG(90))

  expect(moved.brep_shape.outer_ring.vertices[1]!.x).toBeCloseTo(-4)
  expect(moved.brep_shape.outer_ring.vertices[1]!.y).toBeCloseTo(0)
  expect(moved.brep_shape.outer_ring.vertices[0]!.bulge).toBe(0.5)
  expect(moved.brep_shape.inner_rings[0]!.vertices[0]!.x).toBeCloseTo(-1)
  expect(moved.brep_shape.inner_rings[0]!.vertices[0]!.y).toBeCloseTo(2)
  expect(moved.brep_shape.inner_rings[0]!.vertices[0]!.bulge).toBe(0.2)
  expect(getPourPolygon(moved).area()).toBeCloseTo(
    getPourPolygon(curvedPour).area(),
  )
})

test("reflecting a BREP pour preserves winding and curved copper area", () => {
  const moved = structuredClone(curvedPour)
  transformPCBElements([moved], scale(1, -1))

  expect(moved.brep_shape.outer_ring.vertices).toEqual([
    { x: 4, y: 0 },
    { x: 4, y: -4 },
    { x: 0, y: -4, bulge: 0.5 },
    { x: 0, y: 0 },
  ])
  expect(moved.brep_shape.inner_rings[0]!.vertices).toEqual([
    { x: 2, y: -2 },
    { x: 3, y: -2 },
    { x: 3, y: -1, bulge: 0.2 },
    { x: 2, y: -1 },
  ])
  expect(getPourPolygon(moved).area()).toBeCloseTo(
    getPourPolygon(curvedPour).area(),
  )
})
