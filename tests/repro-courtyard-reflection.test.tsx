import { expect, test } from "bun:test"
import type {
  PcbCourtyardRect,
  PcbSilkscreenText,
  PcbSmtPadRotatedPill,
  PcbSmtPadRotatedRect,
} from "circuit-json"
import { convertCircuitJsonToPcbSvg } from "circuit-to-svg"
import {
  applyToPoint,
  compose,
  identity,
  rotateDEG,
  scale,
  translate,
} from "transformation-matrix"
import { Circuit } from "tscircuit"
import { transformPCBElements } from "../index"

const getResistorCircuitJson = async () => {
  const circuit = new Circuit()
  circuit.add(
    <board width={8} height={10} routingDisabled>
      <resistor
        name="R1"
        resistance="10k"
        footprint="0603"
        pcbX={2}
        pcbY={3}
        pcbRotation={30}
      />
    </board>,
  )
  await circuit.renderUntilSettled()
  return circuit.getCircuitJson()
}

const mirrors = [scale(-1, 1), scale(1, -1)]
const rotation = rotateDEG(41)
const placements = [
  identity(),
  translate(5, -2),
  rotateDEG(90),
  rotateDEG(-41),
  ...mirrors,
  ...mirrors.flatMap((mirror) => [
    compose(rotation, mirror),
    compose(mirror, rotation),
  ]),
]

type Rectangle = PcbCourtyardRect | PcbSmtPadRotatedRect | PcbSmtPadRotatedPill

const getCorners = (rect: Rectangle) => {
  const center = "center" in rect ? rect.center : { x: rect.x, y: rect.y }
  const placement = compose(
    translate(center.x, center.y),
    rotateDEG(rect.ccw_rotation ?? 0),
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

const expectRectanglesToFollowPlacements = (rectangles: Rectangle[]) => {
  for (const matrix of placements) {
    for (const original of rectangles) {
      const transformed = structuredClone(original)
      transformPCBElements([transformed], matrix)
      const corners = getCorners(transformed)
      for (const corner of getCorners(original)) {
        const expected = applyToPoint(matrix, corner)
        expect(
          Math.min(
            ...corners.map((point) =>
              Math.hypot(point.x - expected.x, point.y - expected.y),
            ),
          ),
        ).toBeLessThan(1e-8)
      }
      expect(transformed.width).toBe(original.width)
      expect(transformed.height).toBe(original.height)
      expect(transformed.layer).toBe(original.layer)
      expect(transformed.pcb_component_id).toBe(original.pcb_component_id)
    }
  }
}

const getTextBaseline = (text: PcbSilkscreenText) => {
  const angle = ((text.ccw_rotation ?? 0) * Math.PI) / 180
  const direction = text.is_mirrored ? -1 : 1
  return [
    text.anchor_position,
    {
      x: text.anchor_position.x + direction * Math.cos(angle),
      y: text.anchor_position.y + direction * Math.sin(angle),
    },
  ]
}

test("mirroring a tilted 0603 resistor", async () => {
  const circuitJson = await getResistorCircuitJson()
  transformPCBElements(circuitJson, scale(1, -1))
  await expect(
    convertCircuitJsonToPcbSvg(circuitJson, { showCourtyards: true }),
  ).toMatchSvgSnapshot(import.meta.path)
})

test.failing("courtyard follows rotated and mirrored placements", async () => {
  const circuitJson = await getResistorCircuitJson()
  const courtyard = circuitJson.find(
    (element) => element.type === "pcb_courtyard_rect",
  )!
  expectRectanglesToFollowPlacements([courtyard])
})

test.failing("SMT pads follow rotations and reflections", async () => {
  const circuitJson = await getResistorCircuitJson()
  const pads = circuitJson.filter(
    (element) =>
      element.type === "pcb_smtpad" && element.shape === "rotated_rect",
  )
  expect(pads).toHaveLength(2)
  expectRectanglesToFollowPlacements([
    ...pads,
    ...pads.map((pad) => ({
      ...pad,
      shape: "rotated_pill" as const,
      radius: Math.min(pad.width, pad.height) / 2,
    })),
  ])
})

test.failing("R1 follows placement without reversing text", async () => {
  const circuitJson = await getResistorCircuitJson()
  const label = circuitJson.find(
    (element): element is PcbSilkscreenText =>
      element.type === "pcb_silkscreen_text" && element.text === "R1",
  )!
  for (const matrix of placements) {
    for (const original of [
      label,
      { ...label, is_mirrored: true },
      { ...label, ccw_rotation: undefined },
    ]) {
      const transformed = structuredClone(original)
      transformPCBElements([transformed], matrix)
      const points = getTextBaseline(transformed)
      getTextBaseline(original).forEach((point, index) => {
        const expected = applyToPoint(matrix, point)
        expect(points[index]!.x).toBeCloseTo(expected.x, 8)
        expect(points[index]!.y).toBeCloseTo(expected.y, 8)
      })
      expect(transformed.text).toBe(original.text)
      expect(transformed.font_size).toBe(original.font_size)
      expect(transformed.anchor_alignment).toBe(original.anchor_alignment)
      expect(transformed.is_mirrored).toBe(original.is_mirrored)
      expect(transformed.layer).toBe(original.layer)
      expect(transformed.pcb_component_id).toBe(original.pcb_component_id)
    }
  }
})
