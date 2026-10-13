import { expect, test } from "bun:test"
import { type AnyCircuitElement, pcb_fabrication_note_path } from "circuit-json"
import {
  getBoundsOfPcbElements,
  getPcbElementBounds,
  getPcbElementsWithinBounds,
} from "../lib/get-bounds-of-pcb-elements"
import reference from "./fixtures/pcb-fabrication-note-path-0.0.450.json"

type FabricationNotePath = Extract<
  AnyCircuitElement,
  { type: "pcb_fabrication_note_path" }
> & { has_stroke?: boolean; is_filled?: boolean }

for (const [index, record] of reference.records.entries()) {
  test(`fabrication note path bounds match public SVG ink ${index}`, () => {
    const element = record.element as FabricationNotePath
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
)!.element as FabricationNotePath

test("visible fabrication stroke edge participates in range selection", () => {
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
  test(`degenerate fabrication route preserves fallback ${route.length}`, () => {
    const bounds = getPcbElementBounds({ ...horizontal, route })
    expect(bounds).toEqual(
      route.length ? { minX: 2, maxX: 2, minY: 3, maxY: 3 } : null,
    )
  })
}
test("fabrication bounds do not mutate frozen input", () => {
  const route = Object.freeze(
    horizontal.route.map((point) => Object.freeze({ ...point })),
  )
  const element = Object.freeze({
    ...horizontal,
    route,
  }) as unknown as FabricationNotePath
  expect(getPcbElementBounds(element)).toEqual({
    minX: -4,
    maxX: 4,
    minY: -0.5,
    maxY: 0.5,
  })
})

test("closed fabrication path includes the first vertex miter", () => {
  const element = reference.records.find(
    (record) =>
      record.routeIndex === 14 &&
      record.element.stroke_width === 1 &&
      record.element.layer === "top" &&
      !record.element.is_filled,
  )!.element as FabricationNotePath
  const implicit = {
    ...element,
    route: element.route.slice(0, -1),
    is_filled: true,
  }
  const query = { minX: -1.7, maxX: -1.5, minY: -0.025, maxY: 0.025 }
  expect(getPcbElementsWithinBounds([element], query)).toEqual([element])
  expect(getPcbElementsWithinBounds([implicit], query)).toEqual([implicit])
  expect(getPcbElementBounds(implicit)).toEqual(getPcbElementBounds(element))
  expect(
    getPcbElementsWithinBounds([element], {
      ...query,
      minX: -2.1,
      maxX: -2.01,
    }),
  ).toEqual([])
  expect(
    getPcbElementBounds({
      type: "pcb_note_path",
      pcb_note_path_id: "ordinary",
      layer: "top",
      route: element.route,
      stroke_width: element.stroke_width,
    })!.minX,
  ).toBeGreaterThan(-1)
})
for (const is_filled of [false, true])
  test(`disabled fabrication stroke keeps route fallback ${is_filled}`, () => {
    const element = { ...horizontal, is_filled, has_stroke: false }
    expect(getPcbElementBounds(element)).toEqual({
      minX: -4,
      maxX: 4,
      minY: 0,
      maxY: 0,
    })
    expect(
      getPcbElementsWithinBounds([element], {
        minX: -0.1,
        maxX: 0.1,
        minY: 0.3,
        maxY: 0.45,
      }),
    ).toEqual([])
  })
for (const route of [
  [
    { x: 0, y: 0 },
    { x: 0, y: 0 },
    { x: 4, y: -1.1 },
    { x: 4, y: 1.1 },
    { x: 0, y: 0 },
    { x: 0, y: 0 },
  ],
  [
    { x: 0, y: 0 },
    { x: 4, y: -1.1 },
    { x: 4, y: -1.1 },
    { x: 4, y: 1.1 },
    { x: 0, y: 0 },
  ],
])
  test("duplicate points at closing join keep the same miter", () => {
    const original = reference.records.find(
      (record) => record.routeIndex === 14 && record.element.stroke_width === 1,
    )!.element as FabricationNotePath
    expect(getPcbElementBounds({ ...original, route })).toEqual(
      getPcbElementBounds(original),
    )
  })
test("overflowing fabrication segments preserve finite route fallback", () => {
  const element = {
    ...horizontal,
    route: [
      { x: -1e308, y: 0 },
      { x: 1e308, y: 0 },
    ],
  }
  expect(getPcbElementBounds(element)).toEqual({
    minX: -1e308,
    maxX: 1e308,
    minY: 0,
    maxY: 0,
  })
})

for (const [index, control] of reference.controls.entries())
  test(`fabrication fill-only or invisible SVG keeps prior bounds ${index}`, () => {
    expect(getPcbElementBounds(control.element as FabricationNotePath)).toEqual(
      control.priorBounds,
    )
  })
test("normalized mil fabrication coordinates and stroke match millimeter input", () => {
  const element = pcb_fabrication_note_path.parse({
    type: "pcb_fabrication_note_path",
    pcb_component_id: "component",
    layer: "top",
    route: [
      { x: "-100mil", y: "0mil" },
      { x: "100mil", y: "0mil" },
    ],
    stroke_width: "10mil",
  })
  const bounds = getPcbElementBounds(element)!
  expect(bounds.minX).toBeCloseTo(-2.54, 8)
  expect(bounds.maxX).toBeCloseTo(2.54, 8)
  expect(bounds.minY).toBeCloseTo(-0.127, 8)
  expect(bounds.maxY).toBeCloseTo(0.127, 8)
})
test("fabrication note path stroke bounds visual comparison", () => {
  const cases = [4, 116, 125, 53]
  const labels = [
    "Open butt ends",
    "Closed miter join",
    "Fill closes the path",
    "Bevel above miter limit",
  ]
  const cards = cases
    .map((index, card) => {
      const record = reference.records[index]!
      const element = record.element as FabricationNotePath
      const bounds = getPcbElementBounds(element)!
      const coordinates = record.svgPath.d
        .match(/-?\d+(?:\.\d+)?(?:e[-+]?\d+)?/gi)!
        .map(Number)
      const scale =
        Number(record.svgPath["stroke-width"]) / element.stroke_width
      const tx = coordinates[0]! - element.route[0]!.x * scale
      const ty = coordinates[1]! + element.route[0]!.y * scale
      return `<g transform="translate(${(card % 2) * 400},${Math.floor(card / 2) * 260})"><text x="12" y="24" font-size="16">${labels[card]}</text><g transform="translate(200,140) scale(20,-20)"><g transform="matrix(${1 / scale},0,0,${-1 / scale},${-tx / scale},${ty / scale})"><path d="${record.svgPath.d}" stroke="black" stroke-width="${record.svgPath["stroke-width"]}" fill="${record.svgPath.fill === "none" ? "none" : "#ddd"}"/></g><rect x="${bounds.minX}" y="${bounds.minY}" width="${bounds.maxX - bounds.minX}" height="${bounds.maxY - bounds.minY}" stroke="red" stroke-width="0.06" fill="none"/></g></g>`
    })
    .join("")
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="520" viewBox="0 0 800 520"><rect width="800" height="520" fill="white"/>${cards}</svg>`
  expect(svg).toMatchSvgSnapshot(
    import.meta.path,
    "pcb-fabrication-note-path-stroke-bounds",
  )
})
