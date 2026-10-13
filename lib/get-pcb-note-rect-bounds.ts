import type { PcbFabricationNoteRect, PcbNoteRect } from "circuit-json"
import type { PcbBounds } from "./get-bounds-of-pcb-elements"

/** 表示される枠線を含む通常・加工注記長方形の外枠を返し、破線には保守的な枠を使います。 */
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
  // 現行rendererは対角2点の差を絶対値にしてSVGの寸法を作ります。
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
