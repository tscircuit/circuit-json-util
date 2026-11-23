import { expect, test } from "bun:test"
import type { PcbSilkscreenPath } from "circuit-json"
import {
  getBoundsOfPcbElements,
  getPcbElementBounds,
  getPcbElementsWithinBounds,
} from "../lib/get-bounds-of-pcb-elements"
import reference from "./fixtures/pcb-silkscreen-path-0.0.450.json"

for (const record of reference.records) {
  test(`silkscreen path bounds match public SVG ink ${record.index}`, () => {
    const element = record.element as PcbSilkscreenPath
    const bounds = getPcbElementBounds(element)
    if (!record.inkBounds) {
      expect(bounds).toEqual(record.boundsBefore)
      return
    }
    expect(bounds).not.toBeNull()
    for (const edge of ["minX", "maxX", "minY", "maxY"] as const) {
      expect(Math.abs(bounds![edge] - record.inkBounds[edge])).toBeLessThan(
        record.worldPixel * 1.5,
      )
    }
    expect(getBoundsOfPcbElements([element])).toEqual(bounds!)
  })
}
const record = reference.records[3]!
const path = record.element as PcbSilkscreenPath

test("silkscreen path round endpoint exterior participates in selection", () => {
  expect(record.queryCount).toBeGreaterThan(0)
  expect(record.selectionBefore).toBe(0)
  expect(getPcbElementsWithinBounds([path], record.query)).toEqual([path])
  expect(
    getPcbElementsWithinBounds([path], {
      minX: 5.55,
      maxX: 5.6,
      minY: -3.05,
      maxY: -2.95,
    }),
  ).toEqual([])
  expect(getPcbElementBounds(path)).toEqual({
    minX: -1.5,
    maxX: 5.5,
    minY: -3.5,
    maxY: -2.5,
  })
})
for (const stroke_width of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
  test(`invalid or zero path stroke retains fallback ${stroke_width}`, () => {
    expect(getPcbElementBounds({ ...path, stroke_width })).toEqual(
      record.boundsBefore,
    )
  })
}
test("invalid path coordinate retains existing route fallback", () => {
  const invalid = {
    ...path,
    route: [
      { x: Number.NaN, y: -3 },
      { x: 5, y: -3 },
    ],
  }
  expect(getPcbElementBounds(invalid)).toEqual({
    minX: Number.NaN,
    maxX: Number.NaN,
    minY: -3,
    maxY: -3,
  })
})
test("silkscreen path bounds do not mutate frozen input", () => {
  const frozen = Object.freeze({
    ...path,
    route: Object.freeze(
      path.route.map((point) => Object.freeze({ ...point })),
    ),
  })
  const before = structuredClone(frozen)
  expect(getPcbElementBounds(frozen as unknown as PcbSilkscreenPath)).toEqual({
    minX: -1.5,
    maxX: 5.5,
    minY: -3.5,
    maxY: -2.5,
  })
  expect(frozen).toEqual(before)
})
for (const point of [null, undefined]) {
  test(`nullish path point retains fallback ${point}`, () => {
    const invalid = {
      ...path,
      route: [point, { x: 5, y: -3 }],
    } as unknown as PcbSilkscreenPath
    expect(getPcbElementBounds(invalid)).toEqual({
      minX: 5,
      maxX: 5,
      minY: -3,
      maxY: -3,
    })
    expect(
      getPcbElementsWithinBounds([invalid], {
        minX: 4.9,
        maxX: 5.1,
        minY: -3.1,
        maxY: -2.9,
      }),
    ).toEqual([invalid])
  })
}
test("other path types retain nominal route bounds", () => {
  expect(
    getPcbElementBounds({ ...path, type: "pcb_fabrication_note_path" } as any),
  ).toEqual(record.boundsBefore)
})
