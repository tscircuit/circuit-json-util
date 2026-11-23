import { expect, test } from "bun:test"
import type { PcbCourtyardRect } from "circuit-json"
import {
  getBoundsOfPcbElements,
  getPcbElementBounds,
  getPcbElementsWithinBounds,
} from "../lib/get-bounds-of-pcb-elements"
import reference from "./fixtures/pcb-courtyard-rect-stroke-0.0.450.json"

for (const record of reference.records) {
  test(`courtyard rectangle matches official round outline ${record.index}`, () => {
    const element = record.element as PcbCourtyardRect
    const bounds = getPcbElementBounds(element)!
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
}
const sample = reference.records.find(
  (r) =>
    r.element.width === 6 &&
    r.element.center.x === 2 &&
    r.element.layer === "top" &&
    r.element.ccw_rotation === 0,
)!
const rectangle = sample.element as PcbCourtyardRect

test("painted courtyard rectangle exterior participates in selection", () => {
  expect(sample.queryCount).toBeGreaterThan(0)
  expect(sample.selectionBefore).toBe(0)
  expect(getPcbElementsWithinBounds([rectangle], sample.query)).toEqual([
    rectangle,
  ])
  expect(
    getPcbElementsWithinBounds([rectangle], {
      minX: 5.03,
      maxX: 5.04,
      minY: -3.03,
      maxY: -2.97,
    }),
  ).toEqual([])
  expect(getPcbElementBounds(rectangle)).toEqual({
    minX: -1.025,
    maxX: 5.025,
    minY: -5.025,
    maxY: -0.975,
  })
})
test("round join expansion applies after rotation", () => {
  const bounds = getPcbElementBounds({ ...rectangle, ccw_rotation: 45 })!
  const halfExtent = 5 / Math.sqrt(2) + 0.025
  expect(bounds.maxX).toBeCloseTo(2 + halfExtent, 12)
  expect(bounds.maxY).toBeCloseTo(-3 + halfExtent, 12)
  expect(
    getPcbElementsWithinBounds([{ ...rectangle, ccw_rotation: 45 }], {
      minX: 2 + halfExtent + 0.002,
      maxX: 2 + halfExtent + 0.005,
      minY: -3.01,
      maxY: -2.99,
    }),
  ).toEqual([])
})
test("bounds do not mutate nominal rectangle or rotation", () => {
  const frozen = Object.freeze({
    ...rectangle,
    ccw_rotation: -37,
    center: Object.freeze({ ...rectangle.center }),
  })
  const before = structuredClone(frozen)
  expect(getPcbElementBounds(frozen)).not.toBeNull()
  expect(frozen).toEqual(before)
})
for (const ccw_rotation of [null, undefined])
  test(`nullish rotation defaults to unrotated ${ccw_rotation}`, () =>
    expect(
      getPcbElementBounds({ ...rectangle, ccw_rotation } as PcbCourtyardRect),
    ).toEqual(getPcbElementBounds(rectangle)))
for (const ccw_rotation of [
  Number.NaN,
  Number.POSITIVE_INFINITY,
  Number.MAX_VALUE,
])
  test(`nonfinite rotation arithmetic retains fallback ${ccw_rotation}`, () => {
    const bounds = getPcbElementBounds({ ...rectangle, ccw_rotation })!
    expect(bounds).toEqual(
      Number.isNaN(ccw_rotation)
        ? { minX: -1, maxX: 5, minY: -5, maxY: -1 }
        : {
            minX: Number.NaN,
            maxX: Number.NaN,
            minY: Number.NaN,
            maxY: Number.NaN,
          },
    )
  })
for (const width of [undefined, Number.NaN, Number.POSITIVE_INFINITY])
  test(`invalid width retains legacy result ${width}`, () => {
    const bounds = getPcbElementBounds({
      ...rectangle,
      width,
    } as PcbCourtyardRect)!
    if (width === undefined)
      expect(bounds).toEqual({
        minX: Number.NaN,
        maxX: Number.NaN,
        minY: -5,
        maxY: -1,
      })
    else
      expect(bounds).toEqual({
        minX: 2 - width / 2,
        maxX: 2 + width / 2,
        minY: -5,
        maxY: -1,
      })
  })
test("missing center preserves legacy null", () =>
  expect(
    getPcbElementBounds({
      ...rectangle,
      center: undefined,
    } as unknown as PcbCourtyardRect),
  ).toBeNull())
test("physical rectangular pad retains nominal bounds", () =>
  expect(
    getPcbElementBounds({
      type: "pcb_smtpad",
      pcb_smtpad_id: "pad",
      shape: "rect",
      x: 2,
      y: -3,
      width: 6,
      height: 4,
      layer: "top",
    }),
  ).toEqual({ minX: -1, maxX: 5, minY: -5, maxY: -1 }))
test("host display filtering remains separate from geometry", () => {
  expect(reference.controls).toHaveLength(2)
  for (const control of reference.controls)
    expect(control.renderedRectCount).toBe(0)
  expect(getPcbElementBounds(rectangle)!.maxX).toBe(5.025)
})
