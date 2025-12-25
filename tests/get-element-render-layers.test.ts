import { expect, test } from "bun:test"
import { getElementRenderLayers } from "../lib/get-element-render-layers"
import type { AnyCircuitElement } from "circuit-json"

test("getElementRenderLayers returns correct layers for different element types", () => {
  expect(
    getElementRenderLayers({ type: "pcb_smtpad", layer: "top" } as AnyCircuitElement),
  ).toEqual(["top_copper"])
  expect(
    getElementRenderLayers({ type: "pcb_copper_pour", layer: "bottom" } as AnyCircuitElement),
  ).toEqual(["bottom_copper"])
  expect(
    getElementRenderLayers({ type: "pcb_silkscreen_text", layer: "top" } as AnyCircuitElement),
  ).toEqual(["top_silkscreen"])
  expect(
    getElementRenderLayers({
      type: "pcb_fabrication_note_text",
      layer: "top",
    } as AnyCircuitElement),
  ).toEqual(["top_fabrication_note"])
  expect(
    getElementRenderLayers({
      type: "pcb_trace",
      route: [{ layer: "top" }, { layer: "bottom" }],
    } as AnyCircuitElement),
  ).toEqual(["top_copper", "bottom_copper"])
  expect(getElementRenderLayers({ type: "pcb_board" } as AnyCircuitElement)).toEqual([])
})
