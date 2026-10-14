import { expect, test } from "bun:test"
import type { PcbFabricationNoteText } from "circuit-json"
import {
  getBoundsOfPcbElements,
  getPcbElementBounds,
  getPcbElementsWithinBounds,
} from "../lib/get-bounds-of-pcb-elements"
import reference from "./fixtures/pcb-fabrication-note-text-0.0.450.json"

for (const record of reference.records) {
  test(`fabrication note text includes public SVG ink ${record.index}`, () => {
    const element = record.element as PcbFabricationNoteText
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
      if (Math.abs((element.ccw_rotation ?? 0) % 90) < 1e-8)
        expect(Math.abs(bounds[edge] - record.inkBounds[edge])).toBeLessThan(
          tolerance,
        )
    }
    expect(getBoundsOfPcbElements([element])).toEqual(bounds)
  })
}
const element = reference.records[83]!.element as PcbFabricationNoteText
const anchorBounds = {
  minX: element.anchor_position.x,
  maxX: element.anchor_position.x,
  minY: element.anchor_position.y,
  maxY: element.anchor_position.y,
}
test("painted text away from anchor participates in selection", () => {
  expect(
    getPcbElementsWithinBounds([element], {
      minX: 2.3,
      maxX: 2.36,
      minY: -1.08,
      maxY: -1.02,
    }),
  ).toEqual([element])
  expect(
    getPcbElementsWithinBounds([element], {
      minX: 3,
      maxX: 3.1,
      minY: -1.1,
      maxY: -0.9,
    }),
  ).toEqual([])
})
for (const text of [
  "3 mm",
  " ",
  "Ω",
  "A\nB",
  "?",
  "A\tB",
  "😀",
  "",
  123,
  {},
  true,
  [],
])
  test(`unsupported text preserves anchor fallback ${JSON.stringify(text)}`, () => {
    expect(
      getPcbElementBounds({
        ...element,
        text,
      } as unknown as PcbFabricationNoteText),
    ).toEqual(anchorBounds)
  })
for (const font_size of [0, -1, Number.NaN, Number.POSITIVE_INFINITY, null])
  test(`invalid font size preserves anchor ${font_size}`, () =>
    expect(
      getPcbElementBounds({
        ...element,
        font_size,
      } as unknown as PcbFabricationNoteText),
    ).toEqual(anchorBounds))
for (const ccw_rotation of [Number.NaN, Number.POSITIVE_INFINITY, null])
  test(`invalid rotation preserves anchor ${ccw_rotation}`, () =>
    expect(
      getPcbElementBounds({
        ...element,
        ccw_rotation,
      } as unknown as PcbFabricationNoteText),
    ).toEqual(anchorBounds))
test("optional fields use renderer defaults", () =>
  expect(
    getPcbElementBounds({
      ...element,
      font_size: undefined,
      ccw_rotation: undefined,
      anchor_alignment: undefined,
      font: undefined,
    } as unknown as PcbFabricationNoteText),
  ).toEqual(
    getPcbElementBounds({
      ...element,
      font_size: 1,
      ccw_rotation: 0,
      anchor_alignment: "center",
    }),
  ))
test("unsupported font or anchor keeps fallback", () => {
  expect(
    getPcbElementBounds({
      ...element,
      font: "Arial",
    } as unknown as PcbFabricationNoteText),
  ).toEqual(anchorBounds)
  expect(
    getPcbElementBounds({
      ...element,
      anchor_alignment: "invalid",
    } as unknown as PcbFabricationNoteText),
  ).toEqual(anchorBounds)
})
test("frozen text input is unchanged", () => {
  const frozen = Object.freeze({
    ...element,
    anchor_position: Object.freeze({ ...element.anchor_position }),
  })
  const before = structuredClone(frozen)
  expect(getPcbElementBounds(frozen)).not.toBeNull()
  expect(frozen).toEqual(before)
})
test("missing anchor preserves null fallback", () =>
  expect(
    getPcbElementBounds({
      ...element,
      anchor_position: undefined,
    } as unknown as PcbFabricationNoteText),
  ).toBeNull())
test("overflowed text size preserves anchor fallback", () =>
  expect(
    getPcbElementBounds({
      ...element,
      text: "WWWW",
      font_size: Number.MAX_VALUE,
    }),
  ).toEqual(anchorBounds))
