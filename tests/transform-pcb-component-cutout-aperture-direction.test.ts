import { expect, test } from "bun:test"
import type {
  AnyCircuitElement,
  InsertionDirection,
  PcbComponent,
} from "circuit-json"
import { rotateDEG } from "transformation-matrix"
import { transformPCBElements } from "../lib/transform-soup-elements"

/**
 * Pack/reposition transforms operate on emitted PCB records. An aperture
 * direction must move with the same transform as insertion_direction or the two
 * fields disagree after a solver rotates the component.
 */
test("PCB transforms rotate cutout and insertion directions together", () => {
  const component = {
    type: "pcb_component",
    pcb_component_id: "component_1",
    source_component_id: "source_1",
    center: { x: 0, y: 0 },
    width: 4,
    height: 2,
    layer: "top",
    rotation: 0,
    insertion_direction: "from_right",
    cutout_aperture_direction: "from_right",
  } as PcbComponent & {
    cutout_aperture_direction?: InsertionDirection
  }
  const elements: AnyCircuitElement[] = [component]

  transformPCBElements(elements, rotateDEG(90))

  expect(component.rotation).toBeCloseTo(90)
  expect(component.insertion_direction).toBe("from_top")
  expect(component.cutout_aperture_direction).toBe("from_top")
})
