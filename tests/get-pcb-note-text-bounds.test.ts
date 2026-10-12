import { expect, test } from "bun:test"
import type { PcbNoteText } from "circuit-json"
import {
  getPcbElementBounds,
  getPcbElementsWithinBounds,
} from "../lib/get-bounds-of-pcb-elements"
import selection from "./fixtures/pcb-note-selection-0.0.450.json"
import reference from "./fixtures/pcb-note-text-0.0.450.json"
for (const [index, record] of reference.records.entries())
  test(`note bounds contain independent TTF ink ${index}`, () => {
    const bounds = getPcbElementBounds(record.element as PcbNoteText)
    if (!bounds) throw new Error("Missing note bounds")
    expect(bounds.minX).toBeLessThanOrEqual(record.inkBounds.minX + 1e-9)
    expect(bounds.maxX).toBeGreaterThanOrEqual(record.inkBounds.maxX - 1e-9)
    expect(bounds.minY).toBeLessThanOrEqual(record.inkBounds.minY + 1e-9)
    expect(bounds.maxY).toBeGreaterThanOrEqual(record.inkBounds.maxY - 1e-9)
  })
test("visible note edge participates in selection", () => {
  const note = selection.element as PcbNoteText
  expect(getPcbElementsWithinBounds([note], selection.query)).toEqual([note])
  expect(
    getPcbElementsWithinBounds([note], {
      minX: 10,
      maxX: 11,
      minY: 10,
      maxY: 11,
    }),
  ).toEqual([])
  expect(
    getPcbElementsWithinBounds([note], {
      minX: 1.9,
      maxX: 2.1,
      minY: -3.1,
      maxY: -2.9,
    }),
  ).toEqual([note])
})
for (const text of ["", " ", "A B", "HELLO\nR1", "\n", "Ω"])
  test(`unsupported note keeps fallback: ${JSON.stringify(text)}`, () => {
    expect(
      getPcbElementBounds({ ...selection.element, text } as PcbNoteText),
    ).toEqual({ minX: 2, maxX: 2, minY: -3, maxY: -3 })
  })
test("missing optional note text keeps fallback", () => {
  expect(
    getPcbElementBounds({
      ...selection.element,
      text: undefined,
    } as PcbNoteText),
  ).toEqual({ minX: 2, maxX: 2, minY: -3, maxY: -3 })
})
for (const font_size of [0, Number.NaN])
  test("invalid note size keeps fallback", () => {
    expect(
      getPcbElementBounds({ ...selection.element, font_size } as PcbNoteText),
    ).toEqual({ minX: 2, maxX: 2, minY: -3, maxY: -3 })
  })
test("overlay note ignores layer mirroring as the renderer does", () => {
  const top = reference.records[130]!.element as PcbNoteText
  const bottom = reference.records[131]!.element as PcbNoteText
  expect(getPcbElementBounds(top)).toEqual(getPcbElementBounds(bottom))
  expect(reference.records[130]!.inkBounds).toEqual(
    reference.records[131]!.inkBounds,
  )
})

test("shows note glyph ink inside conservative bounds", () => {
  const cards = [0, 16, 42, 132]
    .map((index, card) => {
      const record = reference.records[index]!
      const bounds = getPcbElementBounds(record.element as PcbNoteText)
      if (!bounds) throw new Error("Missing note bounds")
      const cx = (record.inkBounds.minX + record.inkBounds.maxX) / 2
      const cy = (record.inkBounds.minY + record.inkBounds.maxY) / 2
      return `<g transform="translate(${160 + (card % 2) * 320},${125 + Math.floor(card / 2) * 250}) scale(30,-30) translate(${-cx},${-cy})"><g transform="translate(${record.element.anchor_position.x},${record.element.anchor_position.y}) scale(1,-1)"><path d="${record.localPath}" fill="#2563eb"/></g><rect x="${bounds.minX}" y="${bounds.minY}" width="${bounds.maxX - bounds.minX}" height="${bounds.maxY - bounds.minY}" fill="none" stroke="#dc2626" stroke-width="0.025"/></g>`
    })
    .join("")
  expect(
    `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="500"><rect width="640" height="500" fill="white"/>${cards}</svg>`,
  ).toMatchSvgSnapshot(import.meta.path, "pcb-note-bounds")
})
