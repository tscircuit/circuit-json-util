import { expect, test } from "bun:test"
import {
  pcb_copper_text,
  pcb_fabrication_note_text,
  pcb_note_text,
  pcb_silkscreen_text,
} from "circuit-json"
import { compose, rotateDEG, scale, translate } from "transformation-matrix"
import { transformPCBElements } from "../lib/transform-soup-elements"

const textSchemas = [
  pcb_silkscreen_text,
  pcb_fabrication_note_text,
  pcb_copper_text,
]

const createTexts = (ccw_rotation?: number) =>
  textSchemas.map((schema) =>
    schema.parse({
      type: schema.shape.type.value,
      pcb_component_id: "pc1",
      text: "R1",
      anchor_position: { x: 1, y: 0 },
      anchor_alignment: "top_left",
      font_size: 1,
      layer: "top",
      ccw_rotation,
    }),
  )

for (const original of createTexts(30)) {
  test(`rotates ${original.type} with its anchor, preserving its initial angle`, () => {
    const text = structuredClone(original)

    transformPCBElements([text], compose(translate(10, 20), rotateDEG(90)))

    expect(text.anchor_position?.x).toBeCloseTo(10)
    expect(text.anchor_position?.y).toBeCloseTo(21)
    expect(text.ccw_rotation).toBeCloseTo(120)
    expect(text.anchor_alignment).toBe("top_left")
    expect(text.font_size).toBe(1)
    expect(text.text).toBe("R1")

    // A second rotation must accumulate on the text's new orientation.
    transformPCBElements([text], rotateDEG(-60))
    expect(text.ccw_rotation).toBeCloseTo(60)
  })
}

for (const original of createTexts()) {
  test(`rotates ${original.type} when ccw_rotation is omitted`, () => {
    const text = structuredClone(original)

    transformPCBElements([text], rotateDEG(-45))

    expect(text.anchor_position?.x).toBeCloseTo(Math.SQRT1_2)
    expect(text.anchor_position?.y).toBeCloseTo(-Math.SQRT1_2)
    expect(text.ccw_rotation).toBeCloseTo(-45)
  })
}

test("translating PCB text preserves its orientation and content", () => {
  const texts = createTexts(350)

  transformPCBElements(texts, translate(3, 4))

  for (const text of texts) {
    expect(text.anchor_position).toEqual({ x: 4, y: 4 })
    expect(text.ccw_rotation).toBe(350)
    expect(text.anchor_alignment).toBe("top_left")
    expect(text.text).toBe("R1")
  }

  transformPCBElements(texts, rotateDEG(45))
  for (const text of texts) {
    expect(text.ccw_rotation).toBeCloseTo(35)
  }
})

test("PCB note text transforms without adding an unsupported rotation field", () => {
  const text = pcb_note_text.parse({
    type: "pcb_note_text",
    text: "Note",
    anchor_position: { x: 1, y: 0 },
    anchor_alignment: "center",
    font_size: 1,
    layer: "top",
  })

  transformPCBElements([text], rotateDEG(90))

  expect(text.anchor_position.x).toBeCloseTo(0)
  expect(text.anchor_position.y).toBeCloseTo(1)
  expect("ccw_rotation" in text).toBe(false)
})

test("reflections retain the existing PCB text orientation behavior", () => {
  const texts = createTexts(30)

  transformPCBElements(texts, scale(-1, 1))

  for (const text of texts) {
    expect(text.anchor_position).toEqual({ x: -1, y: 0 })
    expect(text.ccw_rotation).toBe(30)
  }
})
