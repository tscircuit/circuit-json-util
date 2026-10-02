import { expect, test } from "bun:test"
import {
  applyToPoint,
  compose,
  inverse,
  rotateDEG,
  scale,
  translate,
} from "transformation-matrix"
import { transformPCBElements } from "../index"
import {
  createOpenings,
  expectSamePoints,
  getRectCornerPoints,
} from "./fixtures/soldermask-opening"

test("component-local extraction and reinflation preserve every opening shape", () => {
  for (const layer of ["top", "bottom"] as const) {
    for (const angle of [0, 30, 90, 180, 270]) {
      const placement = compose(
        translate(100, -70),
        rotateDEG(angle),
        scale(layer === "bottom" ? -1 : 1, 1),
      )
      const original = createOpenings(layer)
      const openings = structuredClone(original)
      transformPCBElements(openings, placement)
      for (const [index, opening] of openings.entries()) {
        const before = original[index]!
        if (opening.shape === "polygon" && before.shape === "polygon") {
          expectSamePoints(
            opening.points,
            before.points.map((point) => applyToPoint(placement, point)),
          )
        } else if (opening.shape === "circle" && before.shape === "circle") {
          const expected = applyToPoint(placement, { x: before.x, y: before.y })
          expect(opening.x).toBeCloseTo(expected.x, 7)
          expect(opening.y).toBeCloseTo(expected.y, 7)
        }
      }
      transformPCBElements(openings, inverse(placement))
      for (const [index, opening] of openings.entries()) {
        const before = original[index]!
        if (opening.shape === "polygon" && before.shape === "polygon") {
          expectSamePoints(opening.points, before.points)
        } else if (opening.shape !== "polygon" && before.shape !== "polygon") {
          expect(opening.x).toBeCloseTo(before.x, 7)
          expect(opening.y).toBeCloseTo(before.y, 7)
          if (opening.shape === "circle" && before.shape === "circle") {
            expect(opening.radius).toBe(before.radius)
          } else if (opening.shape !== "circle" && before.shape !== "circle") {
            expectSamePoints(
              getRectCornerPoints(opening),
              getRectCornerPoints(before),
            )
          }
        }
      }
      expect(openings[1]!.shape).toBe("rect")
    }
  }
})
