import { expect, test } from "bun:test"
import type { PcbCourtyardOutline } from "circuit-json"
import {
  getBoundsOfPcbElements,
  getPcbElementBounds,
  getPcbElementsWithinBounds,
} from "../lib/get-bounds-of-pcb-elements"
import reference from "./fixtures/pcb-courtyard-outline-0.0.450.json"

for (const record of reference.records) {
  test(`courtyard outline bounds match displayed SVG outline ${record.index}`, () => {
    const element = record.element as PcbCourtyardOutline
    const bounds = getPcbElementBounds(element)!
    if (!record.inkBounds) {
      expect(bounds).toEqual(record.boundsBefore)
      return
    }
    for (const edge of ["minX", "maxX", "minY", "maxY"] as const) {
      expect(Math.abs(bounds[edge] - record.inkBounds[edge])).toBeLessThan(
        record.worldPixel * 1.5,
      )
    }
    expect(getBoundsOfPcbElements([element])).toEqual(bounds)
  })
}
const record = reference.records[1]!
const outline = record.element as PcbCourtyardOutline

test("courtyard outline outline exterior participates in selection", () => {
  expect(record.queryCount).toBeGreaterThan(0)
  expect(record.selectionBefore).toBe(0)
  expect(getPcbElementsWithinBounds([outline], record.query)).toEqual([outline])
  expect(
    getPcbElementsWithinBounds([outline], {
      minX: 5.04,
      maxX: 5.05,
      minY: -3.02,
      maxY: -2.98,
    }),
  ).toEqual([])
  expect(getPcbElementBounds(outline)).toEqual({
    minX: -1.025,
    maxX: 5.025,
    minY: -5.025,
    maxY: -0.975,
  })
})
for (const point of [null, undefined]) {
  test(`nullish outline point retains existing fallback ${point}`, () => {
    const invalid = {
      ...outline,
      outline: [point, ...outline.outline],
    } as unknown as PcbCourtyardOutline
    expect(getPcbElementBounds(invalid)).toEqual(record.boundsBefore)
    expect(getPcbElementsWithinBounds([invalid], record.query)).toEqual([])
  })
}
test("nonfinite outline coordinate retains fallback", () => {
  const invalid = {
    ...outline,
    outline: [{ x: Number.NaN, y: -5 }, ...outline.outline],
  }
  expect(getPcbElementBounds(invalid)).toEqual({
    minX: Number.NaN,
    maxX: Number.NaN,
    minY: -5,
    maxY: -1,
  })
})
for (const length of [0, 1]) {
  test(`short outline retains fallback for ${length} points`, () => {
    const bounds = getPcbElementBounds({
      ...outline,
      outline: outline.outline.slice(0, length),
    })
    expect(bounds).toEqual(
      length === 0
        ? null
        : { minX: -1, maxX: length === 1 ? -1 : 5, minY: -5, maxY: -5 },
    )
  })
}
test("courtyard outline bounds do not mutate frozen points", () => {
  const frozen = Object.freeze({
    ...outline,
    outline: Object.freeze(
      outline.outline.map((point) => Object.freeze({ ...point })),
    ),
  })
  const before = structuredClone(frozen)
  expect(
    getPcbElementBounds(frozen as unknown as PcbCourtyardOutline)!.maxX,
  ).toBe(5.025)
  expect(frozen).toEqual(before)
})
test("board outlines retain nominal physical bounds", () => {
  expect(
    getPcbElementBounds({
      type: "pcb_board",
      pcb_board_id: "board",
      center: { x: 2, y: -3 },
      width: 6,
      height: 4,
      num_layers: 2,
      outline: outline.outline,
    } as any),
  ).toEqual(record.boundsBefore)
})

test("courtyard outline implicitly closes without repeating its first point", () => {
  const triangle = reference.records[45]!
  const element = triangle.element as PcbCourtyardOutline
  expect(triangle.svgTag).toBe("polygon")
  expect(element.outline[0]).not.toEqual(element.outline.at(-1))
  expect(triangle.closingQueryCount).toBeGreaterThan(0)
  expect(getPcbElementsWithinBounds([element], triangle.closingQuery)).toEqual([
    element,
  ])
})
