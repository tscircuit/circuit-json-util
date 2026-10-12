import { lineAlphabet } from "@tscircuit/alphabet"
import { type PcbCopperText, distance } from "circuit-json"
import type { PcbBounds } from "./get-bounds-of-pcb-elements"

const FONT_SCALE = 0.53
const CHAR_ADVANCE = 1.2
const SPACE_ADVANCE = 0.72
const TRAILING_SPACING = 0.2
const LINE_HEIGHT = 1.4
const STROKE_WIDTH = 0.15

/** 現行rendererの銅箔文字について、strokeまたは白抜き背景の外端まで含めます。 */
export const getPcbCopperTextBounds = (
  element: PcbCopperText,
): PcbBounds | null => {
  const { text, anchor_position } = element
  let parsedSize: ReturnType<typeof distance.safeParse>
  try {
    parsedSize = distance.safeParse(element.font_size ?? 0.2)
  } catch {
    // distanceの単位transformが投げた例外も、従来のanchor fallbackへ戻します。
    return null
  }
  const rotationDegrees = element.ccw_rotation ?? 0
  if (
    element.font !== "tscircuit2024" ||
    typeof text !== "string" ||
    !text ||
    !anchor_position ||
    !Number.isFinite(anchor_position.x) ||
    !Number.isFinite(anchor_position.y) ||
    !Number.isFinite(rotationDegrees) ||
    !parsedSize.success ||
    !Number.isFinite(parsedSize.data) ||
    parsedSize.data <= 0
  )
    return null
  const fontSize = parsedSize.data * FONT_SCALE
  const lines = text.split("\n")
  const points: Array<{ x: number; y: number }> = []
  let localMinX = Number.POSITIVE_INFINITY
  let localMaxX = Number.NEGATIVE_INFINITY
  let localMinY = Number.POSITIVE_INFINITY
  let localMaxY = Number.NEGATIVE_INFINITY
  const addPoint = (x: number, y: number) => {
    points.push({ x, y })
    localMinX = Math.min(localMinX, x)
    localMaxX = Math.max(localMaxX, x)
    localMinY = Math.min(localMinY, y)
    localMaxY = Math.max(localMaxY, y)
  }
  for (const [index, line] of lines.entries()) {
    const width =
      (Array.from(line).reduce(
        (sum, char) => sum + (char === " " ? SPACE_ADVANCE : CHAR_ADVANCE),
        0,
      ) -
        (line ? TRAILING_SPACING : 0)) *
      fontSize
    let penX = -width / 2
    const penY =
      -(lines.length * LINE_HEIGHT * fontSize) / 2 +
      index * LINE_HEIGHT * fontSize
    for (const char of line) {
      if (char === " ") {
        penX += SPACE_ADVANCE * fontSize
        continue
      }
      const segments = lineAlphabet[char]
      if (!segments?.length) return null
      for (const segment of segments) {
        addPoint(
          penX + segment.x1 * fontSize,
          penY + (1 - segment.y1) * fontSize,
        )
        addPoint(
          penX + segment.x2 * fontSize,
          penY + (1 - segment.y2) * fontSize,
        )
      }
      penX += CHAR_ADVANCE * fontSize
    }
  }
  if (!points.length) return null
  if (element.is_knockout) {
    const padding = element.knockout_padding
    const pads = {
      left: padding?.left ?? fontSize * 0.5,
      right: padding?.right ?? fontSize * 0.5,
      top: padding?.top ?? fontSize * 0.3,
      bottom: padding?.bottom ?? fontSize * 0.3,
    }
    if (Object.values(pads).some((value) => !Number.isFinite(value)))
      return null
    localMinX -= pads.left
    localMaxX += pads.right
    localMinY -= pads.top
    localMaxY += pads.bottom
    if (localMaxX <= localMinX || localMaxY <= localMinY) return null
    // 白抜き背景は矩形全体を揃え、外側へstrokeを加えません。
    points.length = 0
    points.push(
      { x: localMinX, y: localMinY },
      { x: localMaxX, y: localMinY },
      { x: localMaxX, y: localMaxY },
      { x: localMinX, y: localMaxY },
    )
  }
  const alignment = element.anchor_alignment ?? "center"
  const anchorX = alignment.endsWith("_left")
    ? localMinX
    : alignment.endsWith("_right")
      ? localMaxX
      : (localMinX + localMaxX) / 2
  const anchorY = alignment.startsWith("top_")
    ? localMinY
    : alignment.startsWith("bottom_")
      ? localMaxY
      : (localMinY + localMaxY) / 2
  const angle = (rotationDegrees * Math.PI) / 180
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)
  const mirror = element.layer === "bottom" || element.is_mirrored === true
  let minX = Number.POSITIVE_INFINITY
  let minY = Number.POSITIVE_INFINITY
  let maxX = Number.NEGATIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY
  for (const point of points) {
    const x = (point.x - anchorX) * (mirror ? -1 : 1)
    const y = -(point.y - anchorY)
    const worldX = anchor_position.x + x * cos - y * sin
    const worldY = anchor_position.y + x * sin + y * cos
    minX = Math.min(minX, worldX)
    maxX = Math.max(maxX, worldX)
    minY = Math.min(minY, worldY)
    maxY = Math.max(maxY, worldY)
  }
  // round cap/joinの半径は回転後も同じ物理単位で加えます。
  const radius = element.is_knockout ? 0 : (fontSize * STROKE_WIDTH) / 2
  return {
    minX: minX - radius,
    maxX: maxX + radius,
    minY: minY - radius,
    maxY: maxY + radius,
  }
}
