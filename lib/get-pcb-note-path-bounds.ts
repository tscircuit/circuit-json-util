import type { PcbNotePath } from "circuit-json"
import type { PcbBounds } from "./get-bounds-of-pcb-elements"

type Point = { x: number; y: number }

/** 現行SVGのbutt端とmiter継ぎ目（limit=4）を持つ注記パスの枠を返します。 */
export const getPcbNotePathBounds = (
  element: PcbNotePath,
): PcbBounds | null => {
  const radius = element.stroke_width / 2
  if (!Number.isFinite(radius) || radius <= 0 || !Array.isArray(element.route))
    return null
  if (
    element.route.some(
      (point) =>
        !point || !Number.isFinite(point.x) || !Number.isFinite(point.y),
    )
  )
    return null

  let bounds: PcbBounds | null = null
  const include = (point: Point) => {
    if (!bounds) {
      bounds = { minX: point.x, maxX: point.x, minY: point.y, maxY: point.y }
      return
    }
    bounds.minX = Math.min(bounds.minX, point.x)
    bounds.maxX = Math.max(bounds.maxX, point.x)
    bounds.minY = Math.min(bounds.minY, point.y)
    bounds.maxY = Math.max(bounds.maxY, point.y)
  }
  let previousNormal: Point | null = null
  for (let index = 1; index < element.route.length; index++) {
    const start = element.route[index - 1]!
    const end = element.route[index]!
    const dx = end.x - start.x
    const dy = end.y - start.y
    const length = Math.hypot(dx, dy)
    if (length === 0) continue
    if (!Number.isFinite(length)) return null
    const normal = { x: -dy / length, y: dx / length }
    for (const point of [start, end])
      for (const sign of [-1, 1]) {
        include({
          x: point.x + sign * radius * normal.x,
          y: point.y + sign * radius * normal.y,
        })
      }
    if (previousNormal) {
      const cross = previousNormal.x * normal.y - previousNormal.y * normal.x
      const denominator =
        1 + previousNormal.x * normal.x + previousNormal.y * normal.y
      if (cross !== 0 && denominator > 0) {
        const offset = {
          x: (radius * (previousNormal.x + normal.x)) / denominator,
          y: (radius * (previousNormal.y + normal.y)) / denominator,
        }
        // 内側の延長交点は含めず、limitを超える外側はbevel端の枠を使います。
        if (Math.hypot(offset.x, offset.y) <= 4 * radius) {
          const side = -Math.sign(cross)
          include({
            x: start.x + side * offset.x,
            y: start.y + side * offset.y,
          })
        }
      }
    }
    previousNormal = normal
  }
  return bounds && Object.values(bounds).every(Number.isFinite) ? bounds : null
}
