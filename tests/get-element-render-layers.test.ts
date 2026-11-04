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

test.each(["top", "bottom"] as const)(
  "silkscreen pill uses the %s silkscreen render layer",
  (layer) => {
    expect(
      getElementRenderLayers({
        type: "pcb_silkscreen_pill",
        pcb_silkscreen_pill_id: `pcb_silkscreen_pill_${layer}`,
        pcb_component_id: "pcb_component_1",
        layer,
        center: { x: 0, y: 0 },
        width: 6,
        height: 2,
      }),
    ).toEqual([`${layer}_silkscreen`])
  },
)

test.each(["top", "bottom"] as const)(
  "silkscreen oval uses the %s silkscreen render layer",
  (layer) => {
    expect(
      getElementRenderLayers({
        type: "pcb_silkscreen_oval",
        pcb_silkscreen_oval_id: `pcb_silkscreen_oval_${layer}`,
        pcb_component_id: "pcb_component_1",
        layer,
        center: { x: 0, y: 0 },
        radius_x: 3,
        radius_y: 1,
        ccw_rotation: 30,
      }),
    ).toEqual([`${layer}_silkscreen`])
  },
)

test("inner-layer silkscreen pills retain their unfiltered classification", () => {
  for (const layer of ["inner1", "inner8"] as const) {
    expect(
      getElementRenderLayers({
        type: "pcb_silkscreen_pill",
        pcb_silkscreen_pill_id: `pcb_silkscreen_pill_${layer}`,
        pcb_component_id: "pcb_component_1",
        layer,
        center: { x: 0, y: 0 },
        width: 6,
        height: 2,
      }),
    ).toEqual([])
  }
})
