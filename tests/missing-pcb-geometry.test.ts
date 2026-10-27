import { expect, test } from "bun:test"
import {
  type AnyCircuitElement,
  pcb_fabrication_note_rect,
  pcb_hole,
  pcb_note_line,
  pcb_silkscreen_line,
  pcb_silkscreen_oval,
  pcb_silkscreen_pill,
} from "circuit-json"
import { identity, translate } from "transformation-matrix"
import {
  getPcbElementBounds,
  getPcbElementsWithinBounds,
} from "../lib/get-bounds-of-pcb-elements"
import { getElementRenderLayers } from "../lib/get-element-render-layers"
import { repositionPcbComponentTo } from "../lib/reposition-pcb-component"
import { transformPCBElement } from "../lib/transform-soup-elements"

for (const schema of [pcb_silkscreen_pill, pcb_silkscreen_oval]) {
  for (const layer of ["top", "bottom"] as const) {
    test(`${schema.shape.type.value} respects ${layer} layer filtering`, () => {
      const element = schema.parse({
        type: schema.shape.type.value,
        pcb_component_id: "c1",
        center: { x: 0, y: 0 },
        width: 4,
        height: 2,
        radius_x: 2,
        radius_y: 1,
        layer,
      })
      expect(getElementRenderLayers(element)).toEqual([`${layer}_silkscreen`])
    })
  }
}

for (const hole_shape of ["rect", "oval", "pill"] as const) {
  test(`${hole_shape} non-plated hole has its full bounds`, () => {
    const hole = pcb_hole.parse({
      type: "pcb_hole",
      hole_shape,
      x: 5,
      y: 3,
      hole_width: 4,
      hole_height: 2,
    })
    expect(getPcbElementBounds(hole)).toEqual({
      minX: 3,
      maxX: 7,
      minY: 2,
      maxY: 4,
    })
    expect(
      getPcbElementsWithinBounds([hole], {
        minX: 3,
        maxX: 3.1,
        minY: 2.9,
        maxY: 3.1,
      }),
    ).toEqual([hole])
  })
}

test("rotated pill hole uses capsule bounds", () => {
  const hole = pcb_hole.parse({
    type: "pcb_hole",
    hole_shape: "rotated_pill",
    x: 0,
    y: 0,
    hole_width: 6,
    hole_height: 2,
    ccw_rotation: 45,
  })
  const bounds = getPcbElementBounds(hole)!
  for (const value of Object.values(bounds))
    expect(Math.abs(value)).toBeCloseTo(1 + Math.sqrt(2))
})

for (const schema of [pcb_note_line, pcb_silkscreen_line]) {
  test(`${schema.shape.type.value} participates in spatial queries`, () => {
    const line = schema.parse({
      type: schema.shape.type.value,
      pcb_component_id: "c1",
      layer: "top",
      x1: 4,
      y1: 3,
      x2: -2,
      y2: -1,
      stroke_width: 0.2,
    })
    expect(getPcbElementBounds(line)).toEqual({
      minX: -2.1,
      maxX: 4.1,
      minY: -1.1,
      maxY: 3.1,
    })
    expect(
      getPcbElementsWithinBounds([line], {
        minX: 3.95,
        maxX: 4.05,
        minY: 2.95,
        maxY: 3.05,
      }),
    ).toEqual([line])
    expect(
      getPcbElementsWithinBounds([line], {
        minX: 10,
        maxX: 11,
        minY: 10,
        maxY: 11,
      }),
    ).toEqual([])
  })
}

test("fabrication rectangle follows its component when repositioned", () => {
  const rect = pcb_fabrication_note_rect.parse({
    type: "pcb_fabrication_note_rect",
    pcb_component_id: "c1",
    center: { x: 2, y: 3 },
    width: 4,
    height: 2,
    layer: "top",
  })
  const elements: AnyCircuitElement[] = [
    {
      type: "pcb_component",
      pcb_component_id: "c1",
      source_component_id: "s1",
      center: { x: 1, y: 1 },
      width: 5,
      height: 5,
      rotation: 0,
      layer: "top",
      obstructs_within_bounds: true,
    },
    rect,
  ]
  repositionPcbComponentTo(elements, "c1", { x: 11, y: -1 })
  expect(rect.center).toEqual({ x: 12, y: 1 })
  expect(rect.width).toBe(4)
  expect(rect.height).toBe(2)
})

test("fabrication rectangle translation composes and identity preserves center", () => {
  const rect = pcb_fabrication_note_rect.parse({
    type: "pcb_fabrication_note_rect",
    pcb_component_id: "c1",
    center: { x: 2, y: 3 },
    width: 4,
    height: 2,
    layer: "top",
  })
  transformPCBElement(rect, identity())
  expect(rect.center).toEqual({ x: 2, y: 3 })
  transformPCBElement(rect, translate(2, -1))
  transformPCBElement(rect, translate(-2, 1))
  expect(rect.center).toEqual({ x: 2, y: 3 })
})
