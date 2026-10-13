import { expect, test } from "bun:test"
import type { PcbSilkscreenRect } from "circuit-json"
import {
  getBoundsOfPcbElements,
  getPcbElementBounds,
  getPcbElementsWithinBounds,
} from "../lib/get-bounds-of-pcb-elements"
import reference from "./fixtures/pcb-silkscreen-rect-0.0.450.json"
for (const record of reference.records)
  test(`silkscreen rectangle contains public SVG ink ${record.index}`, () => {
    const element = record.element as PcbSilkscreenRect
    const bounds = getPcbElementBounds(element)!
    if (!record.inkBounds) {
      expect(bounds).toEqual(record.boundsBefore)
      return
    }
    const attrs = record.attributes
    const isConservative =
      Number(attrs.rx) > 0 || Boolean(attrs["stroke-dasharray"])
    for (const edge of ["minX", "maxX", "minY", "maxY"] as const) {
      const tolerance = record.worldPixel * 1.5
      if (edge.startsWith("min"))
        expect(bounds[edge]).toBeLessThanOrEqual(
          record.inkBounds[edge] + tolerance,
        )
      else
        expect(bounds[edge]).toBeGreaterThanOrEqual(
          record.inkBounds[edge] - tolerance,
        )
      if (!isConservative)
        expect(Math.abs(bounds[edge] - record.inkBounds[edge])).toBeLessThan(
          tolerance,
        )
    }
    expect(getBoundsOfPcbElements([element])).toEqual(bounds)
  })
const record = reference.records[3]!
const rect = record.element as PcbSilkscreenRect
test("silkscreen rectangle stroke exterior participates in selection", () => {
  expect(record.queryCount).toBeGreaterThan(0)
  expect(record.selectionBefore).toBe(0)
  expect(getPcbElementsWithinBounds([rect], record.query)).toEqual([rect])
  expect(
    getPcbElementsWithinBounds([rect], {
      minX: 5.55,
      maxX: 5.6,
      minY: -3.05,
      maxY: -2.95,
    }),
  ).toEqual([])
  expect(getPcbElementBounds(rect)).toEqual({
    minX: -1.5,
    maxX: 5.5,
    minY: -5.5,
    maxY: -0.5,
  })
})
for (const stroke_width of [0, -1, Number.NaN, Number.POSITIVE_INFINITY])
  test(`invalid or zero rectangle stroke retains fallback ${stroke_width}`, () =>
    expect(getPcbElementBounds({ ...rect, stroke_width })).toEqual(
      record.boundsBefore,
    ))
test("disabled rectangle stroke keeps nominal bounds", () =>
  expect(
    getPcbElementBounds({ ...rect, has_stroke: false } as PcbSilkscreenRect),
  ).toEqual(record.boundsBefore))
test("rectangle bounds do not mutate frozen input", () => {
  const element = Object.freeze({
    ...rect,
    center: Object.freeze({ ...rect.center }),
  })
  const before = structuredClone(element)
  expect(getPcbElementBounds(element)).toEqual({
    minX: -1.5,
    maxX: 5.5,
    minY: -5.5,
    maxY: -0.5,
  })
  expect(element).toEqual(before)
})
test("other rectangular types retain nominal bounds", () =>
  expect(
    getPcbElementBounds({
      ...rect,
      type: "pcb_courtyard_rect",
      pcb_courtyard_rect_id: "courtyard",
    } as any),
  ).toEqual(record.boundsBefore))
