import { expect, test } from "bun:test"
import type { PcbCutout, PcbSmtPad } from "circuit-json"
import { computeClearanceBetweenElements } from "../lib/compute-clearance-between-elements"

const polygonCutout = {
  type: "pcb_cutout",
  pcb_cutout_id: "cutout_polygon",
  shape: "polygon",
  points: [
    { x: 9, y: 19 },
    { x: 11, y: 19 },
    { x: 11, y: 21 },
    { x: 9, y: 21 },
  ],
} satisfies PcbCutout

test.each([
  { name: "separated", x: 14, expectedGap: 2 },
  { name: "touching", x: 12, expectedGap: 0 },
  { name: "inside", x: 10, expectedGap: 0 },
])("polygon cutout clearance: $name pad", ({ x, expectedGap }) => {
  const pad = {
    type: "pcb_smtpad",
    pcb_smtpad_id: "pad",
    shape: "circle",
    x,
    y: 20,
    radius: 1,
    layer: "top",
  } satisfies PcbSmtPad

  expect(computeClearanceBetweenElements(polygonCutout, pad)).toBeCloseTo(
    expectedGap,
  )
  expect(computeClearanceBetweenElements(pad, polygonCutout)).toBeCloseTo(
    expectedGap,
  )
})

test("polygon cutout clearance follows the concave outline", () => {
  const cutout = {
    type: "pcb_cutout",
    pcb_cutout_id: "cutout_concave",
    shape: "polygon",
    points: [
      { x: 0, y: 0 },
      { x: 4, y: 0 },
      { x: 4, y: 1 },
      { x: 1, y: 1 },
      { x: 1, y: 4 },
      { x: 0, y: 4 },
    ],
  } satisfies PcbCutout
  const pad = {
    type: "pcb_smtpad",
    pcb_smtpad_id: "pad",
    shape: "circle",
    x: 3,
    y: 3,
    radius: 0.5,
    layer: "top",
  } satisfies PcbSmtPad

  expect(computeClearanceBetweenElements(cutout, pad)).toBeCloseTo(1.5)
})

test.each([
  { rotation: undefined, expectedGap: 1 },
  { rotation: 0, expectedGap: 1 },
  { rotation: 90, expectedGap: 2 },
  { rotation: -90, expectedGap: 2 },
  { rotation: 180, expectedGap: 1 },
])(
  "rectangular cutout clearance with rotation $rotation",
  ({ rotation, expectedGap }) => {
    const cutout = {
      type: "pcb_cutout",
      pcb_cutout_id: "cutout_rect",
      shape: "rect",
      center: { x: 10, y: 20 },
      width: 4,
      height: 2,
      rotation,
    } satisfies PcbCutout
    const pad = {
      type: "pcb_smtpad",
      pcb_smtpad_id: "pad",
      shape: "circle",
      x: 14,
      y: 20,
      radius: 1,
      layer: "top",
    } satisfies PcbSmtPad

    expect(computeClearanceBetweenElements(cutout, pad)).toBeCloseTo(
      expectedGap,
    )
    expect(computeClearanceBetweenElements(pad, cutout)).toBeCloseTo(
      expectedGap,
    )
  },
)
