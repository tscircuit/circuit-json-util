import { beforeAll, expect, test } from "bun:test"
import {
  any_circuit_element,
  pcb_board,
  pcb_note_text,
  type PcbSolderPastePill,
  type PcbSolderPasteRotatedPill,
} from "circuit-json"
import { convertCircuitJsonToPcbSvg } from "circuit-to-svg"
import { flipY, rotateDEG } from "transformation-matrix"
import { transformPCBElement, transformPCBElements } from "../index"
import usb1046 from "./assets/usb1046.circuit.json"

// Complete USB1046 output from kicad-to-circuit-json@0.0.153, using KiCad's
// Connector_USB.pretty/USB_A_Receptacle_GCT_USB1046.kicad_mod at f10d74936d.
const footprint = any_circuit_element.array().parse(usb1046)
const sourcePaste = footprint.filter(
  (element): element is PcbSolderPastePill =>
    element.type === "pcb_solder_paste" && element.shape === "pill",
)
const placed = transformPCBElements(structuredClone(footprint), rotateDEG(37))

beforeAll(() => {
  expect(sourcePaste).toHaveLength(6)
  const board = pcb_board.parse({
    type: "pcb_board",
    pcb_board_id: "board",
    center: { x: -2, y: 3 },
    width: 30,
    height: 28,
  })
  const note = pcb_note_text.parse({
    type: "pcb_note_text",
    pcb_note_text_id: "stencil-alignment",
    text: "USB1046 at 37 deg: paste must follow the contacts and tabs",
    anchor_position: { x: -2, y: 15 },
    anchor_alignment: "center",
    font_size: 0.65,
    color: "#ffffff",
  })
  expect(
    convertCircuitJsonToPcbSvg([...placed, board, note], {
      width: 1000,
      height: 900,
      showSolderPaste: true,
      showPcbNotes: true,
    }),
  ).toMatchSvgSnapshot(import.meta.path)
})

test.failing(
  "USB1046 pill paste follows placement and returns to footprint-local geometry",
  () => {
    const rotatedPaste = placed.filter(
      (element): element is PcbSolderPasteRotatedPill =>
        element.type === "pcb_solder_paste" && element.shape === "rotated_pill",
    )
    expect(rotatedPaste).toHaveLength(6)

    const recovered = transformPCBElements(
      structuredClone(placed),
      rotateDEG(-37),
    ).filter(
      (element): element is PcbSolderPastePill =>
        element.type === "pcb_solder_paste" && element.shape === "pill",
    )
    expect(recovered).toHaveLength(6)
    const quarterTurn = transformPCBElements(
      structuredClone(footprint),
      rotateDEG(90),
    ).filter(
      (element): element is PcbSolderPastePill =>
        element.type === "pcb_solder_paste" && element.shape === "pill",
    )

    for (const source of sourcePaste) {
      const rotated = rotatedPaste.find(
        (paste) => paste.pcb_solder_paste_id === source.pcb_solder_paste_id,
      )!
      expect(rotated).toMatchObject({
        width: source.width,
        height: source.height,
        radius: source.radius,
        layer: source.layer,
        pcb_smtpad_id: source.pcb_smtpad_id,
      })
      expect(rotated.ccw_rotation).toBeCloseTo(37, 7)
      const local = recovered.find(
        (paste) => paste.pcb_solder_paste_id === source.pcb_solder_paste_id,
      )!
      expect(local).toMatchObject({
        shape: "pill",
        width: source.width,
        height: source.height,
        radius: source.radius,
      })
      expect(local.x).toBeCloseTo(source.x, 7)
      expect(local.y).toBeCloseTo(source.y, 7)
      expect(local).not.toHaveProperty("ccw_rotation")
      expect(
        quarterTurn.find(
          (paste) => paste.pcb_solder_paste_id === source.pcb_solder_paste_id,
        ),
      ).toMatchObject({ width: source.height, height: source.width })
      const mirrored = transformPCBElement(structuredClone(rotated), flipY())
      if (
        mirrored.type !== "pcb_solder_paste" ||
        mirrored.shape !== "rotated_pill"
      ) {
        throw new Error("Expected a rotated pill after reflection")
      }
      expect(((mirrored.ccw_rotation % 180) + 180) % 180).toBeCloseTo(143, 7)
      expect(mirrored.x).toBeCloseTo(-rotated.x, 7)
      expect(mirrored.y).toBeCloseTo(rotated.y, 7)
    }
  },
)
