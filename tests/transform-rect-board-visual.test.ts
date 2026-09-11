import { expect, test } from "bun:test"
import { pcb_board } from "circuit-json"
import { convertCircuitJsonToPcbSvg } from "circuit-to-svg"
import { rotateDEG } from "transformation-matrix"
import { transformPCBElement } from "../index"

test("a rectangular board rotated 45 degrees retains its exact polygon boundary", () => {
  const board = pcb_board.parse({
    type: "pcb_board",
    center: { x: 0, y: 0 },
    shape: "rect",
    width: 20,
    height: 10,
  })
  transformPCBElement(board, rotateDEG(45))
  expect(
    convertCircuitJsonToPcbSvg([board], {
      width: 500,
      height: 500,
      viewport: { minX: -13, minY: -13, maxX: 13, maxY: 13 },
      includeVersion: false,
    }),
  ).toMatchSvgSnapshot(import.meta.path)
  expect(board.shape).toBe("polygon")
  expect(board.outline).toEqual(
    [
      { x: -5 / Math.sqrt(2), y: -15 / Math.sqrt(2) },
      { x: 15 / Math.sqrt(2), y: 5 / Math.sqrt(2) },
      { x: 5 / Math.sqrt(2), y: 15 / Math.sqrt(2) },
      { x: -15 / Math.sqrt(2), y: -5 / Math.sqrt(2) },
    ].map(({ x, y }) => ({
      x: expect.closeTo(x, 10),
      y: expect.closeTo(y, 10),
    })),
  )
})
