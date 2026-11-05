import { expect, test, describe } from "bun:test"
import { getBoardBounds } from "lib/get-board-bounds"
import type { PcbBoard } from "circuit-json"

const makeBoard = (overrides: Partial<PcbBoard> = {}): PcbBoard =>
  ({
    type: "pcb_board",
    pcb_board_id: "board0",
    center: { x: 0, y: 0 },
    width: 10,
    height: 20,
    ...overrides,
  } as PcbBoard)

describe("getBoardBounds — explicit zero dimensions (issue #285)", () => {
  test("zero width/height are treated as explicit dimensions", () => {
    const bounds = getBoardBounds(makeBoard({ width: 0, height: 0 }))
    expect(bounds.width).toBe(0)
    expect(bounds.height).toBe(0)
    expect(bounds.minX).toBe(0)
    expect(bounds.minY).toBe(0)
    expect(bounds.maxX).toBe(0)
    expect(bounds.maxY).toBe(0)
    expect(bounds.center.x).toBe(0)
    expect(bounds.center.y).toBe(0)
  })

  test("zero dimensions with nonzero center use the explicit center", () => {
    const bounds = getBoardBounds(
      makeBoard({ width: 0, height: 0, center: { x: 5, y: -3 } }),
    )
    expect(bounds.center.x).toBe(5)
    expect(bounds.center.y).toBe(-3)
    expect(bounds.minX).toBe(5)
    expect(bounds.maxX).toBe(5)
  })

  test("zero dimensions take precedence over outline", () => {
    const bounds = getBoardBounds(
      makeBoard({
        width: 0,
        height: 0,
        outline: [
          { x: -50, y: -50 },
          { x: 50, y: -50 },
          { x: 50, y: 50 },
        ],
      }),
    )
    expect(bounds.width).toBe(0)
    expect(bounds.height).toBe(0)
    expect(bounds.minX).toBe(0)
  })

  test("nonzero explicit dimensions still take precedence over outline", () => {
    const bounds = getBoardBounds(
      makeBoard({
        width: 10,
        height: 20,
        outline: [
          { x: -100, y: -100 },
          { x: 100, y: 100 },
        ],
      }),
    )
    expect(bounds.width).toBe(10)
    expect(bounds.height).toBe(20)
  })

  test("negative coordinates with zero dimensions", () => {
    const bounds = getBoardBounds(
      makeBoard({ width: 0, height: 0, center: { x: -10, y: -10 } }),
    )
    expect(bounds.center.x).toBe(-10)
    expect(bounds.minX).toBe(-10)
    expect(bounds.maxX).toBe(-10)
  })

  test("missing dimensions falls back to outline", () => {
    const bounds = getBoardBounds(
      makeBoard({
        width: undefined,
        height: undefined,
        outline: [
          { x: -5, y: -5 },
          { x: 5, y: 5 },
        ],
      } as Partial<PcbBoard>),
    )
    expect(bounds.width).toBe(10)
    expect(bounds.height).toBe(10)
  })

  test("missing dimensions and missing/empty outline throws", () => {
    expect(() =>
      getBoardBounds(
        makeBoard({ width: undefined, height: undefined } as Partial<PcbBoard>),
      ),
    ).toThrow()
    expect(() =>
      getBoardBounds(
        makeBoard({
          width: undefined,
          height: undefined,
          outline: [],
        } as Partial<PcbBoard>),
      ),
    ).toThrow()
  })

  test("non-finite dimensions (NaN) fall back to outline", () => {
    const bounds = getBoardBounds(
      makeBoard({
        width: Number.NaN,
        height: Number.NaN,
        outline: [
          { x: -5, y: -5 },
          { x: 5, y: 5 },
        ],
      } as Partial<PcbBoard>),
    )
    expect(bounds.width).toBe(10)
    expect(bounds.height).toBe(10)
  })

  test("negative dimensions retain existing behavior", () => {
    const bounds = getBoardBounds(makeBoard({ width: -10, height: 20 }))
    expect(bounds.width).toBe(-10)
    expect(bounds.minX).toBe(5)
    expect(bounds.maxX).toBe(-5)
  })
})
