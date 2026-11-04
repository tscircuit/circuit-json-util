import type { PcbFabricationNoteText } from "circuit-json"
import type { PcbBounds } from "./get-bounds-of-pcb-elements"
import { pcbDimensionLabelFontMetrics } from "./pcb-dimension-label-font-metrics"

type Point = { x: number; y: number }

export const getPcbAlphabetTextBounds = (
  text: string,
  fontSize: number,
  anchor: Point,
  rotationDegrees: number,
  alignment: PcbFabricationNoteText["anchor_alignment"] = "center",
): PcbBounds | null => {
  if (
    typeof text !== "string" ||
    !text ||
    fontSize <= 0 ||
    ![fontSize, anchor?.x, anchor?.y, rotationDegrees].every(Number.isFinite)
  )
    return null
  if (
    !anchor ||
    ![
      "center",
      "top_left",
      "top_right",
      "bottom_left",
      "bottom_right",
    ].includes(alignment)
  )
    return null
  let advance = 0
  let minX = Number.POSITIVE_INFINITY
  let maxX = Number.NEGATIVE_INFINITY
  let minY = Number.POSITIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY
  for (const char of text) {
    const glyph = pcbDimensionLabelFontMetrics[char]
    if (!glyph) return null
    minX = Math.min(minX, advance + glyph[1])
    maxX = Math.max(maxX, advance + glyph[3])
    minY = Math.min(minY, glyph[2])
    maxY = Math.max(maxY, glyph[4])
    advance += glyph[0]
  }
  const scale = fontSize / 1000
  const horizontalOffset = alignment.endsWith("left")
    ? 0
    : alignment.endsWith("right")
      ? advance
      : advance / 2
  const baselineOffset = alignment.startsWith("top")
    ? 940
    : alignment.startsWith("bottom")
      ? -212
      : 364
  const left = (minX - horizontalOffset) * scale
  const right = (maxX - horizontalOffset) * scale
  const bottom = (minY - baselineOffset) * scale
  const top = (maxY - baselineOffset) * scale
  const radians = (rotationDegrees * Math.PI) / 180
  const cosine = Math.cos(radians)
  const sine = Math.sin(radians)
  const bounds: PcbBounds = {
    minX: Number.POSITIVE_INFINITY,
    maxX: Number.NEGATIVE_INFINITY,
    minY: Number.POSITIVE_INFINITY,
    maxY: Number.NEGATIVE_INFINITY,
  }
  for (const x of [left, right])
    for (const y of [bottom, top]) {
      const px = anchor.x + cosine * x - sine * y
      const py = anchor.y + sine * x + cosine * y
      bounds.minX = Math.min(bounds.minX, px)
      bounds.maxX = Math.max(bounds.maxX, px)
      bounds.minY = Math.min(bounds.minY, py)
      bounds.maxY = Math.max(bounds.maxY, py)
    }
  return Object.values(bounds).every(Number.isFinite) ? bounds : null
}
