import { expect, test } from "bun:test"
import { pcb_board } from "circuit-json"
import { getBoardBounds } from "../lib/get-board-bounds"
const board = (extra: object) =>
  pcb_board.parse({
    type: "pcb_board",
    pcb_board_id: "b",
    center: { x: 0, y: 0 },
    ...extra,
  })
for (const [width, height] of [
  [0, 2],
  [2, 0],
  [0, 0],
  [4, 2],
]) {
  for (const center of [
    { x: 0, y: 0 },
    { x: -4, y: -3 },
  ]) {
    test(`explicit dimensions ${width} x ${height} at ${center.x},${center.y}`, () => {
      const input = board({ width, height, center })
      const before = JSON.stringify(input)
      expect(getBoardBounds(input)).toEqual({
        minX: center.x - width / 2,
        minY: center.y - height / 2,
        maxX: center.x + width / 2,
        maxY: center.y + height / 2,
        width,
        height,
        center,
      })
      expect(JSON.stringify(input)).toBe(before)
    })
  }
}
test("explicit zero dimensions retain precedence over outline", () => {
  expect(
    getBoardBounds(
      board({
        width: 0,
        height: 2,
        outline: [
          { x: -10, y: -10 },
          { x: 10, y: 10 },
        ],
      }),
    ),
  ).toEqual({
    minX: 0,
    minY: -1,
    maxX: 0,
    maxY: 1,
    width: 0,
    height: 2,
    center: { x: 0, y: 0 },
  })
})
test("missing dimensions still use actual outline", () => {
  expect(
    getBoardBounds(
      board({
        outline: [
          { x: -4, y: 0 },
          { x: 0, y: 0 },
          { x: 0, y: -2 },
          { x: -4, y: -2 },
        ],
      }),
    ),
  ).toEqual({
    minX: -4,
    minY: -2,
    maxX: 0,
    maxY: 0,
    width: 4,
    height: 2,
    center: { x: -2, y: -1 },
  })
})
test("missing dimensions and empty outline still throw", () => {
  expect(() => getBoardBounds(board({ outline: [] }))).toThrow(
    "Unable to compute board bounds",
  )
})
test("runtime omitted center and non-finite dimensions retain fallback/rejection", () => {
  for (const dimensions of [
    { width: Number.NaN, height: 2 },
    { width: 2, height: Number.NaN },
  ]) {
    expect(() =>
      getBoardBounds({
        type: "pcb_board",
        pcb_board_id: "b",
        center: { x: 0, y: 0 },
        ...dimensions,
      } as any),
    ).toThrow("Unable to compute board bounds")
  }
  expect(() =>
    getBoardBounds({
      type: "pcb_board",
      pcb_board_id: "b",
      width: 0,
      height: 2,
    } as any),
  ).toThrow("Unable to compute board bounds")
})
test("negative dimensions retain existing algebraic behavior", () => {
  expect(getBoardBounds(board({ width: -2, height: 4 }))).toEqual({
    minX: 1,
    minY: -2,
    maxX: -1,
    maxY: 2,
    width: -2,
    height: 4,
    center: { x: 0, y: 0 },
  })
})
