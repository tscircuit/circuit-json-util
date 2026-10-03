import { expect, test } from "bun:test"
import {
  any_circuit_element,
  type PcbSmtPadPolygon,
  type PcbSolderPastePolygon,
} from "circuit-json"
import { convertCircuitJsonToPcbSvg } from "circuit-to-svg"
import {
  compose,
  inverse,
  rotateDEG,
  scale,
  translate,
} from "transformation-matrix"
import {
  findBoundsAndCenter,
  getPcbElementBounds,
  transformPCBElements,
} from "../index"

test("polygon copper and paste contours follow placement without center fields", () => {
  const points = [
    { x: 0, y: 0 },
    { x: 4, y: 0 },
    { x: 4, y: 3 },
    { x: 0, y: 3 },
  ]
  const holes = [
    [
      { x: 1, y: 1 },
      { x: 2, y: 1 },
      { x: 1, y: 2 },
    ],
  ]
  for (const layer of ["top", "bottom"] as const) {
    const pad: PcbSmtPadPolygon = {
      type: "pcb_smtpad",
      pcb_smtpad_id: "pad",
      pcb_component_id: "component",
      shape: "polygon",
      layer,
      points: structuredClone(points),
    }
    const paste: PcbSolderPastePolygon = {
      type: "pcb_solder_paste",
      pcb_solder_paste_id: "paste",
      pcb_smtpad_id: "pad",
      pcb_component_id: "component",
      pcb_group_id: "group",
      subcircuit_id: "subcircuit",
      shape: "polygon",
      layer,
      points: structuredClone(points),
      holes: structuredClone(holes),
    }
    const reflection = layer === "bottom" ? -1 : 1
    const matrix = compose(
      translate(10, -7),
      scale(1, reflection),
      rotateDEG(90),
    )
    const returned = transformPCBElements([pad, paste], matrix)
    expect(returned).toEqual([pad, paste])
    for (const polygon of [pad, paste]) {
      for (const [index, point] of polygon.points.entries()) {
        expect(point.x).toBeCloseTo(10 - points[index]!.y)
        expect(point.y).toBeCloseTo(-7 + reflection * points[index]!.x)
      }
      expect(polygon).not.toHaveProperty("x")
      expect(polygon).not.toHaveProperty("y")
      expect(any_circuit_element.parse(polygon)).toEqual(polygon)
    }
    for (const [index, point] of paste.holes![0]!.entries()) {
      expect(point.x).toBeCloseTo(10 - holes[0]![index]!.y)
      expect(point.y).toBeCloseTo(-7 + reflection * holes[0]![index]!.x)
    }
    expect(paste).toMatchObject({
      pcb_smtpad_id: "pad",
      pcb_component_id: "component",
      pcb_group_id: "group",
      subcircuit_id: "subcircuit",
      layer,
    })
    expect(getPcbElementBounds(paste)).toEqual(getPcbElementBounds(pad))
    expect(findBoundsAndCenter([paste])).toEqual(findBoundsAndCenter([pad]))
    if (layer === "top") {
      expect(
        convertCircuitJsonToPcbSvg([pad, paste], { showSolderPaste: true }),
      ).toMatchSvgSnapshot(import.meta.path)
    }
    transformPCBElements([pad, paste], inverse(matrix))
    for (const polygon of [pad, paste]) {
      for (const [index, point] of polygon.points.entries()) {
        expect(point.x).toBeCloseTo(points[index]!.x)
        expect(point.y).toBeCloseTo(points[index]!.y)
      }
    }
    for (const [index, point] of paste.holes![0]!.entries()) {
      expect(point.x).toBeCloseTo(holes[0]![index]!.x)
      expect(point.y).toBeCloseTo(holes[0]![index]!.y)
    }
  }
})
