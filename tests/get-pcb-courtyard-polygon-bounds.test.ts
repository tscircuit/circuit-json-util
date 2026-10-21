import { expect, test } from "bun:test"
import type { PcbCourtyardPolygon } from "circuit-json"
import {
  getBoundsOfPcbElements,
  getPcbElementBounds,
  getPcbElementsWithinBounds,
} from "../lib/get-bounds-of-pcb-elements"
import reference from "./fixtures/pcb-courtyard-polygon-0.0.450.json"

for (const record of reference.records) {
  test(`courtyard polygon bounds match displayed SVG outline ${record.index}`, () => {
    const element = record.element as PcbCourtyardPolygon
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
const record = reference.records[2]!
const polygon = record.element as PcbCourtyardPolygon

test("courtyard polygon outline exterior participates in selection", () => {
  expect(record.queryCount).toBeGreaterThan(0)
  expect(record.selectionBefore).toBe(0)
  expect(getPcbElementsWithinBounds([polygon], record.query)).toEqual([polygon])
  expect(
    getPcbElementsWithinBounds([polygon], {
      minX: 5.04,
      maxX: 5.05,
      minY: -3.02,
      maxY: -2.98,
    }),
  ).toEqual([])
  expect(getPcbElementBounds(polygon)).toEqual({
    minX: -1.025,
    maxX: 5.025,
    minY: -5.025,
    maxY: -0.975,
  })
})
for (const point of [null, undefined]) {
  test(`nullish polygon point retains existing fallback ${point}`, () => {
    const invalid = {
      ...polygon,
      points: [point, ...polygon.points],
    } as unknown as PcbCourtyardPolygon
    expect(getPcbElementBounds(invalid)).toEqual(record.boundsBefore)
    expect(getPcbElementsWithinBounds([invalid], record.query)).toEqual([])
  })
}
test("nonfinite polygon coordinate retains fallback", () => {
  const invalid = {
    ...polygon,
    points: [{ x: Number.NaN, y: -5 }, ...polygon.points],
  }
  expect(getPcbElementBounds(invalid)).toEqual({
    minX: Number.NaN,
    maxX: Number.NaN,
    minY: -5,
    maxY: -1,
  })
})
for (const length of [0, 1, 2]) {
  test(`short polygon retains fallback for ${length} points`, () => {
    const bounds = getPcbElementBounds({
      ...polygon,
      points: polygon.points.slice(0, length),
    })
    expect(bounds).toEqual(
      length === 0
        ? null
        : { minX: -1, maxX: length === 1 ? -1 : 5, minY: -5, maxY: -5 },
    )
  })
}
test("courtyard polygon bounds do not mutate frozen points", () => {
  const frozen = Object.freeze({
    ...polygon,
    points: Object.freeze(
      polygon.points.map((point) => Object.freeze({ ...point })),
    ),
  })
  const before = structuredClone(frozen)
  expect(
    getPcbElementBounds(frozen as unknown as PcbCourtyardPolygon)!.maxX,
  ).toBe(5.025)
  expect(frozen).toEqual(before)
})
test("physical polygon pads retain nominal copper bounds", () => {
  expect(
    getPcbElementBounds({
      ...polygon,
      type: "pcb_smtpad",
      shape: "polygon",
      pcb_smtpad_id: "pad",
    } as any),
  ).toEqual(record.boundsBefore)
})
