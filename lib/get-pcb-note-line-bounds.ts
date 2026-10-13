import type { PcbNoteLine } from "circuit-json"
import type { PcbBounds } from "./get-bounds-of-pcb-elements"

/** 丸い端を持つ注記直線の枠を返し、破線には線全体の保守的な枠を使います。 */
export const getPcbNoteLineBounds = (
  element: PcbNoteLine,
): PcbBounds | null => {
  const { x1, y1, x2, y2, stroke_width } = element
  if (
    ![x1, y1, x2, y2, stroke_width].every(Number.isFinite) ||
    stroke_width <= 0
  )
    return null
  if (element.is_dashed && x1 === x2 && y1 === y2) return null
  const radius = stroke_width / 2
  const bounds = {
    minX: Math.min(x1, x2) - radius,
    maxX: Math.max(x1, x2) + radius,
    minY: Math.min(y1, y2) - radius,
    maxY: Math.max(y1, y2) + radius,
  }
  return Object.values(bounds).every(Number.isFinite) ? bounds : null
}
