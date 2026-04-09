import { expect, test } from "bun:test"
import { getElementRenderLayers } from "../lib/get-element-render-layers"
import type { AnyCircuitElement } from "circuit-json"

test("getElementRenderLayers returns correct layers for different element types", () => {
  expect(
    getElementRenderLayers({
      type: "pcb_smtpad",
      layer: "top",
    } as AnyCircuitElement),
  ).toEqual(["top_copper"])
  expect(
    getElementRenderLayers({
      type: "pcb_copper_pour",
      layer: "bottom",
    } as AnyCircuitElement),
  ).toEqual(["bottom_copper"])
  expect(
    getElementRenderLayers({
      type: "pcb_silkscreen_text",
      layer: "top",
    } as AnyCircuitElement),
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
  expect(
    getElementRenderLayers({
      type: "pcb_courtyard_rect",
      layer: "bottom",
    } as AnyCircuitElement),
  ).toEqual(["bottom_courtyard"])
  expect(
    getElementRenderLayers({
      type: "pcb_courtyard_polygon",
      layer: "top",
    } as AnyCircuitElement),
  ).toEqual(["top_courtyard"])
  expect(
    getElementRenderLayers({ type: "pcb_board" } as AnyCircuitElement),
  ).toEqual([])
})

test("pcb_note elements return user_note layer based on element layer", () => {
  expect(
    getElementRenderLayers({
      type: "pcb_note_rect",
      layer: "top",
    } as AnyCircuitElement),
  ).toEqual(["top_user_note"])
  expect(
    getElementRenderLayers({
      type: "pcb_note_rect",
      layer: "bottom",
    } as AnyCircuitElement),
  ).toEqual(["bottom_user_note"])
  expect(
    getElementRenderLayers({
      type: "pcb_note_text",
      layer: "top",
    } as AnyCircuitElement),
  ).toEqual(["top_user_note"])
  expect(
    getElementRenderLayers({
      type: "pcb_note_line",
      layer: "bottom",
    } as AnyCircuitElement),
  ).toEqual(["bottom_user_note"])
  expect(
    getElementRenderLayers({
      type: "pcb_note_path",
      layer: "top",
    } as AnyCircuitElement),
  ).toEqual(["top_user_note"])
  expect(
    getElementRenderLayers({
      type: "pcb_note_dimension",
      layer: "bottom",
    } as AnyCircuitElement),
  ).toEqual(["bottom_user_note"])
})
