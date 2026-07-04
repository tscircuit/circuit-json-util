import type { AnyCircuitElement } from "circuit-json"
import { expect, test } from "bun:test"
import { getBoundsOfPcbElements } from "../lib/get-bounds-of-pcb-elements"
import { renderBoundsSvg } from "./fixtures/bounds-svg-snapshot"

test("getBoundsOfPcbElements visual: bounds vs a rotated pcb_component", () => {
  const component = {
    type: "pcb_component" as const,
    pcb_component_id: "comp1",
    source_component_id: "source_comp1",
    center: { x: 0, y: 0 },
    width: 4,
    height: 2,
    rotation: 45,
    layer: "top" as const,
    obstructs_within_bounds: false,
  }
  const bounds = getBoundsOfPcbElements([component as AnyCircuitElement])
  expect(renderBoundsSvg({ component, bounds })).toMatchSvgSnapshot(
    import.meta.path,
    "bounds-rotated-component",
  )
})
