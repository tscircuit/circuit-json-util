import { expect, test } from "bun:test"
import type { PcbSilkscreenCircle } from "circuit-json"
import {
  getBoundsOfPcbElements,
  getPcbElementBounds,
  getPcbElementsWithinBounds,
} from "../lib/get-bounds-of-pcb-elements"
import reference from "./fixtures/pcb-silkscreen-circle-0.0.450.json"
for (const record of reference.records)
  test(`circle stroke matches public SVG ink ${record.index}`, () => {
    const element = record.element as PcbSilkscreenCircle
    const bounds = getPcbElementBounds(element)!
    if (!record.inkBounds) {
      expect(bounds).toEqual(record.boundsBefore)
      return
    }
    for (const edge of ["minX", "maxX", "minY", "maxY"] as const)
      expect(Math.abs(bounds[edge] - record.inkBounds[edge])).toBeLessThan(
        record.worldPixel * 1.5,
      )
    expect(getBoundsOfPcbElements([element])).toEqual(bounds)
  })
const record = reference.records.find(
  (row) =>
    row.element.radius === 3 &&
    row.element.center.x === 2 &&
    row.element.stroke_width === 1 &&
    !row.element.is_filled &&
    row.element.layer === "top",
)!
const circle = record.element as PcbSilkscreenCircle
test("silkscreen circle stroke exterior is selectable", () => {
  expect(record.queryCount).toBeGreaterThan(0)
  expect(record.selectionBefore).toBe(0)
  expect(getPcbElementsWithinBounds([circle], record.query)).toEqual([circle])
  expect(
    getPcbElementsWithinBounds([circle], {
      minX: 5.55,
      maxX: 5.6,
      minY: -3.05,
      maxY: -2.95,
    }),
  ).toEqual([])
  expect(getPcbElementBounds(circle)).toEqual({
    minX: -1.5,
    maxX: 5.5,
    minY: -6.5,
    maxY: 0.5,
  })
})
for (const stroke_width of [-1, Number.NaN, Number.POSITIVE_INFINITY])
  test(`invalid circle stroke keeps fallback ${stroke_width}`, () =>
    expect(getPcbElementBounds({ ...circle, stroke_width })).toEqual(
      record.boundsBefore,
    ))
for (const radius of [0, -1])
  test(`nonpositive circle radius keeps fallback ${radius}`, () =>
    expect(getPcbElementBounds({ ...circle, radius })).toEqual({
      minX: 2 - radius,
      maxX: 2 + radius,
      minY: -3 - radius,
      maxY: -3 + radius,
    }))
test("circle bounds do not mutate frozen input", () => {
  const element = Object.freeze({
    ...circle,
    center: Object.freeze({ ...circle.center }),
  })
  const before = structuredClone(element)
  expect(getPcbElementBounds(element)).toEqual({
    minX: -1.5,
    maxX: 5.5,
    minY: -6.5,
    maxY: 0.5,
  })
  expect(element).toEqual(before)
})
test("physical hole circles retain their diameter bounds", () =>
  expect(
    getPcbElementBounds({
      type: "pcb_hole",
      pcb_hole_id: "hole",
      hole_shape: "circle",
      x: circle.center.x,
      y: circle.center.y,
      hole_diameter: circle.radius * 2,
    }),
  ).toEqual(record.boundsBefore))
