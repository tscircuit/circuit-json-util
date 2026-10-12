import { expect, test } from "bun:test"
import type { PcbCopperText } from "circuit-json"
import {
  getPcbElementBounds,
  getPcbElementsWithinBounds,
} from "../lib/get-bounds-of-pcb-elements"
import reference from "./fixtures/copper-text-bounds-0.0.450.json"

for (const [index, record] of reference.records.entries())
  test(`copper text stroke bounds match official SVG ${index}`, () => {
    const bounds = getPcbElementBounds(record.element as PcbCopperText)
    if (!bounds) throw new Error("Missing copper text bounds")
    for (const key of ["minX", "minY", "maxX", "maxY"] as const)
      expect(bounds[key]).toBeCloseTo(record.bounds[key], 12)
  })

test("selection at a visible copper stroke endpoint includes text", () => {
  const record = reference.records[0]!
  const element = record.element as PcbCopperText
  const point = record.points![0]!
  expect(
    getPcbElementsWithinBounds([element], {
      minX: point.x - 0.01,
      maxX: point.x + 0.01,
      minY: point.y - 0.01,
      maxY: point.y + 0.01,
    }),
  ).toEqual([element])
  expect(
    getPcbElementsWithinBounds([element], {
      minX: 9,
      maxX: 10,
      minY: 9,
      maxY: 10,
    }),
  ).toEqual([])
})

for (const text of ["", "   ", "\n", "Ω", "HΩL", "A\tB"])
  test(`unmeasured copper text retains anchor fallback: ${JSON.stringify(text)}`, () => {
    const element = { ...reference.records[0]!.element, text } as PcbCopperText
    expect(getPcbElementBounds(element)).toEqual({
      minX: 2,
      maxX: 2,
      minY: -3,
      maxY: -3,
    })
  })

test("unknown knockout copper text retains existing fallback", () => {
  expect(
    getPcbElementBounds({
      ...reference.records[0]!.element,
      is_knockout: true,
      text: "Ω",
    } as PcbCopperText),
  ).toEqual({ minX: 2, maxX: 2, minY: -3, maxY: -3 })
})

for (const font_size of [-1, 0, Number.NaN, Number.POSITIVE_INFINITY])
  test(`invalid font size retains fallback: ${font_size}`, () => {
    expect(
      getPcbElementBounds({
        ...reference.records[0]!.element,
        font_size,
      } as PcbCopperText),
    ).toEqual({ minX: 2, maxX: 2, minY: -3, maxY: -3 })
  })

for (const font_size of ["", " ", "\t"])
  test(`malformed unit string retains fallback: ${JSON.stringify(font_size)}`, () => {
    const element = {
      ...reference.records[0]!.element,
      font_size,
    } as unknown as PcbCopperText
    expect(getPcbElementBounds(element)).toEqual({
      minX: 2,
      maxX: 2,
      minY: -3,
      maxY: -3,
    })
  })

for (const anchor_position of [undefined, null, {}])
  test(`incomplete anchor retains null fallback: ${JSON.stringify(anchor_position)}`, () => {
    const element = {
      ...reference.records[0]!.element,
      anchor_position,
    } as unknown as PcbCopperText
    expect(getPcbElementBounds(element)).toBeNull()
  })

for (const ccw_rotation of [Number.NaN, Number.POSITIVE_INFINITY])
  test(`non-finite rotation retains anchor fallback: ${ccw_rotation}`, () => {
    expect(
      getPcbElementBounds({
        ...reference.records[0]!.element,
        ccw_rotation,
      } as PcbCopperText),
    ).toEqual({ minX: 2, maxX: 2, minY: -3, maxY: -3 })
  })

test("shows official copper paths within computed stroke bounds", () => {
  const cards = [0, 3, 124]
    .map((index, card) => {
      const record = reference.records[index]
      if (!record?.points) throw new Error("Missing reference stroke points")
      const bounds = getPcbElementBounds(record.element as PcbCopperText)
      if (!bounds) throw new Error("Missing copper bounds")
      const cx = (record.bounds.minX + record.bounds.maxX) / 2
      const cy = (record.bounds.minY + record.bounds.maxY) / 2
      const paths = []
      for (let i = 0; i < record.points.length; i += 2) {
        const p = record.points[i]!
        const q = record.points[i + 1]!
        paths.push(`M${p.x},${p.y}L${q.x},${q.y}`)
      }
      return `<g transform="translate(${160 + card * 320},160) scale(25,-25) translate(${-cx},${-cy})"><path d="${paths.join(" ")}" fill="none" stroke="#b45309" stroke-width="${record.strokeRadius * 2}" stroke-linecap="round" stroke-linejoin="round"/><rect x="${bounds.minX}" y="${bounds.minY}" width="${bounds.maxX - bounds.minX}" height="${bounds.maxY - bounds.minY}" fill="none" stroke="#dc2626" stroke-width="0.04"/></g>`
    })
    .join("")
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="320"><rect width="960" height="320" fill="white"/>${cards}</svg>`
  expect(svg).toMatchSvgSnapshot(import.meta.path, "copper-text-bounds")
})
