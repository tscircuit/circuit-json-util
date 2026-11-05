import { expect, test } from "bun:test"
import type { AnyCircuitElement, PcbHoleWithPolygonPad } from "circuit-json"
import {
  type Matrix,
  applyToPoint,
  compose,
  rotate,
  rotateDEG,
  scale,
  translate,
} from "transformation-matrix"
import { transformPCBElement, transformPCBElements } from "../index"

const platedBase = {
  type: "pcb_plated_hole",
  layers: ["top", "bottom"],
  x: 1,
  y: 0,
}

const pill = (overrides = {}) =>
  ({
    ...platedBase,
    pcb_plated_hole_id: "pill",
    shape: "pill",
    outer_width: 1.2,
    outer_height: 2,
    hole_width: 0.8,
    hole_height: 1.5,
    ccw_rotation: 0,
    ...overrides,
  }) as unknown as AnyCircuitElement

const pillHoleWithRectPad = (overrides = {}) =>
  ({
    ...platedBase,
    pcb_plated_hole_id: "pill_rect",
    shape: "pill_hole_with_rect_pad",
    hole_shape: "pill",
    pad_shape: "rect",
    hole_width: 0.8,
    hole_height: 1.4,
    rect_pad_width: 1.2,
    rect_pad_height: 1.8,
    hole_offset_x: 0,
    hole_offset_y: 0,
    ...overrides,
  }) as unknown as AnyCircuitElement

const npthPill = (overrides = {}) =>
  ({
    type: "pcb_hole",
    pcb_hole_id: "npth_pill",
    hole_shape: "pill",
    hole_width: 0.6,
    hole_height: 1.2,
    x: 1,
    y: 0,
    ...overrides,
  }) as unknown as AnyCircuitElement

const polygonPad = (overrides = {}) =>
  ({
    ...platedBase,
    pcb_plated_hole_id: "polygon",
    shape: "hole_with_polygon_pad",
    hole_shape: "circle",
    hole_diameter: 0.8,
    // Asymmetric on purpose: no reflection maps this outline onto itself.
    pad_outline: [
      { x: -1, y: -0.5 },
      { x: 2, y: -0.5 },
      { x: 2, y: 0.25 },
      { x: 0, y: 1 },
    ],
    hole_offset_x: 0,
    hole_offset_y: 0,
    ...overrides,
  }) as unknown as PcbHoleWithPolygonPad

test("transformPCBElements rotates every rotatable hole shape", () => {
  const elements = [
    pill(),
    pill({ pcb_plated_hole_id: "oval", shape: "oval", ccw_rotation: 30 }),
    pillHoleWithRectPad(),
    {
      ...platedBase,
      pcb_plated_hole_id: "rotated_pill_rect",
      shape: "rotated_pill_hole_with_rect_pad",
      hole_shape: "rotated_pill",
      pad_shape: "rect",
      hole_width: 0.8,
      hole_height: 1.4,
      hole_ccw_rotation: 90,
      rect_pad_width: 1.2,
      rect_pad_height: 1.8,
      rect_ccw_rotation: 90,
      hole_offset_x: 0,
      hole_offset_y: 0,
    },
    {
      ...platedBase,
      pcb_plated_hole_id: "circle_rect",
      shape: "circular_hole_with_rect_pad",
      hole_shape: "circle",
      pad_shape: "rect",
      hole_diameter: 0.8,
      rect_pad_width: 1.2,
      rect_pad_height: 1.8,
      hole_offset_x: 0,
      hole_offset_y: 0,
    },
    polygonPad({ ccw_rotation: undefined }),
    {
      ...platedBase,
      pcb_plated_hole_id: "circle",
      shape: "circle",
      outer_diameter: 1.2,
      hole_diameter: 0.8,
    },
    npthPill(),
    npthPill({
      pcb_hole_id: "npth_rotated_pill",
      hole_shape: "rotated_pill",
      ccw_rotation: 45,
    }),
    {
      type: "pcb_solder_paste",
      pcb_solder_paste_id: "paste",
      shape: "rotated_pill",
      layer: "top",
      width: 1.2,
      height: 2,
      radius: 0.6,
      ccw_rotation: 0,
      x: 1,
      y: 0,
    },
  ] as any[]

  // Same shape of matrix core's applyPackOutput builds. The float noise in the
  // angle is the -90.00000000000001 rotation the packer produces.
  transformPCBElements(
    elements,
    compose(
      translate(10, 5),
      rotate((-90.00000000000001 * Math.PI) / 180),
      translate(0, 0),
    ),
  )

  const byId = (id: string) =>
    elements.find(
      (e) =>
        e.pcb_plated_hole_id === id ||
        e.pcb_hole_id === id ||
        e.pcb_solder_paste_id === id,
    )

  // Positions still move with the transform.
  expect(byId("pill").x).toBeCloseTo(10, 6)
  expect(byId("pill").y).toBeCloseTo(4, 6)

  expect(byId("pill").ccw_rotation).toBe(270)
  expect(byId("oval").ccw_rotation).toBe(300)
  expect(byId("pill_rect")).toMatchObject({
    shape: "rotated_pill_hole_with_rect_pad",
    hole_shape: "rotated_pill",
    hole_ccw_rotation: 270,
    rect_ccw_rotation: 270,
    rect_pad_width: 1.2,
    rect_pad_height: 1.8,
  })
  expect(byId("rotated_pill_rect")).toMatchObject({
    hole_ccw_rotation: 0,
    rect_ccw_rotation: 0,
  })
  expect(byId("circle_rect").rect_ccw_rotation).toBe(270)
  expect(byId("polygon").ccw_rotation).toBe(270)
  expect(byId("circle").ccw_rotation).toBeUndefined()
  expect(byId("npth_pill")).toMatchObject({
    hole_shape: "rotated_pill",
    ccw_rotation: 270,
  })
  expect(byId("npth_rotated_pill").ccw_rotation).toBe(315)
  expect(byId("paste").ccw_rotation).toBe(270)
})

test("transformPCBElement applies hole rotation for a single element", () => {
  expect(transformPCBElement(pill(), rotateDEG(90))).toMatchObject({
    shape: "pill",
    ccw_rotation: 90,
  })
})

test("rotation does not swap hole dimensions", () => {
  // ccw_rotation carries the turn, so swapping as well would turn it twice.
  const [hole] = transformPCBElements([pill()], rotateDEG(90))
  expect(hole).toMatchObject({
    outer_width: 1.2,
    outer_height: 2,
    hole_width: 0.8,
    hole_height: 1.5,
  })
})

test("translations leave hole orientation fields and shapes untouched", () => {
  const elements = [
    pill({ ccw_rotation: -90 }),
    pillHoleWithRectPad(),
    npthPill(),
    polygonPad({ ccw_rotation: undefined }),
  ]
  const expected = structuredClone(elements).map((elm: any) => ({
    ...elm,
    x: elm.x + 3,
    y: elm.y + 4,
  }))

  transformPCBElements(elements, translate(3, 4))

  expect(elements).toEqual(expected as any)
})

test("whole-degree rotations come out exact despite float noise", () => {
  // Without snapping, more than half of these combinations carry noise. For
  // example, rotating a 0 degree pill by 7 degrees gives 6.9999999999999725.
  const angles = [0, 7, 30, 37, 45, 53, 90, 123, 180, 200, 270]
  for (const start of angles) {
    for (const applied of [...angles, -37, -45, -53, -90]) {
      const [hole] = transformPCBElements(
        [pill({ ccw_rotation: start })],
        rotateDEG(applied),
      )
      expect(hole).toMatchObject({
        ccw_rotation: (((start + applied) % 360) + 360) % 360,
      })
    }
  }
})

test("float noise around zero degrees counts as no rotation", () => {
  const [hole] = transformPCBElements(
    [pillHoleWithRectPad()],
    rotate((360.00000000000006 * Math.PI) / 180),
  )
  expect(hole).toMatchObject({ shape: "pill_hole_with_rect_pad" })
})

test("mirroring keeps axis-aligned pills axis-aligned", () => {
  for (const mirror of [scale(1, -1), scale(-1, 1)]) {
    const [plated, withRectPad, npth] = transformPCBElements(
      [pill(), pillHoleWithRectPad(), npthPill()],
      mirror,
    )
    expect(plated).toMatchObject({ shape: "pill", ccw_rotation: 0 })
    expect(withRectPad).toMatchObject({ shape: "pill_hole_with_rect_pad" })
    expect(withRectPad).not.toHaveProperty("rect_ccw_rotation")
    expect(npth).toMatchObject({ hole_shape: "pill" })
    expect(npth).not.toHaveProperty("ccw_rotation")
  }
})

test("mirroring reflects the angle of a rotated hole", () => {
  for (const mirror of [scale(1, -1), scale(-1, 1)]) {
    const [hole] = transformPCBElements([pill({ ccw_rotation: 30 })], mirror)
    expect(hole).toMatchObject({ ccw_rotation: 150 })
  }
})

test("a mirror combined with a rotation converts unrotated pill shapes", () => {
  const [withRectPad, npth] = transformPCBElements(
    [pillHoleWithRectPad(), npthPill()],
    compose(scale(1, -1), rotateDEG(90)),
  )
  expect(withRectPad).toMatchObject({
    shape: "rotated_pill_hole_with_rect_pad",
    hole_ccw_rotation: 90,
    rect_ccw_rotation: 90,
  })
  expect(npth).toMatchObject({ hole_shape: "rotated_pill", ccw_rotation: 90 })
})

const placements: Matrix[] = [
  rotateDEG(90),
  rotateDEG(-90),
  rotateDEG(180),
  compose(translate(3, -2), rotateDEG(37)),
  scale(1, -1),
  scale(-1, 1),
  compose(scale(1, -1), rotateDEG(90)),
  compose(scale(-1, 1), rotateDEG(90)),
  compose(translate(4, 1), scale(-1, 1), rotateDEG(37)),
  compose(translate(4, 1), rotateDEG(37), scale(1, -1)),
]
const startingRotations = [0, 30, 90, 180, 200, 270]

test("a pill's long axis ends up where the placement sends it", () => {
  for (const placement of placements) {
    for (const ccw_rotation of startingRotations) {
      const [hole] = transformPCBElements(
        [pill({ ccw_rotation })],
        placement,
      ) as any[]

      const linear = { ...placement, e: 0, f: 0 }
      const axis = applyToPoint(compose(linear, rotateDEG(ccw_rotation)), {
        x: 1,
        y: 0,
      })
      const expected = (Math.atan2(axis.y, axis.x) * 180) / Math.PI
      const difference = (((hole.ccw_rotation - expected) % 180) + 180) % 180

      // A pill repeats every 180 degrees, so compare the angles modulo that.
      expect(Math.min(difference, 180 - difference)).toBeCloseTo(0, 6)
    }
  }
})

test("polygon pad vertices end up where the placement sends them", () => {
  const getWorldOutline = (hole: PcbHoleWithPolygonPad) =>
    hole.pad_outline.map((point) =>
      applyToPoint(
        compose(translate(hole.x, hole.y), rotateDEG(hole.ccw_rotation ?? 0)),
        point,
      ),
    )

  for (const placement of placements) {
    for (const ccw_rotation of startingRotations) {
      const hole = polygonPad({ ccw_rotation })
      const expected = getWorldOutline(hole).map((point) =>
        applyToPoint(placement, point),
      )

      transformPCBElement(hole, placement)

      const actual = getWorldOutline(hole)
      for (const [index, point] of actual.entries()) {
        expect(point.x).toBeCloseTo(expected[index]!.x, 6)
        expect(point.y).toBeCloseTo(expected[index]!.y, 6)
      }
    }
  }
})
