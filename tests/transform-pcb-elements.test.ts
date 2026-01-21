import { expect, test } from "bun:test"
import { translate } from "transformation-matrix"
import type { AnyCircuitElement } from "circuit-json"
import { transformPCBElements } from "../lib/transform-soup-elements"

test("transformPCBElements moves pcb_silkscreen_path route", () => {
  const elms: AnyCircuitElement[] = [
    {
      type: "pcb_silkscreen_path",
      pcb_silkscreen_path_id: "sp1",
      pcb_component_id: "pc1",
      layer: "top",
      route: [
        { x: 0, y: 0 },
        { x: 1, y: 1 },
      ],
      stroke_width: 0.2,
    } as any,
  ]

  transformPCBElements(elms, translate(2, 3))

  const path = elms[0] as any
  expect(path.route[0]).toEqual({ x: 2, y: 3 })
  expect(path.route[1]).toEqual({ x: 3, y: 4 })
})
