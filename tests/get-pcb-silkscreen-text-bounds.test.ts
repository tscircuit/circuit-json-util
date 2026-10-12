import { expect, test } from "bun:test"
import { type PcbSilkscreenText, any_circuit_element } from "circuit-json"
import {
  applyToPoint,
  compose,
  rotate,
  scale,
  translate,
} from "transformation-matrix"
import {
  type PcbBounds,
  getPcbElementBounds,
  getPcbElementsWithinBounds,
} from "../lib/get-bounds-of-pcb-elements"
import fontReference from "./fixtures/tscircuit-alphabet-0.0.27.json"

const glyphs: Record<
  string,
  { advance: number; path: string; bounds: PcbBounds }
> = fontReference.glyphs

const getGlyph = (char: string) => {
  const glyph = glyphs[char]
  if (!glyph) throw new Error(`Missing reference glyph: ${char}`)
  return glyph
}

const createText = (overrides: Partial<PcbSilkscreenText> = {}) =>
  any_circuit_element.parse({
    type: "pcb_silkscreen_text",
    pcb_silkscreen_text_id: "text1",
    pcb_component_id: "component1",
    anchor_position: { x: 2, y: -3 },
    anchor_alignment: "center",
    font: "tscircuit2024",
    font_size: 1,
    layer: "top",
    text: "HELLO",
    ...overrides,
  }) as PcbSilkscreenText

const getReferenceLayout = (element: PcbSilkscreenText) => {
  const fontSize = element.font_size
  const alignment = element.anchor_alignment
  const firstBaseline = alignment.startsWith("top_")
    ? fontReference.ascender * fontSize
    : alignment.startsWith("bottom_")
      ? fontReference.descender * fontSize
      : ((fontReference.ascender + fontReference.descender) * fontSize) / 2
  const matrix = compose(
    translate(element.anchor_position.x, element.anchor_position.y),
    rotate(((element.ccw_rotation ?? 0) * Math.PI) / 180),
    scale(element.layer === "bottom" || element.is_mirrored ? -1 : 1, -1),
  )
  const paths: string[] = []
  const points: Array<[number, number]> = []
  for (const [index, line] of element.text.split("\n").entries()) {
    const width = Array.from(line).reduce(
      (sum, char) => sum + getGlyph(char).advance * fontSize,
      0,
    )
    let penX = alignment.endsWith("_left")
      ? 0
      : alignment.endsWith("_right")
        ? -width
        : -width / 2
    const baseline = firstBaseline + index * fontSize
    for (const char of line) {
      const glyph = getGlyph(char)
      const b = glyph.bounds
      for (const x of [b.minX, b.maxX]) {
        for (const y of [b.minY, b.maxY])
          points.push(
            applyToPoint(matrix, [
              penX + x * fontSize,
              baseline + y * fontSize,
            ]),
          )
      }
      paths.push(
        `<path d="${glyph.path}" transform="translate(${penX},${baseline}) scale(${fontSize})"/>`,
      )
      penX += glyph.advance * fontSize
    }
  }
  return { points, paths, matrix }
}

const expectInkInside = (element: PcbSilkscreenText) => {
  const bounds = getPcbElementBounds(element)
  if (!bounds) throw new Error("Missing text bounds")
  for (const [x, y] of getReferenceLayout(element).points) {
    expect(x).toBeGreaterThanOrEqual(bounds.minX - 1e-9)
    expect(x).toBeLessThanOrEqual(bounds.maxX + 1e-9)
    expect(y).toBeGreaterThanOrEqual(bounds.minY - 1e-9)
    expect(y).toBeLessThanOrEqual(bounds.maxY + 1e-9)
  }
}

test("selection at a visible word edge includes the text", () => {
  const text = createText({ anchor_position: { x: 0, y: 0 } })
  expect(
    getPcbElementsWithinBounds([text], {
      minX: -1.5,
      maxX: -1.4,
      minY: -0.1,
      maxY: 0.1,
    }),
  ).toEqual([text])
  expect(
    getPcbElementsWithinBounds([text], {
      minX: -8,
      maxX: -7,
      minY: -0.1,
      maxY: 0.1,
    }),
  ).toEqual([])
})

test("narrow i and l use their actual font advances", () => {
  const narrow = getPcbElementBounds(createText({ text: "ili" }))
  const wide = getPcbElementBounds(createText({ text: "HHH" }))
  if (!narrow || !wide) throw new Error("Missing text bounds")
  expect(narrow.maxX - narrow.minX).toBeCloseTo(1.2, 12)
  expect(wide.maxX - wide.minX).toBeCloseTo(2.076, 12)
})

const alignments = [
  "top_left",
  "top_center",
  "top_right",
  "center_left",
  "center",
  "center_right",
  "bottom_left",
  "bottom_center",
  "bottom_right",
] as const
for (const anchor_alignment of alignments)
  test(`font ink fits the physical frame for ${anchor_alignment}`, () =>
    expectInkInside(createText({ text: "R1gil", anchor_alignment })))

for (const layer of ["top", "bottom"] as const)
  for (const ccw_rotation of [0, 45, 90, 180, -30, -90])
    test(`font ink fits rotated ${layer} text at ${ccw_rotation}`, () =>
      expectInkInside(
        createText({ text: "R1gil", layer, ccw_rotation, font_size: 2 }),
      ))

test("explicit mirroring on top has the same bounds as bottom", () => {
  const options = {
    text: "R1gil",
    anchor_alignment: "top_left" as const,
    ccw_rotation: 45,
  }
  expect(
    getPcbElementBounds(createText({ ...options, is_mirrored: true })),
  ).toEqual(getPcbElementBounds(createText({ ...options, layer: "bottom" })))
})

test("all supported font glyphs fit the physical frame", () => {
  for (const text of Object.keys(glyphs)) expectInkInside(createText({ text }))
})

test("non-central bottom text contains the independently reflected ink", () => {
  expectInkInside(
    createText({
      text: "R1gil",
      layer: "bottom",
      anchor_alignment: "top_left",
      ccw_rotation: 45,
    }),
  )
})

test("non-central explicitly mirrored top text contains its ink", () => {
  expectInkInside(
    createText({
      text: "R1gil",
      is_mirrored: true,
      anchor_alignment: "top_left",
      ccw_rotation: 45,
    }),
  )
})

for (const anchor_position of [undefined, null, {}])
  test(`incomplete anchor keeps the existing null fallback: ${JSON.stringify(anchor_position)}`, () => {
    const element = {
      ...createText(),
      anchor_position,
    } as unknown as PcbSilkscreenText
    expect(getPcbElementBounds(element)).toBeNull()
  })

for (const ccw_rotation of [Number.NaN, Number.POSITIVE_INFINITY])
  test(`non-finite rotation keeps the anchor fallback: ${ccw_rotation}`, () => {
    expect(getPcbElementBounds({ ...createText(), ccw_rotation })).toEqual({
      minX: 2,
      maxX: 2,
      minY: -3,
      maxY: -3,
    })
  })

for (const text of [
  "",
  " A ",
  "A B",
  "HELLO\n\nR1",
  "\nR1",
  "R1\n",
  "R1\nA B",
  "R1\r\nili",
  "Ω",
  "HΩL",
])
  test(`unmeasured text keeps the anchor fallback: ${JSON.stringify(text)}`, () => {
    expect(getPcbElementBounds(createText({ text }))).toEqual({
      minX: 2,
      maxX: 2,
      minY: -3,
      maxY: -3,
    })
  })

test("knockout text keeps its existing fallback", () => {
  expect(getPcbElementBounds(createText({ is_knockout: true }))).toEqual({
    minX: 2,
    maxX: 2,
    minY: -3,
    maxY: -3,
  })
})

for (const text of [123, {}, false])
  test(`unsupported fonts keep the fallback for malformed text: ${JSON.stringify(text)}`, () => {
    const element = {
      ...createText(),
      font: "legacy",
      text,
    } as unknown as PcbSilkscreenText
    expect(getPcbElementBounds(element)).toEqual({
      minX: 2,
      maxX: 2,
      minY: -3,
      maxY: -3,
    })
  })

test("selection at the second line's ink includes the text", () => {
  const text = createText({
    text: "HELLO\nili",
    anchor_position: { x: 0, y: 0 },
  })
  expect(
    getPcbElementsWithinBounds([text], {
      minX: -0.5,
      maxX: -0.4,
      minY: -1.1,
      maxY: -1,
    }),
  ).toEqual([text])
  expect(
    getPcbElementsWithinBounds([text], {
      minX: -0.5,
      maxX: -0.4,
      minY: -3.1,
      maxY: -3,
    }),
  ).toEqual([])
})

test("each line aligns independently and uses one-em spacing", () => {
  const element = createText({
    text: "ili\nHHH\nR1",
    anchor_alignment: "top_right",
  })
  const bounds = getPcbElementBounds(element)
  if (!bounds) throw new Error("Missing text bounds")
  expect(bounds.minX).toBeCloseTo(2 - 2.076, 12)
  expect(bounds.maxX).toBe(2)
  expect(bounds.minY).toBeCloseTo(-3 - 3.152, 12)
  expect(bounds.maxY).toBe(-3)
})

for (const anchor_alignment of alignments)
  for (const layer of ["top", "bottom"] as const)
    for (const ccw_rotation of [0, 45])
      test(`multiline ink fits ${anchor_alignment} ${layer} at ${ccw_rotation}`, () =>
        expectInkInside(
          createText({
            text: "R1gil\nili\nHHH",
            anchor_alignment,
            layer,
            ccw_rotation,
            font_size: 2,
          }),
        ))

test("explicitly mirrored multiline ink fits a non-central frame", () => {
  expectInkInside(
    createText({
      text: "ili\nR1gil",
      anchor_alignment: "bottom_left",
      is_mirrored: true,
      ccw_rotation: -30,
    }),
  )
})

test("shows text outlines inside computed bounds", () => {
  const cards = [
    createText({ text: "HELLO", anchor_position: { x: 0, y: 0 } }),
    createText({ text: "ili", anchor_position: { x: 0, y: 0 } }),
    createText({
      text: "R1gil",
      anchor_position: { x: 0, y: 0 },
      ccw_rotation: 45,
    }),
    createText({ text: "HELLO\nili", anchor_position: { x: 0, y: 0 } }),
    createText({
      text: "ili\nR1gil",
      anchor_position: { x: 0, y: 0 },
      anchor_alignment: "top_right",
      layer: "bottom",
      ccw_rotation: 45,
    }),
    createText({
      text: "R1gil",
      anchor_position: { x: 0, y: 0 },
      layer: "bottom",
      ccw_rotation: 45,
    }),
  ]
    .map((element, index) => {
      const bounds = getPcbElementBounds(element)
      if (!bounds) throw new Error("Missing text bounds")
      const layout = getReferenceLayout(element)
      const m = layout.matrix
      return `<g transform="translate(${160 + (index % 2) * 320},${140 + Math.floor(index / 2) * 250}) scale(60,-60)"><rect x="${bounds.minX}" y="${bounds.minY}" width="${bounds.maxX - bounds.minX}" height="${bounds.maxY - bounds.minY}" fill="#fee2e2" stroke="#dc2626" stroke-width="0.025"/><g transform="matrix(${m.a},${m.b},${m.c},${m.d},${m.e},${m.f})" fill="#1d4ed8">${layout.paths.join("")}</g></g>`
    })
    .join("")
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="750"><rect width="640" height="750" fill="white"/>${cards}</svg>`
  expect(svg).toMatchSvgSnapshot(import.meta.path, "silkscreen-text-bounds")
})
