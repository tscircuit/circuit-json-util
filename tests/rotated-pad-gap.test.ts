import { expect, test } from "bun:test"
import { pcb_smtpad } from "circuit-json"
import { convertCircuitJsonToPcbSvg } from "circuit-to-svg"
import {
  computeClearanceBetweenElements,
  computeGapBetweenCopper,
} from "../index"

const rotatedPad = (degrees: number, x = 0, y = 0) =>
  pcb_smtpad.parse({
    type: "pcb_smtpad",
    pcb_smtpad_id: "rotated_pad",
    pcb_component_id: "component_a",
    pcb_port_id: "port_a",
    shape: "rotated_rect",
    x,
    y,
    width: 4,
    height: 2,
    ccw_rotation: degrees,
    layer: "top",
  })

const circlePad = (x: number, y: number) =>
  pcb_smtpad.parse({
    type: "pcb_smtpad",
    pcb_smtpad_id: "circle_pad",
    pcb_component_id: "component_b",
    pcb_port_id: "port_b",
    shape: "circle",
    x,
    y,
    radius: 0.5,
    layer: "top",
  })

for (const { degrees, x, y, expected } of [
  { degrees: 0, x: 0, y: 4, expected: 2.5 },
  { degrees: 90, x: 0, y: 4, expected: 1.5 },
  { degrees: -90, x: 0, y: 4, expected: 1.5 },
  {
    degrees: 45,
    x: 4 / Math.sqrt(2),
    y: 4 / Math.sqrt(2),
    expected: 1.5,
  },
]) {
  test(`rotated rectangle at ${degrees} degrees has finite symmetric distances`, () => {
    const pad = rotatedPad(degrees)
    const circle = circlePad(x, y)

    for (const distance of [
      computeGapBetweenCopper,
      computeClearanceBetweenElements,
    ]) {
      expect(distance(pad, circle)).toBeCloseTo(expected, 8)
      expect(distance(circle, pad)).toBeCloseTo(expected, 8)
    }
  })
}

test("translated rotated rectangles report contact instead of infinity", () => {
  const pad = rotatedPad(90, 12, -3)
  const circle = circlePad(12, -1)

  expect(computeGapBetweenCopper(pad, circle)).toBe(0)
  expect(computeClearanceBetweenElements(pad, circle)).toBe(0)
})

test("rotated rectangles have the same gap as their axis-aligned equivalents", () => {
  const pad = rotatedPad(90)
  const equivalent = pcb_smtpad.parse({
    ...pad,
    shape: "rect",
    width: 2,
    height: 4,
  })
  const circle = circlePad(0, 4)

  expect(computeGapBetweenCopper(pad, circle)).toBeCloseTo(
    computeGapBetweenCopper(equivalent, circle),
    8,
  )
  const svg = convertCircuitJsonToPcbSvg([pad, circle])
  expect(svg).toContain("rotate(-90)")
  expect(svg.match(/data-type="pcb_smtpad"/g)).toHaveLength(2)
})
