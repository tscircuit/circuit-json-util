import { expect, test } from "bun:test"
import { pcb_board, pcb_keepout } from "circuit-json"
import { rotateDEG, scale } from "transformation-matrix"
import { transformPCBElement, transformPCBElements } from "../index"

test("unrepresentable transforms fail before mutating a single element or batch", () => {
  for (const batch of [false, true]) {
    for (const [shape, matrix] of [
      ["rect", rotateDEG(45)],
      ["rect", { a: 1, b: 0, c: 1, d: 1, e: 0, f: 0 }],
      ["circle", scale(2, 3)],
      ["circle", { a: 1, b: 0, c: 0.6, d: 0.8, e: 0, f: 0 }],
      ["circle", scale(0, 1)],
      ["rect", scale(Number.NaN, 1)],
    ] as const) {
      const keepout = pcb_keepout.parse({
        type: "pcb_keepout",
        shape,
        pcb_keepout_id: "pcb_keepout_0",
        layers: ["top"],
        center: { x: 1, y: 2 },
        width: 20,
        height: 10,
        radius: 2,
      })
      const board = pcb_board.parse({
        type: "pcb_board",
        center: { x: 2, y: 3 },
        width: 20,
        height: 10,
      })
      const elements = [board, keepout]
      const original = structuredClone(elements)
      expect(() =>
        batch
          ? transformPCBElements(elements, matrix)
          : transformPCBElement(keepout, matrix),
      ).toThrow()
      expect(elements).toEqual(original)
    }
  }
  const board = pcb_board.parse({
    type: "pcb_board",
    center: { x: 1, y: 2 },
  })
  const original = structuredClone(board)
  expect(() => transformPCBElement(board, rotateDEG(45))).toThrow(
    "requires an outline or both width and height",
  )
  expect(board).toEqual(original)
})
