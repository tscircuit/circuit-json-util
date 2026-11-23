import { expect, test } from "bun:test"
import type { PCBKeepout } from "circuit-json"
import {
  getBoundsOfPcbElements,
  getPcbElementBounds,
  getPcbElementsWithinBounds,
} from "../lib/get-bounds-of-pcb-elements"
import reference from "./fixtures/pcb-keepout-outline-stroke-0.0.450.json"
for (const record of reference.records)
  test(`keepout outline includes public SVG ink ${record.index}`, () => {
    const element = record.element as PCBKeepout
    const bounds = getPcbElementBounds(element)!
    expect(bounds).not.toBeNull()
    if (record.inkBounds) {
      for (const edge of ["minX", "maxX", "minY", "maxY"] as const)
        expect(Math.abs(bounds[edge] - record.inkBounds[edge])).toBeLessThan(
          record.worldPixel * 1.5,
        )
    } else {
      expect(bounds).toEqual(record.boundsBefore)
    }
    expect(getBoundsOfPcbElements([element])).toEqual(bounds)
  })
const sample = reference.records[7]!
const element = sample.element as Extract<PCBKeepout, { shape: "outline" }>
const centerline = { minX: -1, maxX: 5, minY: -3, maxY: -3 }
test("painted keepout cap participates in selection", () => {
  expect(sample.queryCount).toBe(24)
  expect(sample.selectionBefore).toBe(0)
  expect(getPcbElementsWithinBounds([element], sample.query)).toEqual([element])
  expect(
    getPcbElementsWithinBounds([element], {
      minX: 5.21,
      maxX: 5.25,
      minY: -3.03,
      maxY: -2.97,
    }),
  ).toEqual([])
  expect(getPcbElementBounds(element)).toEqual({
    minX: -1.2,
    maxX: 5.2,
    minY: -3.2,
    maxY: -2.8,
  })
})
for (const stroke_width of [
  undefined,
  null,
  0,
  -0.4,
  Number.NaN,
  Number.POSITIVE_INFINITY,
])
  test(`invalid width retains centerline ${stroke_width}`, () =>
    expect(
      getPcbElementBounds({
        ...element,
        stroke_width,
      } as unknown as PCBKeepout),
    ).toEqual(centerline))
for (const layers of [undefined, null, []])
  test(`no painted layers retains centerline ${JSON.stringify(layers)}`, () =>
    expect(
      getPcbElementBounds({ ...element, layers } as unknown as PCBKeepout),
    ).toEqual(centerline))
for (const outline of [undefined, null, []])
  test(`missing outline retains null ${JSON.stringify(outline)}`, () =>
    expect(
      getPcbElementBounds({ ...element, outline } as unknown as PCBKeepout),
    ).toBeNull())
test("schema rejects empty and one-point outlines", () => {
  expect(reference.schemaRejections.map((r) => r.outline.length)).toEqual([
    0, 1,
  ])
  const one = { ...element, outline: [{ x: 2, y: -3 }] }
  expect(getPcbElementBounds(one)).toEqual({
    minX: 2,
    maxX: 2,
    minY: -3,
    maxY: -3,
  })
})
test("null and malformed points retain legacy centerline", () => {
  expect(
    getPcbElementBounds({
      ...element,
      outline: [...element.outline, null],
    } as unknown as PCBKeepout),
  ).toEqual(centerline)
  expect(
    getPcbElementBounds({
      ...element,
      outline: [...element.outline, { x: "bad", y: 0 }],
    } as unknown as PCBKeepout),
  ).toEqual(centerline)
})
test("nonfinite point retains legacy bounds", () =>
  expect(
    getPcbElementBounds({
      ...element,
      outline: [...element.outline, { x: Number.NaN, y: 1 }],
    }),
  ).toEqual({ minX: Number.NaN, maxX: Number.NaN, minY: -3, maxY: 1 }))
test("public circle and rectangle remain nominal", () => {
  expect(
    getPcbElementBounds({
      type: "pcb_keepout",
      pcb_keepout_id: "rect",
      shape: "rect",
      center: { x: 2, y: -3 },
      width: 6,
      height: 4,
      layers: ["top"],
    }),
  ).toEqual({ minX: -1, maxX: 5, minY: -5, maxY: -1 })
  expect(
    getPcbElementBounds({
      type: "pcb_keepout",
      pcb_keepout_id: "circle",
      shape: "circle",
      center: { x: 2, y: -3 },
      radius: 2,
      layers: ["bottom"],
    }),
  ).toEqual({ minX: 0, maxX: 4, minY: -5, maxY: -1 })
})
test("nominal points and keepout settings are unchanged", () => {
  const frozen = Object.freeze({
    ...element,
    outline: Object.freeze(element.outline.map((p) => Object.freeze({ ...p }))),
    layers: Object.freeze([...element.layers]),
    warning_only: true,
    allow_traces: true,
    allow_placements: true,
    excluded_pcb_component_ids: Object.freeze(["component"]),
  }) as unknown as PCBKeepout
  const before = structuredClone(frozen)
  expect(getPcbElementBounds(frozen)).not.toBeNull()
  expect(frozen).toEqual(before)
})
test("overflowed exterior retains centerline", () =>
  expect(
    getPcbElementBounds({
      ...element,
      outline: [
        { x: Number.MAX_VALUE, y: 0 },
        { x: Number.MAX_VALUE, y: 1 },
      ],
      stroke_width: Number.MAX_VALUE,
    }),
  ).toEqual({
    minX: Number.MAX_VALUE,
    maxX: Number.MAX_VALUE,
    minY: 0,
    maxY: 1,
  }))
