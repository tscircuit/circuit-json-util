import { expect, test } from "bun:test"
import type { PcbNotePath } from "circuit-json"
import {
  getBoundsOfPcbElements,
  getPcbElementBounds,
  getPcbElementsWithinBounds,
} from "../lib/get-bounds-of-pcb-elements"
import reference from "./fixtures/pcb-note-path-0.0.450.json"

for (const [index, record] of reference.records.entries()) {
  test(`note path bounds match public SVG ink ${index}`, () => {
    const element = record.element as PcbNotePath
    const bounds = getPcbElementBounds(element)!
    expect(bounds).not.toBeNull()
    for (const edge of ["minX", "minY", "maxX", "maxY"] as const) {
      expect(Math.abs(bounds[edge] - record.inkBounds[edge])).toBeLessThan(
        record.worldPixel * 1.5,
      )
    }
    expect(getBoundsOfPcbElements([element])).toEqual(bounds)
  })
}
const horizontal = reference.records.find(
  (r) =>
    r.routeIndex === 0 &&
    r.element.stroke_width === 1 &&
    r.element.layer === "top",
)!.element as PcbNotePath

test("visible note stroke edge participates in range selection", () => {
  expect(
    getPcbElementsWithinBounds([horizontal], {
      minX: -0.1,
      maxX: 0.1,
      minY: 0.3,
      maxY: 0.45,
    }),
  ).toEqual([horizontal])
  expect(
    getPcbElementsWithinBounds([horizontal], {
      minX: -0.1,
      maxX: 0.1,
      minY: -0.01,
      maxY: 0.01,
    }),
  ).toEqual([horizontal])
  expect(
    getPcbElementsWithinBounds([horizontal], {
      minX: 4.01,
      maxX: 4.1,
      minY: -0.1,
      maxY: 0.1,
    }),
  ).toEqual([])
  expect(getPcbElementBounds(horizontal)).toEqual({
    minX: -4,
    maxX: 4,
    minY: -0.5,
    maxY: 0.5,
  })
})

for (const width of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
  test(`invalid stroke width preserves route fallback ${width}`, () => {
    expect(getPcbElementBounds({ ...horizontal, stroke_width: width })).toEqual(
      { minX: -4, maxX: 4, minY: 0, maxY: 0 },
    )
  })
}
for (const route of [
  [],
  [{ x: 2, y: 3 }],
  [
    { x: 2, y: 3 },
    { x: 2, y: 3 },
  ],
]) {
  test(`degenerate note route preserves fallback ${route.length}`, () => {
    const bounds = getPcbElementBounds({ ...horizontal, route })
    expect(bounds).toEqual(
      route.length ? { minX: 2, maxX: 2, minY: 3, maxY: 3 } : null,
    )
  })
}
test("note bounds do not mutate frozen input", () => {
  const route = Object.freeze(
    horizontal.route.map((point) => Object.freeze({ ...point })),
  )
  const element = Object.freeze({
    ...horizontal,
    route,
  }) as unknown as PcbNotePath
  expect(getPcbElementBounds(element)).toEqual({
    minX: -4,
    maxX: 4,
    minY: -0.5,
    maxY: 0.5,
  })
})

test("note path stroke bounds visual comparison", () => {
  const cases = [0, 20, 24, 44]
  const labels = [
    "Butt ends",
    "Miter join",
    "Bevel at limit",
    "Short outgoing segment",
  ]
  const cards = cases
    .map((index, card) => {
      const record = reference.records[index]!
      const element = record.element as PcbNotePath
      const bounds = getPcbElementBounds(element)!
      const coordinates = record.svgPath.d
        .match(/-?\d+(?:\.\d+)?(?:e[-+]?\d+)?/gi)!
        .map(Number)
      const scale =
        Number(record.svgPath["stroke-width"]) / element.stroke_width
      const tx = coordinates[0]! - element.route[0]!.x * scale
      const ty = coordinates[1]! + element.route[0]!.y * scale
      return `<g transform="translate(${(card % 2) * 400},${Math.floor(card / 2) * 260})"><text x="12" y="24" font-size="16">${labels[card]}</text><g transform="translate(200,140) scale(20,-20)"><g transform="matrix(${1 / scale},0,0,${-1 / scale},${-tx / scale},${ty / scale})"><path d="${record.svgPath.d}" stroke="black" stroke-width="${record.svgPath["stroke-width"]}" fill="none"/></g><rect x="${bounds.minX}" y="${bounds.minY}" width="${bounds.maxX - bounds.minX}" height="${bounds.maxY - bounds.minY}" stroke="red" stroke-width="0.06" fill="none"/></g></g>`
    })
    .join("")
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="520" viewBox="0 0 800 520"><rect width="800" height="520" fill="white"/>${cards}</svg>`
  expect(svg).toMatchSvgSnapshot(
    import.meta.path,
    "pcb-note-path-stroke-bounds",
  )
})
