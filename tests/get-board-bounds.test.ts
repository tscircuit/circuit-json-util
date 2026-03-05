import { expect, test } from "bun:test"
import type { PcbBoard } from "circuit-json"
import { getBoardBounds } from "../lib/get-board-bounds"

test("getBoardBounds computes bounds from width/height/center", () => {
  const board = {
    type: "pcb_board",
    pcb_board_id: "board_1",
    width: 80,
    height: 40,
    center: { x: 10, y: -5 },
  } as PcbBoard

  expect(getBoardBounds(board)).toEqual({
    minX: -30,
    minY: -25,
    maxX: 50,
    maxY: 15,
    width: 80,
    height: 40,
    center: { x: 10, y: -5 },
  })
})

test("getBoardBounds computes bounds from outline", () => {
  const board = {
    type: "pcb_board",
    pcb_board_id: "board_2",
    outline: [
      { x: -15, y: 10 },
      { x: 20, y: 10 },
      { x: 20, y: -30 },
      { x: -15, y: -30 },
    ],
  } as PcbBoard

  expect(getBoardBounds(board)).toEqual({
    minX: -15,
    minY: -30,
    maxX: 20,
    maxY: 10,
    width: 35,
    height: 40,
    center: { x: 2.5, y: -10 },
  })
})
