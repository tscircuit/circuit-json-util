import { expect } from "bun:test"
import {
  pcb_soldermask_opening,
  type PcbSoldermaskOpeningRect,
  type PcbSoldermaskOpeningRotatedRect,
  type Point,
} from "circuit-json"
import {
  applyToPoint,
  compose,
  rotateDEG,
  translate,
} from "transformation-matrix"

export const createOpenings = (layer: "top" | "bottom") => {
  const base = {
    type: "pcb_soldermask_opening",
    layer,
    pcb_component_id: "component",
    pcb_group_id: "group",
    subcircuit_id: "subcircuit",
  }
  return [
    pcb_soldermask_opening.parse({
      ...base,
      pcb_soldermask_opening_id: "circle",
      shape: "circle",
      x: 7,
      y: -3,
      radius: 0.75,
    }),
    pcb_soldermask_opening.parse({
      ...base,
      pcb_soldermask_opening_id: "rect",
      shape: "rect",
      x: 4,
      y: -2,
      width: 6,
      height: 2,
    }),
    pcb_soldermask_opening.parse({
      ...base,
      pcb_soldermask_opening_id: "rotated_rect",
      shape: "rotated_rect",
      x: -2,
      y: 5,
      width: 4,
      height: 1,
      ccw_rotation: 37,
    }),
    pcb_soldermask_opening.parse({
      ...base,
      pcb_soldermask_opening_id: "polygon",
      shape: "polygon",
      points: [
        { x: -1, y: -3 },
        { x: 4, y: -3 },
        { x: 3, y: 2 },
      ],
    }),
  ]
}

export const getRectCornerPoints = (
  rect: PcbSoldermaskOpeningRect | PcbSoldermaskOpeningRotatedRect,
) => {
  const transform = compose(
    translate(rect.x, rect.y),
    rotateDEG(rect.shape === "rotated_rect" ? rect.ccw_rotation : 0),
  )
  return [
    { x: -rect.width / 2, y: -rect.height / 2 },
    { x: rect.width / 2, y: -rect.height / 2 },
    { x: rect.width / 2, y: rect.height / 2 },
    { x: -rect.width / 2, y: rect.height / 2 },
  ].map((point) => applyToPoint(transform, point))
}

export const expectSamePoints = (actual: Point[], expected: Point[]) => {
  expect(actual).toHaveLength(expected.length)
  for (const point of expected) {
    expect(
      actual.some(
        (candidate) =>
          Math.abs(candidate.x - point.x) < 1e-7 &&
          Math.abs(candidate.y - point.y) < 1e-7,
      ),
    ).toBe(true)
  }
}
