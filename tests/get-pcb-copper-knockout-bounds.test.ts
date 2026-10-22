import { expect, test } from "bun:test"
import type { PcbCopperText } from "circuit-json"
import {
  getPcbElementBounds,
  getPcbElementsWithinBounds,
} from "../lib/get-bounds-of-pcb-elements"
import reference from "./fixtures/copper-knockout-bounds-0.0.450.json"

for (const [index, record] of reference.records.entries())
  test(`copper knockout bounds match official rectangle ${index}`, () => {
    const bounds = getPcbElementBounds(record.element as PcbCopperText)
    if (!bounds) throw new Error("Missing knockout bounds")
    for (const key of ["minX", "minY", "maxX", "maxY"] as const)
      expect(bounds[key]).toBeCloseTo(record.bounds[key], 12)
  })

test("selection inside visible knockout padding includes text", () => {
  const element = reference.records[0]!.element as PcbCopperText
  expect(
    getPcbElementsWithinBounds([element], {
      minX: 2.04,
      maxX: 2.06,
      minY: -3.06,
      maxY: -3.04,
    }),
  ).toEqual([element])
  expect(
    getPcbElementsWithinBounds([element], {
      minX: 2.04,
      maxX: 2.06,
      minY: 8,
      maxY: 9,
    }),
  ).toEqual([])
})

for (const knockout_padding of [
  { left: -100 },
  { right: Number.NaN },
  { top: Number.POSITIVE_INFINITY },
  { bottom: -100 },
])
  test(`non-drawable padding retains anchor fallback: ${JSON.stringify(knockout_padding)}`, () => {
    expect(
      getPcbElementBounds({
        ...reference.records[0]!.element,
        knockout_padding: {
          left: 0,
          right: 0,
          top: 0,
          bottom: 0,
          ...knockout_padding,
        },
      } as PcbCopperText),
    ).toEqual({ minX: 2, maxX: 2, minY: -3, maxY: -3 })
  })

test("zero-area knockout retains the existing fallback", () => {
  const element = {
    ...reference.records[0]!.element,
    text: ".",
    knockout_padding: { left: 0, right: 0, top: 0, bottom: 0 },
  } as PcbCopperText
  expect(getPcbElementBounds(element)).toEqual({
    minX: 2,
    maxX: 2,
    minY: -3,
    maxY: -3,
  })
})

test("shows official copper knockout rectangles inside model bounds", () => {
  const cards = [0, 3, 72, 161]
    .map((index, card) => {
      const record = reference.records[index]
      if (!record) throw new Error("Missing reference rectangle")
      const bounds = getPcbElementBounds(record.element as PcbCopperText)
      if (!bounds) throw new Error("Missing knockout bounds")
      const cx = (record.bounds.minX + record.bounds.maxX) / 2
      const cy = (record.bounds.minY + record.bounds.maxY) / 2
      const points = record.corners.map(({ x, y }) => `${x},${y}`)
      const polygon = [points[0], points[1], points[3], points[2]].join(" ")
      return `<g transform="translate(${160 + (card % 2) * 320},${125 + Math.floor(card / 2) * 250}) scale(25,-25) translate(${-cx},${-cy})"><polygon points="${polygon}" fill="#fed7aa" stroke="#b45309" stroke-width="0.05"/><rect x="${bounds.minX}" y="${bounds.minY}" width="${bounds.maxX - bounds.minX}" height="${bounds.maxY - bounds.minY}" fill="none" stroke="#dc2626" stroke-width="0.04"/></g>`
    })
    .join("")
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="500"><rect width="640" height="500" fill="white"/>${cards}</svg>`
  expect(svg).toMatchSvgSnapshot(import.meta.path, "copper-knockout-bounds")
})
