import { expect, test } from "bun:test"
import {
  type AnyCircuitElement,
  type PcbPin1Location,
  getRotationBetweenPcbPin1Locations,
} from "circuit-json"
import { analyzePcbPin1Location } from "../lib/analyze-pcb-pin1-location"

type RightAngleRotation = 0 | 90 | 180 | 270

const createPad = (pinNumber: number, x: number, y: number) =>
  ({
    type: "pcb_smtpad",
    shape: "rect",
    pcb_smtpad_id: `pcb_smtpad_${pinNumber}`,
    x,
    y,
    width: 0.5,
    height: 1,
    layer: "top",
    port_hints: [`pin${pinNumber}`],
  }) as AnyCircuitElement

const rotatePads = (pads: AnyCircuitElement[], rotation: RightAngleRotation) =>
  pads.map((pad) => {
    if (!("x" in pad) || !("y" in pad)) return pad
    const { x, y } = pad
    const center =
      rotation === 90
        ? { x: -y, y: x }
        : rotation === 180
          ? { x: -x, y: -y }
          : rotation === 270
            ? { x: y, y: -x }
            : { x, y }
    return { ...pad, ...center }
  })

const clockwisePinOrder = [
  createPad(1, -1, 1),
  createPad(2, -1, -1),
  createPad(3, 1, -1),
  createPad(4, 1, 1),
]
const counterClockwisePinOrder = [
  createPad(1, -1, 1),
  createPad(2, 1, 1),
  createPad(3, 1, -1),
  createPad(4, -1, -1),
]

const cases: Array<{
  pads: AnyCircuitElement[]
  rotation: RightAngleRotation
  expected: PcbPin1Location
}> = [
  { pads: clockwisePinOrder, rotation: 0, expected: "leftside_top" },
  { pads: clockwisePinOrder, rotation: 90, expected: "bottomside_left" },
  { pads: clockwisePinOrder, rotation: 180, expected: "rightside_bottom" },
  { pads: clockwisePinOrder, rotation: 270, expected: "topside_right" },
  { pads: counterClockwisePinOrder, rotation: 0, expected: "topside_left" },
  {
    pads: counterClockwisePinOrder,
    rotation: 90,
    expected: "leftside_bottom",
  },
  {
    pads: counterClockwisePinOrder,
    rotation: 180,
    expected: "bottomside_right",
  },
  {
    pads: counterClockwisePinOrder,
    rotation: 270,
    expected: "rightside_top",
  },
]

test("analyzes all semantic pin 1 locations", () => {
  for (const { pads, rotation, expected } of cases) {
    expect(analyzePcbPin1Location(rotatePads(pads, rotation))).toBe(expected)
  }
})

test("returns null for ambiguous multi-pad footprints and missing pin 1", () => {
  expect(
    analyzePcbPin1Location([
      createPad(1, -1, 0),
      createPad(2, 0, 0),
      createPad(3, 1, 0),
    ]),
  ).toBeNull()
  expect(
    analyzePcbPin1Location([createPad(2, -1, 0), createPad(3, 1, 0)]),
  ).toBeNull()
})

const ledPads = [createPad(1, -0.749, 0), createPad(2, 0.749, 0)]
const rightAngles: RightAngleRotation[] = [0, 90, 180, 270]

test("infers a consistent two-pad LED frame at each right-angle rotation", () => {
  const expected: PcbPin1Location[] = [
    "topside_left",
    "leftside_bottom",
    "bottomside_right",
    "rightside_top",
  ]
  for (const [index, rotation] of rightAngles.entries()) {
    expect(analyzePcbPin1Location(rotatePads(ledPads, rotation))).toBe(
      expected[index]!,
    )
  }
})

test("recovers supplier-to-local LED rotation for every pair of frames", () => {
  for (const supplierRotation of rightAngles) {
    for (const localRotation of rightAngles) {
      const supplier = analyzePcbPin1Location(
        rotatePads(ledPads, supplierRotation),
      )
      const local = analyzePcbPin1Location(rotatePads(ledPads, localRotation))
      expect(supplier).not.toBeNull()
      expect(local).not.toBeNull()
      expect(getRotationBetweenPcbPin1Locations(supplier!, local!)).toBe(
        ((localRotation - supplierRotation + 360) % 360) as RightAngleRotation,
      )
    }
  }
})

test("two-pad frames do not depend on pad order, origin or small rounding errors", () => {
  expect(
    analyzePcbPin1Location([
      createPad(2, -8.251, -2 + 1e-8),
      createPad(1, -9.749, -2),
    ]),
  ).toBe("topside_left")
})

test("does not guess a two-pad frame without distinct axis-aligned pins 1 and 2", () => {
  for (const pads of [
    [createPad(1, 0, 0), createPad(2, 0, 0)],
    [createPad(1, -1, -1), createPad(2, 1, 1)],
    [createPad(1, -1, 0), createPad(1, 1, 0)],
    [createPad(1, -1, 0), createPad(3, 1, 0)],
  ]) {
    expect(analyzePcbPin1Location(pads)).toBeNull()
  }
})
