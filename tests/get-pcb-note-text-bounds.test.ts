import { expect, test } from "bun:test"
import type { PcbNoteText } from "circuit-json"
import {
  getBoundsOfPcbElements,
  getPcbElementBounds,
  getPcbElementsWithinBounds,
} from "../lib/get-bounds-of-pcb-elements"
import reference from "./fixtures/pcb-note-text-0.0.450.json"
for (const record of reference.records)
  test(`PCB note text includes public SVG ink ${record.index}`, () => {
    const element = record.element as PcbNoteText
    const bounds = getPcbElementBounds(element)!
    expect(bounds).not.toBeNull()
    for (const edge of ["minX", "maxX", "minY", "maxY"] as const) {
      const tolerance = record.worldPixel * 1.5
      expect(Math.abs(bounds[edge] - record.inkBounds![edge])).toBeLessThan(
        tolerance,
      )
    }
    expect(getBoundsOfPcbElements([element])).toEqual(bounds)
  })
for (const record of reference.controls)
  test(`unmeasured glyph or empty note retains fallback ${record.index}`, () => {
    const element = record.element as PcbNoteText
    const { x, y } = element.anchor_position
    expect(getPcbElementBounds(element)).toEqual({
      minX: x,
      maxX: x,
      minY: y,
      maxY: y,
    })
  })
const element = reference.records.find(
  (r) =>
    r.element.text === "5mm\nill" &&
    r.element.anchor_alignment === "center" &&
    r.element.font_size === 0.5,
)!.element as PcbNoteText
const anchorBounds = { minX: 2, maxX: 2, minY: -1, maxY: -1 }
test("visible second line participates in range selection", () => {
  expect(
    getPcbElementsWithinBounds([element], {
      minX: 1.82,
      maxX: 1.88,
      minY: -1.62,
      maxY: -1.55,
    }),
  ).toEqual([element])
  expect(
    getPcbElementsWithinBounds([element], {
      minX: 3,
      maxX: 3.1,
      minY: -2,
      maxY: -1.9,
    }),
  ).toEqual([])
})
for (const text of [
  undefined,
  null,
  "",
  123,
  {},
  true,
  [],
  "W\nΩ",
  "Ω\nW",
  "A\r\nB",
])
  test(`unmeasured text keeps whole-note fallback ${JSON.stringify(text)}`, () =>
    expect(
      getPcbElementBounds({ ...element, text } as unknown as PcbNoteText),
    ).toEqual(anchorBounds))
for (const font_size of [0, -1, Number.NaN, Number.POSITIVE_INFINITY, null])
  test(`invalid note font size ${font_size}`, () =>
    expect(
      getPcbElementBounds({ ...element, font_size } as unknown as PcbNoteText),
    ).toEqual(anchorBounds))
test("raw optional fields use renderer defaults", () =>
  expect(
    getPcbElementBounds({
      ...element,
      font_size: undefined,
      anchor_alignment: undefined,
      font: undefined,
    } as unknown as PcbNoteText),
  ).toEqual(
    getPcbElementBounds({
      ...element,
      font_size: 1,
      anchor_alignment: "center",
    }),
  ))
test("raw unsupported font and alignment retain fallback", () => {
  expect(
    getPcbElementBounds({
      ...element,
      font: "Arial",
    } as unknown as PcbNoteText),
  ).toEqual(anchorBounds)
  expect(
    getPcbElementBounds({
      ...element,
      anchor_alignment: "invalid",
    } as unknown as PcbNoteText),
  ).toEqual(anchorBounds)
})
test("frozen note input is unchanged", () => {
  const frozen = Object.freeze({
    ...element,
    anchor_position: Object.freeze({ ...element.anchor_position }),
  })
  const before = structuredClone(frozen)
  expect(getPcbElementBounds(frozen)).not.toBeNull()
  expect(frozen).toEqual(before)
})
for (const anchor_position of [undefined, null])
  test(`missing note anchor ${anchor_position}`, () =>
    expect(
      getPcbElementBounds({
        ...element,
        anchor_position,
      } as unknown as PcbNoteText),
    ).toBeNull())
test("renderer ignores raw rotation and mirror flags", () => {
  expect(
    getPcbElementBounds({
      ...element,
      ccw_rotation: 90,
      is_mirrored_from_top_view: true,
    } as unknown as PcbNoteText),
  ).toEqual(getPcbElementBounds(element))
})
test("overflowed note bounds retain fallback", () =>
  expect(
    getPcbElementBounds({
      ...element,
      text: "WWWW",
      font_size: Number.MAX_VALUE,
    }),
  ).toEqual(anchorBounds))
