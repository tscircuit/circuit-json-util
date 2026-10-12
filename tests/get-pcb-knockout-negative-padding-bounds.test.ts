import { expect, test } from "bun:test"
import type { PcbSilkscreenText } from "circuit-json"
import {
  getPcbElementBounds,
  getPcbElementsWithinBounds,
} from "../lib/get-bounds-of-pcb-elements"
import reference from "./fixtures/knockout-negative-padding-bounds-0.0.450.json"
import nonDrawable from "./fixtures/knockout-non-drawable-0.0.450.json"

for (const [index, record] of reference.records.entries())
  test(`negative-padding knockout bounds match official SVG rectangle ${index}`, () => {
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
      minX: 5.3,
      maxX: 5.4,
      minY: -4.85,
      maxY: -4.75,
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

for (const knockout_padding of [
  { left: -100, right: 0, top: 0, bottom: 0 },
  { left: 0, right: 0, top: -100, bottom: 0 },
  { left: Number.NaN, right: 0, top: 0, bottom: 0 },
  { left: Number.MAX_VALUE, right: Number.MAX_VALUE, top: 0, bottom: 0 },
])
  test("non-drawable knockout backgrounds retain fallback", () => {
    const element = {
      ...reference.records[0]!.element,
      knockout_padding,
    } as PcbSilkscreenText
    expect(getPcbElementBounds(element)).toEqual({
      minX: 2,
      maxX: 2,
      minY: -3,
      maxY: -3,
    })
  })
test("shows official negative-padding knockout rectangles inside computed bounds", () => {
  const cards = [0, 9, 108, 111]
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
  expect(svg).toMatchSvgSnapshot(
    import.meta.path,
    "knockout-negative-padding-bounds",
  )
})

for (const record of nonDrawable.records)
  test(`official ${record.name} background retains fallback`, () => {
    expect(getPcbElementBounds(record.element as PcbSilkscreenText)).toEqual({
      minX: 2,
      maxX: 2,
      minY: -3,
      maxY: -3,
    })
  })
