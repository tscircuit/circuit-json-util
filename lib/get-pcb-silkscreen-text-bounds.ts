import {
  glyphAdvanceRatio,
  lineAlphabet,
  textMetrics,
} from "@tscircuit/alphabet"
import type { PcbSilkscreenText } from "circuit-json"
import type { PcbBounds } from "./get-bounds-of-pcb-elements"

const FONT_UNITS_PER_EM = 1000
const glyphAdvances: Record<string, number> = glyphAdvanceRatio

/** 認識できる単行の通常文字について、物理単位の保守的なfont frameを返します。 */
export const getPcbSilkscreenTextBounds = (
  element: PcbSilkscreenText,
): PcbBounds | null => {
  const { text, anchor_position, font_size = 1 } = element
  const ccwRotation = element.ccw_rotation ?? 0
  if (
    element.font !== "tscircuit2024" ||
    element.is_knockout ||
    !text ||
    /\s/u.test(text) ||
    !anchor_position ||
    !Number.isFinite(anchor_position.x) ||
    !Number.isFinite(anchor_position.y) ||
    !Number.isFinite(ccwRotation) ||
    !Number.isFinite(font_size) ||
    font_size <= 0
  )
    return null

  let advance = 0
  let minX = 0
  let maxX = 0
  for (const char of text) {
    const segments = lineAlphabet[char]
    if (!segments?.length) return null
    const radius = textMetrics.strokeWidthRatio / 2
    for (const segment of segments) {
      // TTFの整数font unitへの丸めでも輪郭を含むよう、端を外側へ丸めます。
      const left =
        Math.floor(
          (Math.min(segment.x1, segment.x2) - radius) * FONT_UNITS_PER_EM,
        ) / FONT_UNITS_PER_EM
      const right =
        Math.ceil(
          (Math.max(segment.x1, segment.x2) + radius) * FONT_UNITS_PER_EM,
        ) / FONT_UNITS_PER_EM
      minX = Math.min(minX, advance + left)
      maxX = Math.max(maxX, advance + right)
    }
    advance +=
      Math.round(
        (glyphAdvances[char] ?? textMetrics.glyphWidthRatio) *
          FONT_UNITS_PER_EM,
      ) / FONT_UNITS_PER_EM
  }
  maxX = Math.max(maxX, advance)
  const alignment = element.anchor_alignment ?? "center"
  const offsetX = alignment.endsWith("_left")
    ? 0
    : alignment.endsWith("_right")
      ? -advance
      : -advance / 2
  const height = textMetrics.lineHeightRatio * font_size
  const minY = alignment.startsWith("top_")
    ? 0
    : alignment.startsWith("bottom_")
      ? -height
      : -height / 2
  const rotation = (ccwRotation * Math.PI) / 180
  const cos = Math.cos(rotation)
  const sin = Math.sin(rotation)
  const mirror = element.layer === "bottom" || element.is_mirrored === true
  const points = [
    { x: (minX + offsetX) * font_size, y: minY },
    { x: (maxX + offsetX) * font_size, y: minY },
    { x: (maxX + offsetX) * font_size, y: minY + height },
    { x: (minX + offsetX) * font_size, y: minY + height },
  ].map(({ x, y }) => {
    const localX = mirror ? -x : x
    const localY = -y
    return {
      x: anchor_position.x + localX * cos - localY * sin,
      y: anchor_position.y + localX * sin + localY * cos,
    }
  })
  return {
    minX: Math.min(...points.map((point) => point.x)),
    maxX: Math.max(...points.map((point) => point.x)),
    minY: Math.min(...points.map((point) => point.y)),
    maxY: Math.max(...points.map((point) => point.y)),
  }
}
