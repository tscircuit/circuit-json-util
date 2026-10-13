import type {
  PcbFabricationNoteDimension,
  PcbNoteDimension,
} from "circuit-json"
import type { PcbBounds } from "./get-bounds-of-pcb-elements"

type Point = { x: number; y: number }
const normalize = (point: Point): Point | null => {
  const length = Math.hypot(point.x, point.y) || 1
  if (!Number.isFinite(length)) return null
  return { x: point.x / length, y: point.y / length }
}

/** ラベルのない通常・加工寸法注記の線・補助線・矢印を囲む物理枠を返します。 */
export const getPcbNoteDimensionBounds = (
  element: PcbNoteDimension | PcbFabricationNoteDimension,
): PcbBounds | null => {
  const { from, to, arrow_size, offset_direction } = element
  // ラベルの描画領域を含められないため、文字付きは従来のfallbackを維持します。
  if (element.text) return null
  const offsetDistance = element.offset_distance ?? 0
  if (
    !from ||
    !to ||
    ![from.x, from.y, to.x, to.y, arrow_size, offsetDistance].every(
      Number.isFinite,
    ) ||
    arrow_size <= 0
  )
    return null
  if (
    offset_direction &&
    ![offset_direction.x, offset_direction.y].every(Number.isFinite)
  )
    return null
  const direction = normalize({ x: to.x - from.x, y: to.y - from.y })
  const offsetDirection = offset_direction
    ? normalize(offset_direction)
    : { x: 0, y: 0 }
  if (!direction || !offsetDirection) return null
  const perpendicular = { x: -direction.y, y: direction.x }
  const offset = {
    x: offsetDirection.x * offsetDistance,
    y: offsetDirection.y * offsetDistance,
  }
  const fromOffset = { x: from.x + offset.x, y: from.y + offset.y }
  const toOffset = { x: to.x + offset.x, y: to.y + offset.y }
  const fromBase = {
    x: fromOffset.x + direction.x * arrow_size,
    y: fromOffset.y + direction.y * arrow_size,
  }
  const toBase = {
    x: toOffset.x - direction.x * arrow_size,
    y: toOffset.y - direction.y * arrow_size,
  }
  const radius = arrow_size / 10
  const bounds: PcbBounds = {
    minX: Number.POSITIVE_INFINITY,
    maxX: Number.NEGATIVE_INFINITY,
    minY: Number.POSITIVE_INFINITY,
    maxY: Number.NEGATIVE_INFINITY,
  }
  const include = (point: Point, strokeRadius = 0) => {
    bounds.minX = Math.min(bounds.minX, point.x - strokeRadius)
    bounds.maxX = Math.max(bounds.maxX, point.x + strokeRadius)
    bounds.minY = Math.min(bounds.minY, point.y - strokeRadius)
    bounds.maxY = Math.max(bounds.maxY, point.y + strokeRadius)
  }
  include(fromBase, radius)
  include(toBase, radius)
  for (const [tip, base] of [
    [fromOffset, fromBase],
    [toOffset, toBase],
  ] as const) {
    include(tip)
    for (const sign of [-1, 1])
      include({
        x: base.x + (sign * perpendicular.x * arrow_size) / 2,
        y: base.y + (sign * perpendicular.y * arrow_size) / 2,
      })
  }
  const extensionDirection =
    offset_direction &&
    (Math.abs(offsetDirection.x) > Number.EPSILON ||
      Math.abs(offsetDirection.y) > Number.EPSILON)
      ? offsetDirection
      : perpendicular
  const extensionLength = offsetDistance + arrow_size
  for (const anchor of [from, to]) {
    include(anchor, radius)
    include(
      {
        x: anchor.x + extensionDirection.x * extensionLength,
        y: anchor.y + extensionDirection.y * extensionLength,
      },
      radius,
    )
  }
  return Object.values(bounds).every(Number.isFinite) ? bounds : null
}
