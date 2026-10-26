import type { PcbFabricationNoteRect, PcbNoteRect } from "circuit-json"
import type { PcbBounds } from "./get-bounds-of-pcb-elements"

export const getPcbNoteRectBounds = (
  element: PcbNoteRect | PcbFabricationNoteRect,
): PcbBounds | null => {
  const { center, width, height, stroke_width, has_stroke } = element
  if (
    !center ||
    ![center.x, center.y, width, height, stroke_width].every(Number.isFinite)
  )
    return null
  if (has_stroke === false || stroke_width <= 0 || width === 0 || height === 0)
    return null
  const halfWidth = Math.abs(width) / 2 + stroke_width / 2
  const halfHeight = Math.abs(height) / 2 + stroke_width / 2
  const bounds = {
    minX: center.x - halfWidth,
    maxX: center.x + halfWidth,
    minY: center.y - halfHeight,
    maxY: center.y + halfHeight,
  }
  return Object.values(bounds).every(Number.isFinite) ? bounds : null
}
