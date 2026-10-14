import type { PcbNoteText } from "circuit-json"
import type { PcbBounds } from "./get-bounds-of-pcb-elements"
import { getPcbAlphabetTextBounds } from "./get-pcb-alphabet-text-bounds"

export const getPcbNoteTextBounds = (
  element: PcbNoteText,
): PcbBounds | null => {
  if (typeof element.text !== "string" || !element.text) return null
  if (element.font !== undefined && element.font !== "tscircuit2024")
    return null
  const fontSize = element.font_size === undefined ? 1 : element.font_size
  const anchor = element.anchor_position
  if (
    !anchor ||
    fontSize <= 0 ||
    ![fontSize, anchor.x, anchor.y].every(Number.isFinite)
  )
    return null
  let bounds: PcbBounds | null = null
  let lineY = anchor.y
  const lines = element.text.split("\n")
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index]!
    if (!line) continue
    // SVGのdyは空tspanでは進まず、最初でない非空行に1emを適用します。
    if (index > 0) lineY -= fontSize
    const lineBounds = getPcbAlphabetTextBounds(
      line,
      fontSize,
      { x: anchor.x, y: lineY },
      0,
      element.anchor_alignment === undefined
        ? "center"
        : element.anchor_alignment,
    )
    if (!lineBounds) return null
    bounds = bounds
      ? {
          minX: Math.min(bounds.minX, lineBounds.minX),
          maxX: Math.max(bounds.maxX, lineBounds.maxX),
          minY: Math.min(bounds.minY, lineBounds.minY),
          maxY: Math.max(bounds.maxY, lineBounds.maxY),
        }
      : lineBounds
  }
  return bounds
}
