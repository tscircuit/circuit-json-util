import { expect, test } from "bun:test"
import type {
  PcbFabricationNoteDimension,
  PcbNoteDimension,
} from "circuit-json"
import {
  getBoundsOfPcbElements,
  getPcbElementBounds,
  getPcbElementsWithinBounds,
} from "../lib/get-bounds-of-pcb-elements"
import reference from "./fixtures/pcb-dimension-label-0.0.450.json"

for (const record of reference.records) {
  test(`fabrication label includes public SVG ink ${record.index}`, () => {
    const element = record.element as PcbFabricationNoteDimension
    const bounds = getPcbElementBounds(element)!
    expect(bounds).not.toBeNull()
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
      if (Math.abs(record.labelAngle % 90) < 1e-8)
        expect(Math.abs(bounds[edge] - record.inkBounds[edge])).toBeLessThan(
          tolerance,
        )
    }
    expect(getBoundsOfPcbElements([element])).toEqual(bounds)
  })
}
const element = reference.records.find(
  (record) =>
    record.element.text === "5mm" &&
    record.element.text_ccw_rotation === 0 &&
    record.element.font_size === 2.25 &&
    record.element.from.x === -4,
)!.element as PcbFabricationNoteDimension
const first = { ...element, font_size: 1 }
test("visible label region participates in public selection", () => {
  const query = { minX: -0.025, maxX: 0.025, minY: 1.15, maxY: 1.35 }
  expect(getPcbElementsWithinBounds([first], query)).toEqual([first])
  expect(
    getPcbElementsWithinBounds([first], {
      minX: 0,
      maxX: 0.01,
      minY: 2,
      maxY: 2.01,
    }),
  ).toEqual([])
  const bounds = getPcbElementBounds(first)!
  for (const [edge, value] of Object.entries({
    minX: -4.03,
    maxX: 4.03,
    minY: -0.15,
    maxY: 1.614,
  }))
    expect(bounds[edge as keyof typeof bounds]).toBeCloseTo(value, 10)
})
for (const text of ["3 mm", " ", "Ω", "A\nB", "?", "A\tB", "😀"])
  test(`missing glyph keeps fallback ${JSON.stringify(text)}`, () => {
    const unsupported = { ...first, text }
    expect(getPcbElementBounds(unsupported)).toBeNull()
    expect(
      getPcbElementsWithinBounds([unsupported], {
        minX: -1,
        maxX: 1,
        minY: -1,
        maxY: 3,
      }),
    ).toEqual([])
  })
for (const font_size of [0, -1, Number.NaN, Number.POSITIVE_INFINITY])
  test(`invalid label font size ${font_size}`, () =>
    expect(getPcbElementBounds({ ...first, font_size })).toBeNull())
for (const text_ccw_rotation of [Number.NaN, Number.POSITIVE_INFINITY])
  test(`nonfinite label rotation is ignored by renderer ${text_ccw_rotation}`, () =>
    expect(getPcbElementBounds({ ...first, text_ccw_rotation })).toEqual(
      getPcbElementBounds({ ...first, text_ccw_rotation: undefined }),
    ))
test("ordinary Arial dimension keeps fallback", () =>
  expect(
    getPcbElementBounds({
      ...first,
      type: "pcb_note_dimension",
      pcb_note_dimension_id: "ordinary",
    } as PcbNoteDimension),
  ).toBeNull())
test("label bounds do not mutate frozen input", () => {
  const frozen = Object.freeze({
    ...first,
    from: Object.freeze({ ...first.from }),
    to: Object.freeze({ ...first.to }),
    offset_direction: Object.freeze({ x: 2, y: -3 }),
    offset_distance: 1,
  })
  const original = structuredClone(frozen)
  expect(getPcbElementBounds(frozen)).not.toBeNull()
  expect(frozen).toEqual(original)
})
test("overflowed label placement retains fallback", () =>
  expect(
    getPcbElementBounds({
      ...first,
      from: { x: Number.MAX_VALUE, y: 0 },
      to: { x: Number.MAX_VALUE, y: 0 },
    }),
  ).toBeNull())

for (const text of [123, {}, true, []]) {
  test(`non-string label keeps old fallback ${JSON.stringify(text)}`, () => {
    const malformed = {
      ...first,
      text,
    } as unknown as PcbFabricationNoteDimension
    expect(getPcbElementBounds(malformed)).toBeNull()
    expect(
      getPcbElementsWithinBounds([malformed], {
        minX: -1,
        maxX: 1,
        minY: -1,
        maxY: 3,
      }),
    ).toEqual([])
  })
}
