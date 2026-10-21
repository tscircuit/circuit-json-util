import { expect, test } from "bun:test"
import { pcb_component, type PcbSmtPadCircle } from "circuit-json"
import {
  compose,
  flipY,
  identity,
  rotateDEG,
  translate,
} from "transformation-matrix"
import { repositionPcbComponentTo, transformPcbElements } from "../index"

test("footprint origins follow their physical reference pad through transforms and layout", () => {
  for (const bottom of [false, true]) {
    for (const rotation of [0, 90, 180, 270]) {
      const component = Object.assign(
        pcb_component.parse({
          type: "pcb_component",
          pcb_component_id: "pcb_component_1",
          source_component_id: "source_component_1",
          center: { x: 0.135, y: 0.135 },
          width: 1.57,
          height: 1.57,
          layer: "top",
          rotation: 0,
        }),
        { footprint_origin: { x: 0, y: 0 } },
      )
      const referencePad: PcbSmtPadCircle = {
        type: "pcb_smtpad",
        pcb_smtpad_id: "pcb_smtpad_1",
        pcb_component_id: component.pcb_component_id,
        shape: "circle",
        x: 0,
        y: 0,
        radius: 0.65,
        layer: "top",
      }
      // Points enter footprint-local mm and leave board-world mm (+X right,
      // +Y top, +Z above, right-handed). Bottom placement reflects X.
      const footprintToBoard = compose(
        translate(5, -3),
        rotateDEG(rotation),
        bottom ? flipY() : identity(),
      )
      const circuitJson = [component, referencePad]
      transformPcbElements(circuitJson, footprintToBoard)
      expect(component.footprint_origin).toEqual({
        x: referencePad.x,
        y: referencePad.y,
      })
      repositionPcbComponentTo(circuitJson, component.pcb_component_id, {
        x: 11,
        y: 7,
      })
      expect(component.footprint_origin.x).toBeCloseTo(referencePad.x)
      expect(component.footprint_origin.y).toBeCloseTo(referencePad.y)
    }
  }
  const legacy = pcb_component.parse({
    type: "pcb_component",
    source_component_id: "source_component_legacy",
    center: { x: 0, y: 0 },
    width: 1,
    height: 1,
    rotation: 0,
    layer: "top",
  })
  transformPcbElements([legacy], translate(2, 3))
  expect(legacy).not.toHaveProperty("footprint_origin")
})
