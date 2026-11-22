import { expect, test } from "bun:test"
import {
  type AnyCircuitElement,
  pcb_board,
  pcb_hole,
  pcb_note_text,
  pcb_plated_hole,
} from "circuit-json"
import { convertCircuitJsonToPcbSvg } from "circuit-to-svg"
import { rotateDEG } from "transformation-matrix"
import { transformPCBElements } from "../index"

const platedHole = (props: Record<string, unknown>) =>
  pcb_plated_hole.parse({
    type: "pcb_plated_hole",
    pcb_plated_hole_id: "hole",
    x: 0,
    y: 0,
    layers: ["top", "bottom"],
    ...props,
  })

const hole = (props: Record<string, unknown>) =>
  pcb_hole.parse({
    type: "pcb_hole",
    pcb_hole_id: "hole",
    x: 0,
    y: 0,
    ...props,
  })

// Each row is a hole at the origin and the same hole after a 90 degree CCW
// turn. The expected hole is written out by hand: quarter turns swap width and
// height, and the two tilted rows add 90 to their angle. Only the ACTUAL column
// goes through transformPCBElements.
const rows: Array<{
  label: string
  input: AnyCircuitElement
  expected: AnyCircuitElement
}> = [
  {
    label: "pill plated hole (control)",
    input: platedHole({
      shape: "pill",
      outer_width: 1.4,
      outer_height: 2.8,
      hole_width: 0.6,
      hole_height: 1.8,
      ccw_rotation: 0,
    }),
    expected: platedHole({
      shape: "pill",
      outer_width: 2.8,
      outer_height: 1.4,
      hole_width: 1.8,
      hole_height: 0.6,
      ccw_rotation: 0,
    }),
  },
  {
    label: "circular hole, rect pad",
    input: platedHole({
      shape: "circular_hole_with_rect_pad",
      hole_shape: "circle",
      pad_shape: "rect",
      hole_diameter: 0.7,
      rect_pad_width: 1.4,
      rect_pad_height: 2.8,
    }),
    expected: platedHole({
      shape: "circular_hole_with_rect_pad",
      hole_shape: "circle",
      pad_shape: "rect",
      hole_diameter: 0.7,
      rect_pad_width: 2.8,
      rect_pad_height: 1.4,
    }),
  },
  {
    label: "circular hole, rect pad, offset drill",
    input: platedHole({
      shape: "circular_hole_with_rect_pad",
      hole_shape: "circle",
      pad_shape: "rect",
      hole_diameter: 0.7,
      rect_pad_width: 1.4,
      rect_pad_height: 2.8,
      hole_offset_x: 0,
      hole_offset_y: 0.8,
    }),
    expected: platedHole({
      shape: "circular_hole_with_rect_pad",
      hole_shape: "circle",
      pad_shape: "rect",
      hole_diameter: 0.7,
      rect_pad_width: 2.8,
      rect_pad_height: 1.4,
      hole_offset_x: -0.8,
      hole_offset_y: 0,
    }),
  },
  {
    label: "pill hole, rect pad",
    input: platedHole({
      shape: "pill_hole_with_rect_pad",
      hole_shape: "pill",
      pad_shape: "rect",
      hole_width: 0.6,
      hole_height: 1.8,
      rect_pad_width: 1.4,
      rect_pad_height: 2.8,
    }),
    expected: platedHole({
      shape: "pill_hole_with_rect_pad",
      hole_shape: "pill",
      pad_shape: "rect",
      hole_width: 1.8,
      hole_height: 0.6,
      rect_pad_width: 2.8,
      rect_pad_height: 1.4,
    }),
  },
  {
    label: "pill hole, rect pad, tilted 30",
    input: platedHole({
      shape: "rotated_pill_hole_with_rect_pad",
      hole_shape: "rotated_pill",
      pad_shape: "rect",
      hole_width: 0.6,
      hole_height: 1.8,
      hole_ccw_rotation: 30,
      rect_pad_width: 1.4,
      rect_pad_height: 2.8,
      rect_ccw_rotation: 30,
    }),
    expected: platedHole({
      shape: "rotated_pill_hole_with_rect_pad",
      hole_shape: "rotated_pill",
      pad_shape: "rect",
      hole_width: 0.6,
      hole_height: 1.8,
      hole_ccw_rotation: 120,
      rect_pad_width: 1.4,
      rect_pad_height: 2.8,
      rect_ccw_rotation: 120,
    }),
  },
  {
    label: "unplated slot",
    input: hole({ hole_shape: "pill", hole_width: 0.9, hole_height: 2.6 }),
    expected: hole({ hole_shape: "pill", hole_width: 2.6, hole_height: 0.9 }),
  },
  {
    label: "unplated slot, tilted 30",
    input: hole({
      hole_shape: "rotated_pill",
      hole_width: 0.9,
      hole_height: 2.6,
      ccw_rotation: 30,
    }),
    expected: hole({
      hole_shape: "rotated_pill",
      hole_width: 0.9,
      hole_height: 2.6,
      ccw_rotation: 120,
    }),
  },
]

const columns = { input: 2, expected: 9, actual: 16 }
const rowPitch = 4.2
const rowY = (index: number) => ((rows.length - 1) / 2 - index) * rowPitch

const placeAt = (elm: AnyCircuitElement, x: number, y: number, id: string) => ({
  ...elm,
  x,
  y,
  ...(elm.type === "pcb_hole"
    ? { pcb_hole_id: id }
    : { pcb_plated_hole_id: id }),
})

test("holes turned 90 degrees: input, expected and actual", () => {
  const note = (text: string, x: number, y: number, fontSize = 0.7) =>
    pcb_note_text.parse({
      type: "pcb_note_text",
      pcb_note_text_id: text,
      text,
      anchor_position: { x, y },
      anchor_alignment: "center",
      font_size: fontSize,
      color: "#f8fafc",
    })

  const top = rowY(0)
  const circuitJson: AnyCircuitElement[] = [
    pcb_board.parse({
      type: "pcb_board",
      pcb_board_id: "board",
      width: 42,
      height: rows.length * rowPitch + 8,
      center: { x: 0, y: 1 },
    }),
    note("HOLES TURNED 90 DEGREES CCW", 0, top + 5.4, 1),
    note("INPUT", columns.input, top + 3),
    note("EXPECTED", columns.expected, top + 3),
    note("ACTUAL", columns.actual, top + 3),
  ]

  rows.forEach(({ label, input, expected }, index) => {
    const y = rowY(index)
    const [actual] = transformPCBElements(
      [structuredClone(input)],
      rotateDEG(90),
    )
    circuitJson.push(
      note(label, -11, y, 0.6),
      placeAt(input, columns.input, y, `input${index}`) as AnyCircuitElement,
      placeAt(
        expected,
        columns.expected,
        y,
        `expected${index}`,
      ) as AnyCircuitElement,
      placeAt(
        actual!,
        columns.actual,
        y,
        `actual${index}`,
      ) as AnyCircuitElement,
    )
  })

  expect(
    convertCircuitJsonToPcbSvg(circuitJson, {
      width: 1200,
      height: 1080,
      showPcbNotes: true,
      backgroundColor: "#0f172a",
    }),
  ).toMatchSvgSnapshot(import.meta.path)
})
