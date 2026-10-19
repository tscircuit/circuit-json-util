import { expect, test } from "bun:test"
import { pcb_cutout, type PcbCutoutRect, type Point } from "circuit-json"
import {
  applyToPoint,
  compose,
  identity,
  inverse,
  rotateDEG,
  scale,
  translate,
} from "transformation-matrix"
import { transformPCBElement, transformPCBElements } from "../index"

const createCutouts = () => {
  const ownership = {
    type: "pcb_cutout",
    pcb_component_id: "component",
    pcb_group_id: "group",
    subcircuit_id: "subcircuit",
  }
  return [
    pcb_cutout.parse({
      ...ownership,
      pcb_cutout_id: "rect",
      shape: "rect",
      center: { x: 2, y: 3 },
      width: 4,
      height: 1,
      rotation: 37,
      corner_radius: 0.2,
    }),
    pcb_cutout.parse({
      ...ownership,
      pcb_cutout_id: "circle",
      shape: "circle",
      center: { x: 7, y: -3 },
      radius: 0.75,
    }),
    pcb_cutout.parse({
      ...ownership,
      pcb_cutout_id: "polygon",
      shape: "polygon",
      points: [
        { x: 1, y: 2 },
        { x: 4, y: 2 },
        { x: 3, y: 4 },
      ],
    }),
    pcb_cutout.parse({
      ...ownership,
      pcb_cutout_id: "path",
      shape: "path",
      route: [
        { x: -2, y: 1 },
        { x: 3, y: 1 },
        { x: 3, y: 4 },
      ],
      slot_width: 0.4,
      slot_length: 1.1,
      space_between_slots: 0.3,
      slot_corner_radius: 0.2,
    }),
  ]
}

const expectSamePoints = (actual: Point[], expected: Point[]) => {
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

const getRectCorners = (rect: PcbCutoutRect) => {
  const placement = compose(
    translate(rect.center.x, rect.center.y),
    rotateDEG(rect.rotation ?? 0),
  )
  return [-1, 1].flatMap((x) =>
    [-1, 1].map((y) =>
      applyToPoint(placement, {
        x: (x * rect.width) / 2,
        y: (y * rect.height) / 2,
      }),
    ),
  )
}

test("every cutout shape moves in place without changing its ownership or dimensions", () => {
  for (const batch of [false, true]) {
    for (const before of createCutouts()) {
      const cutout = structuredClone(before)
      const placement = translate(10, -20)
      const transformed = batch
        ? transformPCBElements([cutout], placement)[0]
        : transformPCBElement(cutout, placement)

      expect(transformed).toBe(cutout)
      if (cutout.shape === "polygon" && before.shape === "polygon") {
        expect(cutout).toEqual({
          ...before,
          points: before.points.map((point) => applyToPoint(placement, point)),
        })
      } else if (cutout.shape === "path" && before.shape === "path") {
        expect(cutout).toEqual({
          ...before,
          route: before.route.map((point) => applyToPoint(placement, point)),
        })
      } else if (
        (cutout.shape === "rect" || cutout.shape === "circle") &&
        (before.shape === "rect" || before.shape === "circle")
      ) {
        expectSamePoints(
          [cutout.center],
          [applyToPoint(placement, before.center)],
        )
        expect({
          ...cutout,
          center: before.center,
          rotation: undefined,
        }).toEqual({
          ...before,
          rotation: undefined,
        })
        if (cutout.shape === "rect" && before.shape === "rect") {
          expect(cutout.rotation).toBeCloseTo(before.rotation!, 7)
        }
      }
      expect(pcb_cutout.parse(cutout)).toEqual(cutout)
    }
  }
})

test("rectangular cutout corners follow rotations and reflections without swapping local dimensions", () => {
  for (const initialRotation of [undefined, 37]) {
    for (const angle of [0, 30, 90, 180, 270]) {
      for (const reflection of [identity(), scale(-1, 1), scale(1, -1)]) {
        for (const placement of [
          compose(translate(100, -70), rotateDEG(angle), reflection),
          compose(translate(100, -70), reflection, rotateDEG(angle)),
        ]) {
          const before = createCutouts()[0]!
          if (before.shape !== "rect") throw new Error("Expected rectangle")
          before.rotation = initialRotation
          const cutout = structuredClone(before)
          const expectedCorners = getRectCorners(before).map((point) =>
            applyToPoint(placement, point),
          )

          transformPCBElements([cutout], placement)

          expectSamePoints(getRectCorners(cutout), expectedCorners)
          expect(cutout.width).toBe(before.width)
          expect(cutout.height).toBe(before.height)
          expect(cutout.corner_radius).toBe(before.corner_radius)
          expect(pcb_cutout.parse(cutout)).toEqual(cutout)
        }
      }
    }
  }
})

test("cutout geometry survives extraction and reinflation through a reflected placement", () => {
  for (const angle of [0, 30, 90, 180, 270]) {
    const placement = compose(
      translate(100, -70),
      rotateDEG(angle),
      scale(-1, 1),
    )
    for (const before of createCutouts()) {
      const cutout = structuredClone(before)
      transformPCBElements([cutout], placement)
      if (cutout.shape === "polygon" && before.shape === "polygon") {
        expectSamePoints(
          cutout.points,
          before.points.map((point) => applyToPoint(placement, point)),
        )
      } else if (cutout.shape === "path" && before.shape === "path") {
        expectSamePoints(
          cutout.route,
          before.route.map((point) => applyToPoint(placement, point)),
        )
      } else if (cutout.shape === "circle" && before.shape === "circle") {
        expectSamePoints(
          [cutout.center],
          [applyToPoint(placement, before.center)],
        )
      }

      transformPCBElements([cutout], inverse(placement))

      if (cutout.shape === "polygon" && before.shape === "polygon") {
        expectSamePoints(cutout.points, before.points)
      } else if (cutout.shape === "path" && before.shape === "path") {
        expectSamePoints(cutout.route, before.route)
      } else if (cutout.shape === "rect" && before.shape === "rect") {
        expectSamePoints(getRectCorners(cutout), getRectCorners(before))
      } else if (cutout.shape === "circle" && before.shape === "circle") {
        expectSamePoints([cutout.center], [before.center])
      }
    }
  }
})
