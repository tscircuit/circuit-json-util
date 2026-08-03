import { expect, test } from "bun:test"
import type { AnyCircuitElement, PcbPin1Location } from "circuit-json"
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

test("returns null for ambiguous linear footprints and missing pin 1", () => {
  expect(
    analyzePcbPin1Location([createPad(1, -1, 0), createPad(2, 1, 0)]),
  ).toBeNull()
  expect(
    analyzePcbPin1Location([createPad(2, -1, 0), createPad(3, 1, 0)]),
  ).toBeNull()
})
