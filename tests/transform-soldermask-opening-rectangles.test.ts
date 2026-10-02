import { expect, test } from "bun:test"
import { any_circuit_element } from "circuit-json"
import {
  applyToPoint,
  compose,
  identity,
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

test("rectangle corner sets follow arbitrary rotations and both reflection orders", () => {
  for (const layer of ["top", "bottom"] as const) {
    for (const angle of [0, 30, 41, 90, 180, 270]) {
      for (const reflection of [identity(), scale(-1, 1), scale(1, -1)]) {
        for (const placement of [
          compose(translate(100, -70), rotateDEG(angle), reflection),
          compose(translate(100, -70), reflection, rotateDEG(angle)),
        ]) {
          for (const opening of createOpenings(layer)) {
            if (opening.shape !== "rect" && opening.shape !== "rotated_rect")
              continue
            const expectedCorners = getRectCornerPoints(opening).map((point) =>
              applyToPoint(placement, point),
            )
            const { width, height } = opening
            const [transformed] = transformPCBElements([opening], placement)
            if (
              transformed?.type !== "pcb_soldermask_opening" ||
              (transformed.shape !== "rect" &&
                transformed.shape !== "rotated_rect")
            ) {
              throw new Error("Expected a rectangular opening")
            }
            expectSamePoints(getRectCornerPoints(transformed), expectedCorners)
            expect(transformed.width).toBe(width)
            expect(transformed.height).toBe(height)
            expect(transformed.layer).toBe(layer)
            expect(any_circuit_element.parse(transformed)).toEqual(transformed)
          }
        }
      }
    }
  }
})
