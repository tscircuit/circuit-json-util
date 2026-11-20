import { beforeAll, expect, test } from "bun:test"
import {
  any_circuit_element,
  pcb_board,
  pcb_note_text,
  type PcbComponent,
  type PcbSolderPastePill,
  type PcbSolderPasteRotatedPill,
} from "circuit-json"
import { convertCircuitJsonToPcbSvg } from "circuit-to-svg"
import {
  applyToPoint,
  compose,
  flipY,
  inverse,
  rotateDEG,
  translate,
} from "transformation-matrix"
import { transformPCBElement, transformPCBElements } from "../index"
import usb1046 from "./assets/usb1046.circuit.json"

// Actual USB1046 PCB output from Core d50bdc6dd and converter 0.0.153, using
// KiCad's USB_A_Receptacle_GCT_USB1046.kicad_mod at f10d74936d.
const footprint = any_circuit_element.array().parse(usb1046)
const sourcePaste = footprint.filter(
  (element): element is PcbSolderPasteRotatedPill =>
    element.type === "pcb_solder_paste" && element.shape === "rotated_pill",
)
const component = footprint.find(
  (element): element is PcbComponent => element.type === "pcb_component",
)!
const placement = compose(
  translate(component.center.x, component.center.y),
  rotateDEG(component.rotation ?? 0),
)
const toLocal = inverse(placement)
const extracted = transformPCBElements(structuredClone(footprint), toLocal)

beforeAll(() => {
  expect(sourcePaste).toHaveLength(6)
  for (const paste of sourcePaste) expect(paste.ccw_rotation).toBeCloseTo(37, 7)
  const board = pcb_board.parse({
    type: "pcb_board",
    pcb_board_id: "board",
    center: { x: 0, y: 3 },
    width: 30,
    height: 28,
  })
  const note = pcb_note_text.parse({
    type: "pcb_note_text",
    pcb_note_text_id: "stencil-alignment",
    text: "USB1046 cache extraction: paste must align with the contacts",
    anchor_position: { x: 0, y: 15 },
    anchor_alignment: "center",
    font_size: 0.65,
    color: "#ffffff",
  })
  expect(
    convertCircuitJsonToPcbSvg([...extracted, board, note], {
      width: 1000,
      height: 900,
      showSolderPaste: true,
      showPcbNotes: true,
    }),
  ).toMatchSvgSnapshot(import.meta.path)
})

test.failing("USB1046 paste follows cached footprint placement", () => {
  const localPaste = extracted.filter(
    (element): element is PcbSolderPastePill =>
      element.type === "pcb_solder_paste" && element.shape === "pill",
  )
  expect(localPaste).toHaveLength(6)
  const restored = transformPCBElements(
    structuredClone(extracted),
    placement,
  ).filter(
    (element): element is PcbSolderPasteRotatedPill =>
      element.type === "pcb_solder_paste" && element.shape === "rotated_pill",
  )
  const quarterTurn = transformPCBElements(
    structuredClone(extracted),
    rotateDEG(90),
  ).filter(
    (element): element is PcbSolderPastePill =>
      element.type === "pcb_solder_paste" && element.shape === "pill",
  )
  for (const source of sourcePaste) {
    const local = localPaste.find(
      (paste) => paste.pcb_solder_paste_id === source.pcb_solder_paste_id,
    )!
    const center = applyToPoint(toLocal, source)
    expect(local).toMatchObject({
      width: source.width,
      height: source.height,
      radius: source.radius,
      layer: source.layer,
    })
    expect(local.pcb_smtpad_id).toBe(source.pcb_smtpad_id)
    expect(local.x).toBeCloseTo(center.x, 7)
    expect(local.y).toBeCloseTo(center.y, 7)
    expect(local).not.toHaveProperty("ccw_rotation")
    const replaced = restored.find(
      (paste) => paste.pcb_solder_paste_id === source.pcb_solder_paste_id,
    )!
    expect(replaced).toMatchObject({
      width: source.width,
      height: source.height,
      radius: source.radius,
    })
    expect(replaced.ccw_rotation).toBeCloseTo(37, 7)
    expect(replaced.x).toBeCloseTo(source.x, 7)
    expect(replaced.y).toBeCloseTo(source.y, 7)
    expect(
      quarterTurn.find(
        (paste) => paste.pcb_solder_paste_id === source.pcb_solder_paste_id,
      ),
    ).toMatchObject({ width: source.height, height: source.width })
    const mirrored = transformPCBElement(structuredClone(source), flipY())
    if (
      mirrored.type !== "pcb_solder_paste" ||
      mirrored.shape !== "rotated_pill"
    ) {
      throw new Error("Expected a rotated pill after reflection")
    }
    expect(((mirrored.ccw_rotation % 180) + 180) % 180).toBeCloseTo(143, 7)
    expect(mirrored.x).toBeCloseTo(-source.x, 7)
    expect(mirrored.y).toBeCloseTo(source.y, 7)
  }
})
