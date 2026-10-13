import { expect, test } from "bun:test"
import {
  pcb_board,
  pcb_note_text,
  type PcbSolderPasteRotatedRect,
} from "circuit-json"
import { convertCircuitJsonToPcbSvg } from "circuit-to-svg"
import { rotateDEG } from "transformation-matrix"
import { transformPCBElements } from "../index"

const createAperture = (): PcbSolderPasteRotatedRect => ({
  type: "pcb_solder_paste",
  pcb_solder_paste_id: "paste1",
  shape: "rotated_rect",
  layer: "top",
  x: 0,
  y: 0,
  width: 4,
  height: 2,
  ccw_rotation: 37,
})

const extractLocalAperture = () => {
  const [localAperture] = transformPCBElements(
    [createAperture()],
    rotateDEG(-37),
  )
  if (
    localAperture?.type !== "pcb_solder_paste" ||
    (localAperture.shape !== "rect" && localAperture.shape !== "rotated_rect")
  ) {
    throw new Error("Expected a rectangular paste aperture")
  }
  return localAperture
}

test("solder-paste rotation: input, expected and actual", () => {
  const actual = extractLocalAperture()
  const actualRotation =
    actual.shape === "rotated_rect" ? actual.ccw_rotation : 0
  expect(actual).toMatchObject({ x: 0, y: 0, width: 4, height: 2 })
  expect(actualRotation).toBeCloseTo(0, 7)

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

  // Only the actual result uses the transformer. The expected aperture is
  // independently defined, and the notes stay outside the transformed geometry.
  const circuitJson = [
    pcb_board.parse({
      type: "pcb_board",
      pcb_board_id: "board",
      width: 28,
      height: 15,
      center: { x: 0, y: 0 },
    }),
    { ...createAperture(), pcb_solder_paste_id: "input", x: -9 },
    {
      ...createAperture(),
      pcb_solder_paste_id: "expected",
      ccw_rotation: 0,
    },
    { ...actual, pcb_solder_paste_id: "actual", x: 9 },
    note("SOLDER-PASTE ROTATION", 0, 6, 1),
    note(
      "Apply -37 degrees: the tilted window should become horizontal",
      0,
      4.5,
      0.6,
    ),
    note("INPUT", -9, 2.8),
    note("EXPECTED", 0, 2.8),
    note("ACTUAL", 9, 2.8),
    note("37 degrees", -9, -2.8),
    note("0 degrees", 0, -2.8),
    note(`${Math.round(actualRotation * 100) / 100} degrees`, 9, -2.8),
    note("Expected and actual must match: 4 x 2 mm, at 0 degrees", 0, -5, 0.6),
  ]
  expect(
    convertCircuitJsonToPcbSvg(circuitJson, {
      width: 1200,
      height: 650,
      showSolderPaste: true,
      showPcbNotes: true,
      backgroundColor: "#0f172a",
    }),
  ).toMatchSvgSnapshot(import.meta.path)
})
