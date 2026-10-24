import { expect, test } from "bun:test"
import type { PcbFabricationNoteDimension } from "circuit-json"
import {
  getBoundsOfPcbElements,
  getPcbElementBounds,
  getPcbElementsWithinBounds,
} from "../lib/get-bounds-of-pcb-elements"
import reference from "./fixtures/pcb-fabrication-note-dimension-0.0.450.json"
for (const [index, r] of reference.records.entries()) {
  test(`fabrication dimension bounds match public SVG ink ${index}`, () => {
    const element = r.element as PcbFabricationNoteDimension
    const bounds = getPcbElementBounds(element)!
    expect(bounds).not.toBeNull()
    for (const edge of ["minX", "minY", "maxX", "maxY"] as const)
      expect(Math.abs(bounds[edge] - r.inkBounds[edge])).toBeLessThan(
        r.worldPixel * 1.5,
      )
    expect(getBoundsOfPcbElements([element])).toEqual(bounds)
  })
}
const dimension = reference.records[1]!.element as PcbFabricationNoteDimension

test("fabrication dimension line and extension participate in selection", () => {
  expect(
    getPcbElementsWithinBounds([dimension], {
      minX: -0.05,
      maxX: 0.05,
      minY: -0.05,
      maxY: 0.05,
    }),
  ).toEqual([dimension])
  expect(
    getPcbElementsWithinBounds([dimension], {
      minX: -4.05,
      maxX: -3.95,
      minY: 0.5,
      maxY: 0.6,
    }),
  ).toEqual([dimension])
  expect(
    getPcbElementsWithinBounds([dimension], {
      minX: 4.11,
      maxX: 4.2,
      minY: -0.05,
      maxY: 0.05,
    }),
  ).toEqual([])
  expect(getPcbElementBounds(dimension)).toEqual({
    minX: -4.1,
    maxX: 4.1,
    minY: -0.5,
    maxY: 1.1,
  })
})

for (const text of ["3 mm", " ", "Ω", "A\nB"]) {
  test(`labeled dimension retains fallback ${JSON.stringify(text)}`, () => {
    const element = { ...dimension, text }
    expect(getPcbElementBounds(element)).toBeNull()
    expect(
      getPcbElementsWithinBounds([element], {
        minX: -0.05,
        maxX: 0.05,
        minY: -0.05,
        maxY: 0.05,
      }),
    ).toEqual([])
  })
}
for (const arrow_size of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
  test(`invalid dimension arrow retains fallback ${arrow_size}`, () => {
    expect(getPcbElementBounds({ ...dimension, arrow_size })).toBeNull()
  })
}
test("nonfinite dimension endpoint retains fallback", () => {
  expect(
    getPcbElementBounds({
      ...dimension,
      from: { x: Number.POSITIVE_INFINITY, y: 0 },
    }),
  ).toBeNull()
})
test("nonfinite dimension offset distance retains fallback", () => {
  expect(
    getPcbElementBounds({
      ...dimension,
      offset_distance: Number.POSITIVE_INFINITY,
    }),
  ).toBeNull()
})
test("nonfinite dimension offset direction retains fallback", () => {
  expect(
    getPcbElementBounds({
      ...dimension,
      offset_direction: { x: Number.NaN, y: 1 },
    }),
  ).toBeNull()
})
test("overflowed dimension direction retains fallback", () => {
  expect(
    getPcbElementBounds({
      ...dimension,
      from: { x: Number.MAX_VALUE, y: 0 },
      to: { x: -Number.MAX_VALUE, y: 0 },
    }),
  ).toBeNull()
})
test("dimension bounds do not mutate frozen input", () => {
  const element = Object.freeze({
    ...dimension,
    from: Object.freeze({ ...dimension.from }),
    to: Object.freeze({ ...dimension.to }),
  })
  expect(getPcbElementBounds(element)).toEqual({
    minX: -4.1,
    maxX: 4.1,
    minY: -0.5,
    maxY: 1.1,
  })
})
test("unlabeled fabrication dimension bounds visual comparison", () => {
  const indices = [1, 3, 23, 41]
  const labels = [
    "Dimension and extensions",
    "Positive offset",
    "Diagonal dimension",
    "Coincident endpoints",
  ]
  const cards = indices
    .map((index, card) => {
      const record = reference.records[index]!
      const element = record.element as PcbFabricationNoteDimension
      const bounds = getPcbElementBounds(element)!
      const { scale, tx, ty } = record.transform
      const cx = (bounds.minX + bounds.maxX) / 2
      const cy = (bounds.minY + bounds.maxY) / 2
      const svg = record.svgChildren
        .map(
          (n) =>
            `<path ${Object.entries(n.attributes)
              .map(
                ([k, v]) =>
                  `${k}="${(k === "stroke" || k === "fill") && v !== "none" ? "#111" : v}"`,
              )
              .join(" ")}/>`,
        )
        .join("")
      const zoom = Math.min(
        28,
        320 / (bounds.maxX - bounds.minX),
        180 / (bounds.maxY - bounds.minY),
      )
      return `<g transform="translate(${(card % 2) * 400},${Math.floor(card / 2) * 260})"><text x="12" y="24" font-size="16">${labels[card]}</text><g transform="translate(200,145) scale(${zoom},${-zoom}) translate(${-cx},${-cy})"><g transform="matrix(${1 / scale},0,0,${-1 / scale},${-tx / scale},${ty / scale})">${svg}</g><rect x="${bounds.minX}" y="${bounds.minY}" width="${bounds.maxX - bounds.minX}" height="${bounds.maxY - bounds.minY}" stroke="red" stroke-width="${0.7 / zoom}" fill="none"/></g></g>`
    })
    .join("")
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="520" viewBox="0 0 800 520"><rect width="800" height="520" fill="white"/>${cards}</svg>`
  expect(svg).toMatchSvgSnapshot(
    import.meta.path,
    "pcb-fabrication-note-dimension-bounds",
  )
})
