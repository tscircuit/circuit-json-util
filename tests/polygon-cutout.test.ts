import { expect, test } from "bun:test"
import { pcb_cutout, pcb_smtpad } from "circuit-json"
import { computeClearanceBetweenElements } from "../lib/compute-clearance-between-elements"

const cutout = pcb_cutout.parse({
  type: "pcb_cutout",
  pcb_cutout_id: "cutout",
  shape: "polygon",
  points: [
    { x: 0, y: 0 },
    { x: 2, y: 0 },
    { x: 2, y: 2 },
    { x: 0, y: 2 },
  ],
})
for (const [name, x, y, expected] of [
  ["separated", 4, 1, 1.5],
  ["touching edge", 2.5, 1, 0],
  ["contained", 1, 1, 0],
  ["corner", 3, 3, Math.SQRT2 - 0.5],
  ["zero coordinate", -1, 0, 0.5],
] as const) {
  test(`polygon cutout without center: ${name}`, () => {
    const pad = pcb_smtpad.parse({
      type: "pcb_smtpad",
      pcb_smtpad_id: "pad",
      shape: "circle",
      x,
      y,
      radius: 0.5,
      layer: "top",
    })
    const before = JSON.stringify(cutout)
    expect("center" in cutout).toBe(false)
    expect(computeClearanceBetweenElements(cutout, pad)).toBeCloseTo(
      expected,
      8,
    )
    expect(computeClearanceBetweenElements(pad, cutout)).toBeCloseTo(
      expected,
      8,
    )
    expect(JSON.stringify(cutout)).toBe(before)
  })
}
test("empty polygon remains unsupported", () => {
  const empty = pcb_cutout.parse({
    type: "pcb_cutout",
    pcb_cutout_id: "empty",
    shape: "polygon",
    points: [],
  })
  expect(computeClearanceBetweenElements(empty, cutout)).toBe(
    Number.POSITIVE_INFINITY,
  )
})
test("center-based cutouts retain their geometry", () => {
  const circle = pcb_cutout.parse({
    type: "pcb_cutout",
    pcb_cutout_id: "c",
    shape: "circle",
    center: { x: 0, y: 0 },
    radius: 1,
  })
  const rect = pcb_cutout.parse({
    type: "pcb_cutout",
    pcb_cutout_id: "r",
    shape: "rect",
    center: { x: 4, y: 0 },
    width: 2,
    height: 2,
  })
  expect(computeClearanceBetweenElements(circle, rect)).toBeCloseTo(2)
})
test("missing center still rejects center-based shapes", () => {
  const rect = {
    type: "pcb_cutout",
    pcb_cutout_id: "bad",
    shape: "rect",
    width: 2,
    height: 2,
  } as Parameters<typeof computeClearanceBetweenElements>[0]
  expect(computeClearanceBetweenElements(rect, cutout)).toBe(
    Number.POSITIVE_INFINITY,
  )
})
