import { expect, test } from "bun:test"
import {
  type AnyCircuitElement,
  pcb_board,
  pcb_note_text,
  pcb_plated_hole,
  pcb_silkscreen_path,
} from "circuit-json"
import { convertCircuitJsonToPcbSvg } from "circuit-to-svg"
import { compose, rotateDEG, translate } from "transformation-matrix"
import { transformPCBElements } from "../index"

type Point = { x: number; y: number }
type Pad = {
  pin: string
  center: Point
  padWidth: number
  padHeight: number
  slotWidth: number
  slotHeight: number
  cornerRadius?: number
}

// Pads and silkscreen of KiCad's Connector_BarrelJack:BarrelJack_Horizontal,
// with Y flipped to circuit-json's Y-up. Every pad is a rect pad around a
// milled slot, so the direction of each slot matters to the connector's blades.
const pads: Pad[] = [
  {
    pin: "1",
    center: { x: 0, y: 0 },
    padWidth: 3.5,
    padHeight: 3.5,
    slotWidth: 1,
    slotHeight: 3,
  },
  {
    pin: "2",
    center: { x: -6, y: 0 },
    padWidth: 3,
    padHeight: 3.5,
    slotWidth: 1,
    slotHeight: 3,
    cornerRadius: 0.75,
  },
  {
    pin: "3",
    center: { x: -3, y: -4.7 },
    padWidth: 3.5,
    padHeight: 3.5,
    slotWidth: 3,
    slotHeight: 1,
    cornerRadius: 0.875,
  },
]
const silkscreen: Point[][] = [
  [
    { x: -5, y: -4.6 },
    { x: -13.8, y: -4.6 },
    { x: -13.8, y: 4.6 },
    { x: 0.9, y: 4.6 },
    { x: 0.9, y: 2 },
  ],
  [
    { x: 0.9, y: -1.9 },
    { x: 0.9, y: -4.6 },
    { x: -1, y: -4.6 },
  ],
  [
    { x: 0.05, y: 4.8 },
    { x: 1.1, y: 4.8 },
    { x: 1.1, y: 3.75 },
  ],
]

const quarterTurn = ({ x, y }: Point): Point => ({ x: -y, y: x })

/** The footprint as circuit json. `turned` writes the 90 degree CCW result by
 * hand: points go through quarterTurn and every width swaps with its height. */
const createFootprint = (id: string, turned: boolean): AnyCircuitElement[] => [
  ...pads.map((pad) => {
    const center = turned ? quarterTurn(pad.center) : pad.center
    return pcb_plated_hole.parse({
      type: "pcb_plated_hole",
      pcb_plated_hole_id: `${id}_pin${pad.pin}`,
      shape: "pill_hole_with_rect_pad",
      hole_shape: "pill",
      pad_shape: "rect",
      x: center.x,
      y: center.y,
      hole_width: turned ? pad.slotHeight : pad.slotWidth,
      hole_height: turned ? pad.slotWidth : pad.slotHeight,
      rect_pad_width: turned ? pad.padHeight : pad.padWidth,
      rect_pad_height: turned ? pad.padWidth : pad.padHeight,
      rect_border_radius: pad.cornerRadius,
      layers: ["top", "bottom"],
    })
  }),
  ...silkscreen.map((route, index) =>
    pcb_silkscreen_path.parse({
      type: "pcb_silkscreen_path",
      pcb_silkscreen_path_id: `${id}_silkscreen${index}`,
      pcb_component_id: id,
      layer: "top",
      route: turned ? route.map(quarterTurn) : route,
      stroke_width: 0.12,
    }),
  ),
]

const moveBy = (elements: AnyCircuitElement[], x: number, y: number) =>
  transformPCBElements(elements, translate(x, y))

test("barrel jack turned 90 degrees: input, expected and actual", () => {
  const note = (text: string, x: number, y: number, fontSize = 1) =>
    pcb_note_text.parse({
      type: "pcb_note_text",
      pcb_note_text_id: text,
      text,
      anchor_position: { x, y },
      anchor_alignment: "center",
      font_size: fontSize,
      color: "#f8fafc",
    })

  // The placement a packer applies when it turns a component: rotate the
  // footprint about its origin, then move it into place.
  const actual = transformPCBElements(
    createFootprint("actual", false),
    compose(translate(22, 6.5), rotateDEG(90)),
  )

  const circuitJson: AnyCircuitElement[] = [
    pcb_board.parse({
      type: "pcb_board",
      pcb_board_id: "board",
      width: 62,
      height: 30,
      center: { x: 0, y: 0 },
    }),
    note("BARREL JACK TURNED 90 DEGREES CCW", 0, 12.5, 1.3),
    note("INPUT", -19.5, 9.8),
    note("EXPECTED", 4, 9.8),
    note("ACTUAL", 22, 9.8),
    ...moveBy(createFootprint("input", false), -13, 0),
    ...moveBy(createFootprint("expected", true), 4, 6.5),
    ...actual,
    note(
      "Each slot should turn with its pad and with the silkscreen outline",
      0,
      -12.5,
      0.9,
    ),
  ]

  expect(
    convertCircuitJsonToPcbSvg(circuitJson, {
      width: 1240,
      height: 600,
      showPcbNotes: true,
      backgroundColor: "#0f172a",
    }),
  ).toMatchSvgSnapshot(import.meta.path)
})
