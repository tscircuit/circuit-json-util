import { expect, test } from "bun:test"
import { getElementRenderLayer } from "../lib/get-element-render-layers"
import type { AnyCircuitElement } from "circuit-json"

test("getElementRenderLayer returns correct layers for different element types", () => {
  expect(
    getElementRenderLayer({ type: "pcb_smtpad", layer: "top" } as AnyCircuitElement),
  ).toEqual(["top_copper"])
  expect(
    getElementRenderLayer({ type: "pcb_copper_pour", layer: "bottom" } as AnyCircuitElement),
  ).toEqual(["bottom_copper"])
  expect(
    getElementRenderLayer({ type: "pcb_silkscreen_text", layer: "top" } as AnyCircuitElement),
  ).toEqual(["top_silkscreen"])
  expect(
    getElementRenderLayer({
      type: "pcb_fabrication_note_text",
      layer: "top",
    } as AnyCircuitElement),
  ).toEqual(["top_fabrication_note"])
  expect(
    getElementRenderLayer({
      type: "pcb_trace",
      route: [{ layer: "top" }, { layer: "bottom" }],
    } as AnyCircuitElement),
  ).toEqual(["top_copper", "bottom_copper"])
  expect(getElementRenderLayer({ type: "pcb_board" } as AnyCircuitElement)).toEqual([])
})
