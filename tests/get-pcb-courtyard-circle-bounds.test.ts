import { expect, test } from "bun:test"
import type { PcbCourtyardCircle } from "circuit-json"
import {
  getBoundsOfPcbElements,
  getPcbElementBounds,
  getPcbElementsWithinBounds,
} from "../lib/get-bounds-of-pcb-elements"
import reference from "./fixtures/pcb-courtyard-circle-0.0.450.json"

for (const record of reference.records) {
  test(`courtyard circle bounds match displayed SVG outline ${record.index}`, () => {
    const element = record.element as PcbCourtyardCircle
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
const record = reference.records[9]!
const circle = record.element as PcbCourtyardCircle

test("courtyard circle displayed outline exterior participates in selection", () => {
  expect(record.queryCount).toBeGreaterThan(0)
  expect(record.selectionBefore).toBe(0)
  expect(getPcbElementsWithinBounds([circle], record.query)).toEqual([circle])
  expect(
    getPcbElementsWithinBounds([circle], {
      minX: 5.04,
      maxX: 5.05,
      minY: -3.02,
      maxY: -2.98,
    }),
  ).toEqual([])
  expect(getPcbElementBounds(circle)).toEqual({
    minX: -1.025,
    maxX: 5.025,
    minY: -6.025,
    maxY: 0.02499999999999991,
  })
})
test("courtyard circle invalid radius retains existing fallback", () => {
  expect(getPcbElementBounds({ ...circle, radius: Number.NaN })).toEqual({
    minX: Number.NaN,
    maxX: Number.NaN,
    minY: Number.NaN,
    maxY: Number.NaN,
  })
})
test("courtyard circle bounds do not mutate frozen input", () => {
  const frozen = Object.freeze({
    ...circle,
    center: Object.freeze({ ...circle.center }),
  })
  const before = structuredClone(frozen)
  expect(getPcbElementBounds(frozen)!.maxX).toBe(5.025)
  expect(frozen).toEqual(before)
})
test("other courtyard geometry retains nominal bounds", () => {
  expect(
    getPcbElementBounds({
      ...circle,
      type: "pcb_courtyard_rect",
      width: 6,
      height: 4,
    } as any),
  ).toEqual({ minX: -1, maxX: 5, minY: -5, maxY: -1 })
})
