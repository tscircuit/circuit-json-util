import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { rotateDEG } from "transformation-matrix"
import { Circuit } from "tscircuit"
import { transformPCBElements } from "../index"

// Covers the shapes the pinned tscircuit devDependency rotates. That core
// predates ccw_rotation on polygon pads and rotated_pill for pcb_hole and paste,
// so tests/transform-hole-rotation.test.ts asserts those fields directly.
const renderHoles = async (pcbRotation: number) => {
  const circuit = new Circuit()
  circuit.add(
    <board width={40} height={40} routingDisabled>
      <chip
        name="U1"
        pcbRotation={pcbRotation}
        footprint={
          <footprint>
            <platedhole
              portHints={["pin1"]}
              pcbX={-6}
              pcbY={0}
              shape="pill"
              holeWidth={0.8}
              holeHeight={1.5}
              outerWidth={1.2}
              outerHeight={2}
            />
            <platedhole
              portHints={["pin2"]}
              pcbX={-3}
              pcbY={0}
              shape="oval"
              holeWidth={0.8}
              holeHeight={1.5}
              outerWidth={1.2}
              outerHeight={2}
            />
            <platedhole
              portHints={["pin3"]}
              pcbX={0}
              pcbY={0}
              shape="circular_hole_with_rect_pad"
              holeDiameter={0.5}
              rectPadWidth={1}
              rectPadHeight={2}
            />
            <platedhole
              portHints={["pin4"]}
              pcbX={3}
              pcbY={0}
              shape="pill_hole_with_rect_pad"
              holeShape="pill"
              padShape="rect"
              holeWidth={0.5}
              holeHeight={1}
              rectPadWidth={1}
              rectPadHeight={2}
            />
          </footprint>
        }
      />
    </board>,
  )
  await circuit.renderUntilSettled()
  return circuit
    .getCircuitJson()
    .filter((elm) => elm.type === "pcb_plated_hole")
}

const getOrientation = (elm: AnyCircuitElement) => {
  const hole = elm as any
  return {
    shape: hole.shape,
    hole_shape: hole.hole_shape,
    outer_width: hole.outer_width,
    outer_height: hole.outer_height,
    rect_pad_width: hole.rect_pad_width,
    rect_pad_height: hole.rect_pad_height,
  }
}

const rotationFields = [
  "ccw_rotation",
  "rect_ccw_rotation",
  "hole_ccw_rotation",
] as const

test("transformed holes match what core emits for an explicit pcbRotation", async () => {
  const unrotated = await renderHoles(0)
  expect(unrotated.length).toBe(4)

  for (const pcbRotation of [90, 180, 270, 45]) {
    const explicit = await renderHoles(pcbRotation)
    const transformed = transformPCBElements(
      structuredClone(unrotated),
      rotateDEG(pcbRotation),
    )

    expect(transformed.length).toBe(explicit.length)
    for (const [index, elm] of transformed.entries()) {
      const actual = elm as any
      const expected = explicit[index] as any

      expect(getOrientation(actual)).toEqual(getOrientation(expected))
      expect(actual.x).toBeCloseTo(expected.x, 6)
      expect(actual.y).toBeCloseTo(expected.y, 6)
      for (const field of rotationFields) {
        if (expected[field] === undefined) {
          expect(actual[field]).toBeUndefined()
        } else {
          expect(actual[field]).toBeCloseTo(expected[field], 6)
        }
      }
    }
  }
})
