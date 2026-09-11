import { expect, test } from "bun:test"
import { pcb_board } from "circuit-json"
import { compose, rotateDEG, scale, translate } from "transformation-matrix"
import { transformPCBElement, transformPCBElements } from "../index"

test("board transforms preserve exact boundaries and update axis-aligned dimensions", () => {
  for (const batch of [false, true]) {
    for (const [matrix, width, height, polygon] of [
      [translate(10, 20), 20, 10, false],
      [rotateDEG(90), 10, 20, false],
      [compose(rotateDEG(270), scale(-2, 3)), 30, 40, false],
      [rotateDEG(45), 30 / Math.sqrt(2), 30 / Math.sqrt(2), true],
      [{ a: 1, b: 0, c: 2, d: 1, e: 0, f: 0 }, 40, 10, true],
    ] as const) {
      const board = pcb_board.parse({
        type: "pcb_board",
        center: { x: 0, y: 0 },
        width: 20,
        height: 10,
        shape: "rect",
      })
      const result = batch
        ? transformPCBElements([board], matrix)[0]
        : transformPCBElement(board, matrix)
      expect(result).toBe(board)
      expect(board.width).toBeCloseTo(width, 10)
      expect(board.height).toBeCloseTo(height, 10)
      expect(board.shape).toBe(polygon ? "polygon" : "rect")
      if (polygon) expect(board.outline).toHaveLength(4)
      else expect(board.outline).toBeUndefined()
      pcb_board.parse(board)
      if (polygon) {
        transformPCBElement(board, rotateDEG(90))
        expect(board.width).toBeCloseTo(height, 10)
        expect(board.height).toBeCloseTo(width, 10)
      }
    }

    const board = pcb_board.parse({
      type: "pcb_board",
      center: { x: 0, y: 0 },
      outline: [
        { x: -3, y: -1 },
        { x: 3, y: -1 },
        { x: 0, y: 2 },
      ],
    })
    if (batch) transformPCBElements([board], scale(-2, 3))
    else transformPCBElement(board, scale(-2, 3))
    expect(board.width).toBe(12)
    expect(board.height).toBe(9)

    const partial = pcb_board.parse({
      type: "pcb_board",
      center: { x: 1, y: 2 },
      width: 20,
    })
    transformPCBElement(partial, rotateDEG(90))
    expect(partial.width).toBeUndefined()
    expect(partial.height).toBeCloseTo(20, 10)
  }
})
