import type {
  PcbFabricationNoteDimension,
  PcbNoteDimension,
} from "circuit-json"
import type { PcbBounds } from "./get-bounds-of-pcb-elements"
import { getPcbAlphabetTextBounds } from "./get-pcb-alphabet-text-bounds"

type Point = { x: number; y: number }
const normalize = (point: Point): Point | null => {
  const length = Math.hypot(point.x, point.y) || 1
  if (!Number.isFinite(length)) return null
  return { x: point.x / length, y: point.y / length }
}

/** 寸法線・補助線・矢印と、対応する加工ラベルの物理枠を返します。 */
export const getPcbNoteDimensionBounds = (
  element: PcbNoteDimension | PcbFabricationNoteDimension,
): PcbBounds | null => {
  const { from, to, arrow_size, offset_direction } = element
  // 通常注記は端末のArialに依存するため、文字付きのfallbackを維持します。
  if (element.text && element.type !== "pcb_fabrication_note_dimension")
    return null
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
  if (element.text) {
    const fontSize = element.font_size ?? 1
    const extraRotation = element.text_ccw_rotation
    const hasExtraRotation =
      typeof extraRotation === "number" && Number.isFinite(extraRotation)
    // 描画側の文字避け用offsetも再現します。これは輪郭の計測値とは別です。
    const rotationRadians =
      ((hasExtraRotation ? extraRotation : 0) * Math.PI) / 180
    const additionalOffset = hasExtraRotation
      ? (element.text.length *
          fontSize *
          0.6 *
          Math.abs(Math.sin(rotationRadians))) /
          2 +
        (fontSize * Math.abs(Math.cos(rotationRadians))) / 2 +
        fontSize * 0.3
      : 0
    const textOffset = arrow_size * 1.5 + additionalOffset
    const anchor = {
      x: (from.x + to.x) / 2 + offset.x + perpendicular.x * textOffset,
      y: (from.y + to.y) / 2 + offset.y + perpendicular.y * textOffset,
    }
    let screenAngle = (Math.atan2(-direction.y, direction.x) * 180) / Math.PI
    if (screenAngle > 90 || screenAngle < -90) screenAngle += 180
    const labelBounds = getPcbAlphabetTextBounds(
      element.text,
      fontSize,
      anchor,
      -screenAngle + (hasExtraRotation ? extraRotation : 0),
    )
    if (!labelBounds) return null
    include({ x: labelBounds.minX, y: labelBounds.minY })
    include({ x: labelBounds.maxX, y: labelBounds.maxY })
  }
  return Object.values(bounds).every(Number.isFinite) ? bounds : null
}
