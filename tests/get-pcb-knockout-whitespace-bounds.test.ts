import { expect, test } from "bun:test"
import type { PcbSilkscreenText } from "circuit-json"
import {
  getPcbElementBounds,
  getPcbElementsWithinBounds,
} from "../lib/get-bounds-of-pcb-elements"
import reference from "./fixtures/knockout-whitespace-bounds-0.0.450.json"

for (const [index, record] of reference.records.entries())
  test(`whitespace knockout bounds match official SVG rectangle ${index}`, () => {
    const element = record.element as PcbSilkscreenText
    const bounds = getPcbElementBounds(element)
    if (!bounds) throw new Error("Missing knockout bounds")
    for (const key of ["minX", "minY", "maxX", "maxY"] as const)
      expect(bounds[key]).toBeCloseTo(record.bounds[key], 12)
  })

test("selection inside knockout padding includes the text", () => {
  const text = reference.records[0]!.element as PcbSilkscreenText
  expect(
    getPcbElementsWithinBounds([text], {
      minX: 2.05,
      maxX: 2.15,
      minY: -3.15,
      maxY: -3.05,
    }),
  ).toEqual([text])
  expect(
    getPcbElementsWithinBounds([text], {
      minX: 2.05,
      maxX: 2.15,
      minY: 4,
      maxY: 5,
    }),
  ).toEqual([])
})

for (const text of ["", " ", "\n", " \n ", "Ω", "A\tB", "i i", "R1\n\nl"])
  test(`unmeasured whitespace knockout text keeps fallback: ${JSON.stringify(text)}`, () => {
    const element = {
      ...reference.records[0]!.element,
      text,
    } as PcbSilkscreenText
    expect(getPcbElementBounds(element)).toEqual({
      minX: 2,
      maxX: 2,
      minY: -3,
      maxY: -3,
    })
  })

test("shows official whitespace knockout rectangles inside computed bounds", () => {
  const cards = [0, 9, 216, 223]
    .map((index, card) => {
      const record = reference.records[index]
      if (!record) throw new Error("Missing reference rectangle")
      const bounds = getPcbElementBounds(record.element as PcbSilkscreenText)
      if (!bounds) throw new Error("Missing knockout bounds")
      const cx = (record.bounds.minX + record.bounds.maxX) / 2
      const cy = (record.bounds.minY + record.bounds.maxY) / 2
      const points = record.corners.map(({ x, y }) => `${x},${y}`)
      // APIから取得した頂点の順序を、矩形の周回順に直します。
      const polygon = [points[0], points[1], points[3], points[2]].join(" ")
      return `<g transform="translate(${160 + (card % 2) * 320},${125 + Math.floor(card / 2) * 250}) scale(20,-20) translate(${-cx},${-cy})"><polygon points="${polygon}" fill="#bfdbfe" stroke="#2563eb" stroke-width="0.05"/><rect x="${bounds.minX}" y="${bounds.minY}" width="${bounds.maxX - bounds.minX}" height="${bounds.maxY - bounds.minY}" fill="none" stroke="#dc2626" stroke-width="0.06"/></g>`
    })
    .join("")
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="500"><rect width="640" height="500" fill="white"/>${cards}</svg>`
  expect(svg).toMatchSvgSnapshot(import.meta.path, "knockout-whitespace-bounds")
})
