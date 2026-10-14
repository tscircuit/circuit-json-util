import { expect, test } from "bun:test"
import type { PcbNoteLine } from "circuit-json"
import {
  getBoundsOfPcbElements,
  getPcbElementBounds,
  getPcbElementsWithinBounds,
} from "../lib/get-bounds-of-pcb-elements"
import reference from "./fixtures/pcb-note-line-0.0.450.json"

for (const [index, r] of reference.records.entries()) {
  test(`note line bounds contain public SVG ink ${index}`, () => {
    const element = r.element as PcbNoteLine
    const bounds = getPcbElementBounds(element)
    expect(bounds).not.toBeNull()
    for (const edge of ["minX", "minY", "maxX", "maxY"] as const) {
      if (!element.is_dashed)
        expect(Math.abs(bounds![edge] - r.inkBounds[edge])).toBeLessThan(
          r.worldPixel * 1.5,
        )
      else if (edge.startsWith("min"))
        expect(bounds![edge]).toBeLessThanOrEqual(
          r.inkBounds[edge] + r.worldPixel * 1.5,
        )
      else
        expect(bounds![edge]).toBeGreaterThanOrEqual(
          r.inkBounds[edge] - r.worldPixel * 1.5,
        )
    }
    expect(getBoundsOfPcbElements([element])).toEqual(bounds!)
  })
}
const horizontal = reference.records[8]!.element as PcbNoteLine

test("round note cap and center are selectable", () => {
  expect(
    getPcbElementsWithinBounds([horizontal], {
      minX: 4.2,
      maxX: 4.35,
      minY: -0.05,
      maxY: 0.05,
    }),
  ).toEqual([horizontal])
  expect(
    getPcbElementsWithinBounds([horizontal], {
      minX: -0.01,
      maxX: 0.01,
      minY: -0.01,
      maxY: 0.01,
    }),
  ).toEqual([horizontal])
  expect(
    getPcbElementsWithinBounds([horizontal], {
      minX: 4.51,
      maxX: 4.6,
      minY: -0.05,
      maxY: 0.05,
    }),
  ).toEqual([])
  expect(getPcbElementBounds(horizontal)).toEqual({
    minX: -4.5,
    maxX: 4.5,
    minY: -0.5,
    maxY: 0.5,
  })
})

for (const [index, r] of reference.invisible.entries()) {
  test(`nonrendered dashed point preserves fallback ${index}`, () => {
    expect(r.count).toBe(0)
    expect(getPcbElementBounds(r.element as PcbNoteLine)).toBeNull()
  })
}
for (const width of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
  test(`invalid note line width preserves fallback ${width}`, () => {
    expect(
      getPcbElementBounds({ ...horizontal, stroke_width: width }),
    ).toBeNull()
  })
}
test("nonfinite note coordinates preserve fallback", () => {
  expect(
    getPcbElementBounds({ ...horizontal, x1: Number.POSITIVE_INFINITY }),
  ).toBeNull()
})
test("overflowed note line bounds preserve fallback", () => {
  expect(
    getPcbElementBounds({
      ...horizontal,
      x1: Number.MAX_VALUE,
      x2: Number.MAX_VALUE,
      stroke_width: Number.MAX_VALUE,
    }),
  ).toBeNull()
})
test("note line bounds do not mutate frozen input", () => {
  const element = Object.freeze({ ...horizontal })
  expect(getPcbElementBounds(element)).toEqual({
    minX: -4.5,
    maxX: 4.5,
    minY: -0.5,
    maxY: 0.5,
  })
})
test("round note line bounds visual comparison", () => {
  const indices = [8, 32, 52, 1]
  const labels = [
    "Round endpoints",
    "Diagonal line",
    "Zero-length solid line",
    "Dashed conservative frame",
  ]
  const cards = indices
    .map((index, card) => {
      const record = reference.records[index]!
      const element = record.element as PcbNoteLine
      const bounds = getPcbElementBounds(element)!
      const scale =
        Number(record.svgLine["stroke-width"]) / element.stroke_width
      const tx = Number(record.svgLine.x1) - element.x1 * scale
      const ty = Number(record.svgLine.y1) + element.y1 * scale
      const zoom = card === 3 ? 40 : 20
      const a = record.svgLine
      const dash =
        "stroke-dasharray" in a
          ? ` stroke-dasharray="${a["stroke-dasharray"]}"`
          : ""
      return `<g transform="translate(${(card % 2) * 400},${Math.floor(card / 2) * 260})"><text x="12" y="24" font-size="16">${labels[card]}</text><g transform="translate(200,140) scale(${zoom},${-zoom})"><g transform="matrix(${1 / scale},0,0,${-1 / scale},${-tx / scale},${ty / scale})"><line x1="${a.x1}" y1="${a.y1}" x2="${a.x2}" y2="${a.y2}" stroke="black" stroke-width="${a["stroke-width"]}" stroke-linecap="round"${dash}/></g><rect x="${bounds.minX}" y="${bounds.minY}" width="${bounds.maxX - bounds.minX}" height="${bounds.maxY - bounds.minY}" stroke="red" stroke-width="0.01" fill="none"/></g></g>`
    })
    .join("")
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="520" viewBox="0 0 800 520"><rect width="800" height="520" fill="white"/>${cards}</svg>`
  expect(svg).toMatchSvgSnapshot(
    import.meta.path,
    "pcb-note-line-stroke-bounds",
  )
})
