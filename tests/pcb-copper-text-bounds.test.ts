import { expect, test } from "bun:test"
import {
  type AnyCircuitElement,
  any_circuit_element,
  type PcbCopperText,
} from "circuit-json"
import {
  getBoundsOfPcbElements,
  getPcbElementBounds,
  getPcbElementsWithinBounds,
} from "../lib/get-bounds-of-pcb-elements"

test("getPcbElementsWithinBounds includes visible multiline copper text strokes away from anchor_position", () => {
  const copperText = any_circuit_element.parse({
    type: "pcb_copper_text",
    pcb_copper_text_id: "pcb_copper_text_strokes",
    pcb_component_id: "pcb_component_0",
    font: "tscircuit2024",
    font_size: 1,
    layer: "top",
    text: "R1 gil\nHHH",
    anchor_position: { x: 2, y: -3 },
    anchor_alignment: "top_left",
  })

  const strokeRadius = (1 * 0.53 * 0.15) / 2
  const bounds = getPcbElementBounds(copperText)
  expect(bounds).not.toBeNull()
  expect(bounds!.minX).toBeCloseTo(2 - strokeRadius, 6)
  expect(bounds!.minY).toBeCloseTo(-3 - 1.12047671 - strokeRadius, 6)
  expect(bounds!.maxX).toBeGreaterThan(5)
  expect(bounds!.maxY).toBeCloseTo(-3 + strokeRadius, 6)

  const selectedAtStrokeEndpoint = getPcbElementsWithinBounds([copperText], {
    minX: 1.99,
    minY: -3.38590197,
    maxX: 2.01,
    maxY: -3.36590197,
  })
  expect(selectedAtStrokeEndpoint).toEqual([copperText])
})

test("getPcbElementsWithinBounds includes knockout copper text padding and background rectangle corners", () => {
  const knockoutCopperText = any_circuit_element.parse({
    type: "pcb_copper_text",
    pcb_copper_text_id: "pcb_copper_text_knockout",
    pcb_component_id: "pcb_component_0",
    font: "tscircuit2024",
    font_size: 1,
    layer: "top",
    text: "HELLO\nR1",
    is_knockout: true,
    anchor_position: { x: 2, y: -3 },
    anchor_alignment: "top_left",
  })

  const bounds = getPcbElementBounds(knockoutCopperText)
  expect(bounds).not.toBeNull()
  expect(bounds!.minX).toBeCloseTo(2, 6)
  expect(bounds!.minY).toBeCloseTo(-4.42631321, 6)
  expect(bounds!.maxX).toBeCloseTo(5.32735484, 6)
  expect(bounds!.maxY).toBeCloseTo(-3, 6)

  const selectedInPadding = getPcbElementsWithinBounds([knockoutCopperText], {
    minX: 2.04,
    minY: -3.06,
    maxX: 2.06,
    maxY: -3.04,
  })
  expect(selectedInPadding).toEqual([knockoutCopperText])

  const selectedAtKnockoutCorner = getPcbElementsWithinBounds(
    [knockoutCopperText],
    {
      minX: 5.31,
      minY: -4.44,
      maxX: 5.34,
      maxY: -4.41,
    },
  )
  expect(selectedAtKnockoutCorner).toEqual([knockoutCopperText])
})

test("getBoundsOfPcbElements accounts for copper text rotation, mirroring, and custom knockout padding", () => {
  const rotatedKnockout: PcbCopperText = {
    type: "pcb_copper_text",
    pcb_copper_text_id: "pcb_copper_text_rotated",
    pcb_component_id: "pcb_component_0",
    font: "tscircuit2024",
    font_size: 2,
    layer: "bottom",
    text: "GND",
    ccw_rotation: 90,
    is_knockout: true,
    knockout_padding: {
      left: 0.5,
      right: 0.5,
      top: 0.25,
      bottom: 0.25,
    },
    anchor_position: { x: 0, y: 0 },
    anchor_alignment: "center",
  }

  const bounds = getBoundsOfPcbElements([rotatedKnockout as AnyCircuitElement])
  expect(bounds.minX).toBeCloseTo(-0.62280253, 6)
  expect(bounds.maxX).toBeCloseTo(0.62280253, 6)
  expect(bounds.minY).toBeLessThan(-1.8)
  expect(bounds.maxY).toBeGreaterThan(1.8)
})

test("getPcbElementBounds falls back to anchor_position when copper text has no renderable glyphs", () => {
  const emptyText: PcbCopperText = {
    type: "pcb_copper_text",
    pcb_copper_text_id: "pcb_copper_text_empty",
    pcb_component_id: "pcb_component_0",
    font: "tscircuit2024",
    font_size: 1,
    layer: "top",
    text: "",
    anchor_position: { x: 4, y: -5 },
    anchor_alignment: "center",
  }

  expect(getPcbElementBounds(emptyText)).toEqual({
    minX: 4,
    minY: -5,
    maxX: 4,
    maxY: -5,
  })
})
