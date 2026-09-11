import { expect, test } from "bun:test"
import { pcb_board } from "circuit-json"
import { compose, rotateDEG, scale, translate } from "transformation-matrix"
import { transformPCBElement, transformPCBElements } from "../index"

test("boards transform their center and optional polygon outline in single and batch paths", () => {
  const matrix = compose(translate(10, 20), scale(1, -1), rotateDEG(90))
  for (const hasOutline of [false, true]) {
    for (const batch of [false, true]) {
      const board = pcb_board.parse({
        type: "pcb_board",
        pcb_board_id: "pcb_board_0",
        shape: hasOutline ? "polygon" : "rect",
        center: { x: 3, y: 4 },
        width: 2,
        height: 2,
        thickness: 1.6,
        num_layers: 2,
        ...(hasOutline
          ? {
              outline: [
                { x: 2, y: 3 },
                { x: 4, y: 3 },
                { x: 4, y: 5 },
                { x: 2, y: 5 },
              ],
            }
          : {}),
      })
      const transformed = batch
        ? transformPCBElements([board], matrix)[0]
        : transformPCBElement(board, matrix)
      expect(transformed).toBe(board)
      expect(board.center).toEqual({ x: 6, y: 17 })
      expect(board.outline).toEqual(
        hasOutline
          ? [
              { x: 7, y: 18 },
              { x: 7, y: 16 },
              { x: 5, y: 16 },
              { x: 5, y: 18 },
            ]
          : undefined,
      )
    }
  }
})
