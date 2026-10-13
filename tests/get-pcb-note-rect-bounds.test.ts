import { expect, test } from "bun:test"
import type { PcbNoteRect } from "circuit-json"
import {
  getBoundsOfPcbElements,
  getPcbElementBounds,
  getPcbElementsWithinBounds,
} from "../lib/get-bounds-of-pcb-elements"
import { getPcbNoteRectBounds } from "../lib/get-pcb-note-rect-bounds"
import reference from "./fixtures/pcb-note-rect-0.0.450.json"

for (const [index, r] of reference.records.entries()) {
  test(`note rect bounds contain public SVG ink ${index}`, () => {
    const element = r.element as PcbNoteRect
    const bounds = getPcbElementBounds(element)!
    expect(bounds).not.toBeNull()
    for (const edge of ["minX", "minY", "maxX", "maxY"] as const) {
      if (!element.is_stroke_dashed)
        expect(Math.abs(bounds[edge] - r.inkBounds[edge])).toBeLessThan(
          r.worldPixel * 1.5,
        )
      else if (edge.startsWith("min"))
        expect(bounds[edge]).toBeLessThanOrEqual(
          r.inkBounds[edge] + r.worldPixel * 1.5,
        )
      else
        expect(bounds[edge]).toBeGreaterThanOrEqual(
          r.inkBounds[edge] - r.worldPixel * 1.5,
        )
    }
    expect(getBoundsOfPcbElements([element])).toEqual(bounds)
  })
}
const outline = reference.records[24]!.element as PcbNoteRect

test("note rect stroke exterior is selectable", () => {
  expect(
    getPcbElementsWithinBounds([outline], {
      minX: 5.2,
      maxX: 5.35,
      minY: -3.05,
      maxY: -2.95,
    }),
  ).toEqual([outline])
  expect(
    getPcbElementsWithinBounds([outline], {
      minX: 4.99,
      maxX: 5.01,
      minY: -3.01,
      maxY: -2.99,
    }),
  ).toEqual([outline])
  expect(
    getPcbElementsWithinBounds([outline], {
      minX: 5.51,
      maxX: 5.6,
      minY: -3.05,
      maxY: -2.95,
    }),
  ).toEqual([])
  expect(getPcbElementBounds(outline)).toEqual({
    minX: -1.5,
    maxX: 5.5,
    minY: -5.5,
    maxY: -0.5,
  })
})

for (const [index, r] of reference.invisible.entries()) {
  test(`nonrendered rect preserves previous bounds ${index}`, () => {
    expect(r.count).toBe(0)
    expect(getPcbElementBounds(r.element as PcbNoteRect)).toEqual(
      r.boundsBefore,
    )
  })
}
for (const width of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
  test(`invalid rect stroke preserves nominal fallback ${width}`, () => {
    expect(getPcbElementBounds({ ...outline, stroke_width: width })).toEqual({
      minX: -1,
      maxX: 5,
      minY: -5,
      maxY: -1,
    })
  })
}
test("nonfinite rect center declines stroke calculation", () => {
  expect(
    getPcbNoteRectBounds({ ...outline, center: { x: Number.NaN, y: -3 } }),
  ).toBeNull()
})
test("nonfinite rect dimension declines stroke calculation", () => {
  expect(
    getPcbNoteRectBounds({ ...outline, width: Number.POSITIVE_INFINITY }),
  ).toBeNull()
})
test("overflowed rect stroke bounds decline calculation", () => {
  expect(
    getPcbNoteRectBounds({
      ...outline,
      center: { x: Number.MAX_VALUE, y: 0 },
      width: Number.MAX_VALUE,
      stroke_width: Number.MAX_VALUE,
    }),
  ).toBeNull()
})
test("rect bounds do not mutate frozen input", () => {
  const element = Object.freeze({
    ...outline,
    center: Object.freeze({ ...outline.center }),
  })
  expect(getPcbElementBounds(element)).toEqual({
    minX: -1.5,
    maxX: 5.5,
    minY: -5.5,
    maxY: -0.5,
  })
})
test("note rectangle stroke bounds visual comparison", () => {
  const indices = [24, 28, 48, 6]
  const labels = [
    "Stroke exterior",
    "Rounded corners",
    "Stroke disabled fill",
    "Dashed conservative frame",
  ]
  const cards = indices
    .map((index, card) => {
      const record = reference.records[index]!
      const element = record.element as PcbNoteRect
      const bounds = getPcbElementBounds(element)!
      const a = record.svgRect
      const scale = Number(a.width) / Math.abs(element.width)
      const tx = Number(a.x) + Number(a.width) / 2 - element.center.x * scale
      const ty = Number(a.y) + Number(a.height) / 2 + element.center.y * scale
      const attrs = Object.entries(a)
        .filter(([key]) => !key.startsWith("data-") && key !== "class")
        .map(([key, value]) => `${key}="${value}"`)
        .join(" ")
      return `<g transform="translate(${(card % 2) * 400},${Math.floor(card / 2) * 260})"><text x="12" y="24" font-size="16">${labels[card]}</text><g transform="translate(160,80) scale(20,-20)"><g transform="matrix(${1 / scale},0,0,${-1 / scale},${-tx / scale},${ty / scale})"><rect ${attrs}/></g><rect x="${bounds.minX}" y="${bounds.minY}" width="${bounds.maxX - bounds.minX}" height="${bounds.maxY - bounds.minY}" stroke="red" stroke-width="0.02" fill="none"/></g></g>`
    })
    .join("")
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="520" viewBox="0 0 800 520"><rect width="800" height="520" fill="white"/>${cards}</svg>`
  expect(svg).toMatchSvgSnapshot(
    import.meta.path,
    "pcb-note-rect-stroke-bounds",
  )
})
