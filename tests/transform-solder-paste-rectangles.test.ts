import { expect, test } from "bun:test"
import {
  any_circuit_element,
  type AnyCircuitElement,
  type PcbSolderPasteRect,
  type PcbSolderPasteRotatedRect,
  type Point,
} from "circuit-json"
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

type RectangularPaste = PcbSolderPasteRect | PcbSolderPasteRotatedRect

const getCorners = (paste: RectangularPaste) => {
  const placement = compose(
    translate(paste.x, paste.y),
    rotateDEG(paste.shape === "rotated_rect" ? paste.ccw_rotation : 0),
  )
  return [
    { x: -paste.width / 2, y: -paste.height / 2 },
    { x: paste.width / 2, y: -paste.height / 2 },
    { x: paste.width / 2, y: paste.height / 2 },
    { x: -paste.width / 2, y: paste.height / 2 },
  ].map((point) => applyToPoint(placement, point))
}

const expectSameCorners = (actual: Point[], expected: Point[]) => {
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

const expectRectangularPaste = (element: AnyCircuitElement | undefined) => {
  if (
    element?.type !== "pcb_solder_paste" ||
    (element.shape !== "rect" && element.shape !== "rotated_rect")
  ) {
    throw new Error("Expected a rectangular paste aperture")
  }
  return element
}

const transforms: { name: string; transform: typeof transformPCBElement }[] = [
  { name: "transformPCBElement", transform: transformPCBElement },
  {
    name: "transformPCBElements",
    transform: (element, matrix) => transformPCBElements([element], matrix)[0]!,
  },
]

for (const { name, transform } of transforms) {
  test(`${name} preserves paste corner geometry through placement, reflection and inverse`, () => {
    for (const layer of ["top", "bottom"] as const) {
      for (const initialRotation of [0, 37, -90]) {
        for (const angle of [-90, -37, 0, 37, 53, 89.9, 90, 180, 270]) {
          for (const reflection of [identity(), scale(-1, 1), scale(1, -1)]) {
            for (const placement of [
              compose(translate(10, -7), rotateDEG(angle), reflection),
              compose(translate(10, -7), reflection, rotateDEG(angle)),
            ]) {
              const paste: RectangularPaste = {
                type: "pcb_solder_paste",
                pcb_solder_paste_id: "paste",
                pcb_smtpad_id: "pad",
                pcb_component_id: "component",
                pcb_group_id: "group",
                subcircuit_id: "subcircuit",
                layer,
                x: 4,
                y: -2,
                width: 6,
                height: 2,
                ...(initialRotation === 0
                  ? { shape: "rect" }
                  : { shape: "rotated_rect", ccw_rotation: initialRotation }),
              }
              const originalCorners = getCorners(paste)
              const expectedCorners = originalCorners.map((point) =>
                applyToPoint(placement, point),
              )
              const placed = expectRectangularPaste(transform(paste, placement))
              expect(placed).toBe(paste)
              expectSameCorners(getCorners(placed), expectedCorners)
              expect(placed).toMatchObject({
                pcb_solder_paste_id: "paste",
                pcb_smtpad_id: "pad",
                pcb_component_id: "component",
                pcb_group_id: "group",
                subcircuit_id: "subcircuit",
                layer,
              })
              expect(any_circuit_element.parse(placed)).toEqual(placed)

              const restored = expectRectangularPaste(
                transform(placed, inverse(placement)),
              )
              expectSameCorners(getCorners(restored), originalCorners)
              expect(any_circuit_element.parse(restored)).toEqual(restored)
            }
          }
        }
      }
    }
  })

  test(`${name} swaps dimensions only when the resulting paste rectangle is axis-aligned`, () => {
    for (const angle of [0, 37, 89.9, 90, 90.1, 180, 270, -90]) {
      const paste: PcbSolderPasteRect = {
        type: "pcb_solder_paste",
        pcb_solder_paste_id: "paste",
        shape: "rect",
        layer: "top",
        x: 1,
        y: 0,
        width: 0.3,
        height: 1.5,
      }
      const placed = expectRectangularPaste(transform(paste, rotateDEG(angle)))
      if (angle % 90 === 0) {
        const swap = Math.abs(angle / 90) % 2 === 1
        expect(placed).toMatchObject({
          shape: "rect",
          width: swap ? 1.5 : 0.3,
          height: swap ? 0.3 : 1.5,
        })
        expect(placed).not.toHaveProperty("ccw_rotation")
      } else {
        expect(placed).toMatchObject({
          shape: "rotated_rect",
          width: 0.3,
          height: 1.5,
        })
        if (placed.shape !== "rotated_rect")
          throw new Error("Expected rotation")
        expect(placed.ccw_rotation).toBeCloseTo(angle, 7)
      }
    }
  })
}
