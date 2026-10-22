import { expect, test } from "bun:test"
import { any_circuit_element } from "circuit-json"
import {
  getPcbElementBounds,
  getPcbElementsWithinBounds,
} from "../lib/get-bounds-of-pcb-elements"

test("normal copper text participating in PCB range selection", () => {
  const element = any_circuit_element.parse({
    type: "pcb_copper_text",
    pcb_copper_text_id: "txt1",
    pcb_component_id: "comp1",
    text: "R1 gil\nHHH",
    font_size: 1,
    anchor_alignment: "top_left",
    anchor_position: { x: 2, y: -3 },
    layer: "top",
  })

  const bounds = getPcbElementBounds(element)
  expect(bounds).not.toBeNull()
  expect(bounds!.minX).toBeLessThan(2)
  expect(bounds!.maxX).toBeGreaterThan(5)
  expect(bounds!.minY).toBeLessThan(-4)
  expect(bounds!.maxY).toBeGreaterThan(-3.05)

  // Query a 0.02mm square around stroke endpoint (2, -3.37590197)
  const queryBounds = {
    minX: 2 - 0.01,
    maxX: 2 + 0.01,
    minY: -3.37590197 - 0.01,
    maxY: -3.37590197 + 0.01,
  }
  const selected = getPcbElementsWithinBounds([element], queryBounds)
  expect(selected).toHaveLength(1)
  expect(selected[0]).toEqual(element)
})

test("knockout copper text participating in PCB range selection", () => {
  const element = any_circuit_element.parse({
    type: "pcb_copper_text",
    pcb_copper_text_id: "txt_ko",
    pcb_component_id: "comp1",
    text: "HELLO\nR1",
    font_size: 1,
    anchor_alignment: "top_left",
    anchor_position: { x: 2, y: -3 },
    layer: "top",
    font: "tscircuit2024",
    is_knockout: true,
  })

  const bounds = getPcbElementBounds(element)
  expect(bounds).not.toBeNull()
  // The rendered background spans x [2, 5.32735484] and y [-4.42631321, -3]
  expect(Math.abs(bounds!.minX - 2)).toBeLessThan(1e-4)
  expect(Math.abs(bounds!.maxX - 5.32735484)).toBeLessThan(1e-4)
  expect(Math.abs(bounds!.minY - -4.42631321)).toBeLessThan(1e-4)
  expect(Math.abs(bounds!.maxY - -3)).toBeLessThan(1e-4)

  // Query x [2.04, 2.06] and y [-3.06, -3.04], a visible padding region
  const queryBounds = {
    minX: 2.04,
    maxX: 2.06,
    minY: -3.06,
    maxY: -3.04,
  }
  const selected = getPcbElementsWithinBounds([element], queryBounds)
  expect(selected).toHaveLength(1)
  expect(selected[0]).toEqual(element)
})

test("silkscreen text participating in PCB range selection", () => {
  const label = any_circuit_element.parse({
    type: "pcb_silkscreen_text",
    pcb_silkscreen_text_id: "silk",
    pcb_component_id: "pc",
    layer: "top",
    font: "tscircuit2024",
    font_size: 1,
    text: "HELLO",
    ccw_rotation: 0,
    anchor_position: { x: 0, y: 0 },
    anchor_alignment: "center",
  })

  const bounds = getPcbElementBounds(label)
  expect(bounds).not.toBeNull()
  expect(bounds!.minX).toBeLessThan(-1.0)
  expect(bounds!.maxX).toBeGreaterThan(1.0)

  const selected = getPcbElementsWithinBounds([label], {
    minX: -1.55,
    maxX: -1.1,
    minY: -0.3,
    maxY: 0.3,
  })
  expect(selected).toHaveLength(1)
  expect(selected[0]).toEqual(label)
})
