import { expect, test } from "bun:test"
import type {
  CircuitJson,
  PcbCopperPourBRep,
  PcbSilkscreenGraphic,
} from "circuit-json"
import { compose, scale, translate } from "transformation-matrix"
import { transformPCBElements } from "../lib/transform-soup-elements"

test("transformPCBElements transforms BRep rings and flipped bulges", () => {
  const brepShape = {
    outer_ring: {
      vertices: [
        { x: 0, y: 0, bulge: 0.5 },
        { x: 2, y: 0 },
        { x: 2, y: 1 },
        { x: 0, y: 1 },
      ],
    },
    inner_rings: [
      {
        vertices: [
          { x: 0.5, y: 0.25 },
          { x: 0.5, y: 0.75 },
          { x: 1.5, y: 0.75 },
          { x: 1.5, y: 0.25 },
        ],
      },
    ],
  }
  const circuitJson: CircuitJson = [
    {
      type: "pcb_silkscreen_graphic",
      pcb_silkscreen_graphic_id: "pcb_silkscreen_graphic_test",
      pcb_component_id: "pcb_component_test",
      shape: "brep",
      brep_shape: structuredClone(brepShape),
      layer: "top",
    },
    {
      type: "pcb_copper_pour",
      pcb_copper_pour_id: "pcb_copper_pour_test",
      shape: "brep",
      brep_shape: structuredClone(brepShape),
      layer: "top",
      covered_with_solder_mask: true,
    },
  ]

  transformPCBElements(circuitJson, compose(translate(10, 20), scale(1, -1)))

  const silkscreenGraphic = circuitJson[0] as PcbSilkscreenGraphic
  const copperPour = circuitJson[1] as PcbCopperPourBRep

  expect(silkscreenGraphic.brep_shape).toEqual(copperPour.brep_shape)
  expect(silkscreenGraphic.brep_shape.outer_ring.vertices).toEqual([
    { x: 10, y: 19 },
    { x: 12, y: 19 },
    { x: 12, y: 20, bulge: -0.5 },
    { x: 10, y: 20 },
  ])
  expect(silkscreenGraphic.brep_shape.inner_rings[0]?.vertices).toEqual([
    { x: 11.5, y: 19.75 },
    { x: 11.5, y: 19.25 },
    { x: 10.5, y: 19.25 },
    { x: 10.5, y: 19.75 },
  ])
})
