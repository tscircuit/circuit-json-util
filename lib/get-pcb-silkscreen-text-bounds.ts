import {
  glyphAdvanceRatio,
  lineAlphabet,
  textMetrics,
} from "@tscircuit/alphabet"
import type { PcbSilkscreenText } from "circuit-json"
import type { PcbBounds } from "./get-bounds-of-pcb-elements"

const FONT_UNITS_PER_EM = 1000
const glyphAdvances: Record<string, number> = glyphAdvanceRatio

/** 認識できる通常文字について、物理単位の保守的なfont frameを返します。 */
export const getPcbSilkscreenTextBounds = (
  element: PcbSilkscreenText,
): PcbBounds | null => {
  const { text, anchor_position, font_size = 1 } = element
  const ccwRotation = element.ccw_rotation ?? 0
  const lines = typeof text === "string" ? text.split("\n") : undefined
  if (
    element.font !== "tscircuit2024" ||
    element.is_knockout ||
    !lines?.length ||
    lines.some((line) => !line || /\s/u.test(line)) ||
    !anchor_position ||
    !Number.isFinite(anchor_position.x) ||
    !Number.isFinite(anchor_position.y) ||
    !Number.isFinite(ccwRotation) ||
    !Number.isFinite(font_size) ||
    font_size <= 0
  )
    return null

  const alignment = element.anchor_alignment ?? "center"
  let minX = Number.POSITIVE_INFINITY
  let maxX = Number.NEGATIVE_INFINITY
  for (const line of lines) {
    let advance = 0
    let lineMinX = 0
    let lineMaxX = 0
    for (const char of line) {
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
        lineMinX = Math.min(lineMinX, advance + left)
        lineMaxX = Math.max(lineMaxX, advance + right)
      }
      advance +=
        Math.round(
          (glyphAdvances[char] ?? textMetrics.glyphWidthRatio) *
            FONT_UNITS_PER_EM,
        ) / FONT_UNITS_PER_EM
    }
    lineMaxX = Math.max(lineMaxX, advance)
    const offsetX = alignment.endsWith("_left")
      ? 0
      : alignment.endsWith("_right")
        ? -advance
        : -advance / 2
    minX = Math.min(minX, lineMinX + offsetX)
    maxX = Math.max(maxX, lineMaxX + offsetX)
  }
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
  // 通常SVG文字の行間は1emで、上下揃えは最初の行に適用されます。
  const maxY = minY + height + (lines.length - 1) * font_size
  const points = [
    { x: minX * font_size, y: minY },
    { x: maxX * font_size, y: minY },
    { x: maxX * font_size, y: maxY },
    { x: minX * font_size, y: maxY },
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
