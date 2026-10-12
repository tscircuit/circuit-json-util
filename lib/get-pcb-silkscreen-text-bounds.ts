import {
  glyphAdvanceRatio,
  lineAlphabet,
  textMetrics,
} from "@tscircuit/alphabet"
import type { PcbSilkscreenText } from "circuit-json"
import type { PcbBounds } from "./get-bounds-of-pcb-elements"

const FONT_UNITS_PER_EM = 1000
const glyphAdvances: Record<string, number> = glyphAdvanceRatio

/** 対応する通常文字と白抜き背景の物理範囲を返します。 */
export const getPcbSilkscreenTextBounds = (
  element: PcbSilkscreenText,
): PcbBounds | null => {
  const { text, anchor_position, font_size = 1 } = element
  const ccwRotation = element.ccw_rotation ?? 0
  const lines = typeof text === "string" ? text.split("\n") : undefined
  if (
    element.font !== "tscircuit2024" ||
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

  if (element.is_knockout) {
    const bounds = getKnockoutLocalBounds(element, lines, font_size)
    return bounds ? transformTextBounds(element, bounds) : null
  }

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
  // 通常SVG文字の行間は1emで、上下揃えは最初の行に適用されます。
  const maxY = minY + height + (lines.length - 1) * font_size
  return transformTextBounds(element, {
    minX: minX * font_size,
    maxX: maxX * font_size,
    minY,
    maxY,
  })
}

const getKnockoutLocalBounds = (
  element: PcbSilkscreenText,
  lines: string[],
  fontSize: number,
): PcbBounds | null => {
  const advance =
    Math.round(textMetrics.glyphWidthRatio * FONT_UNITS_PER_EM) /
    FONT_UNITS_PER_EM
  const radius = textMetrics.strokeWidthRatio / 2
  let minX = Number.POSITIVE_INFINITY
  let maxX = Number.NEGATIVE_INFINITY
  let minY = Number.POSITIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY
  for (const [index, line] of lines.entries()) {
    const chars = Array.from(line)
    const startX = -(chars.length * advance * fontSize) / 2
    for (const [charIndex, char] of chars.entries()) {
      const segments = lineAlphabet[char]
      // 描画側で固定advanceと文字別advanceが異なる文字はfallbackを保ちます。
      const charAdvance =
        Math.round(
          (glyphAdvances[char] ?? textMetrics.glyphWidthRatio) *
            FONT_UNITS_PER_EM,
        ) / FONT_UNITS_PER_EM
      if (!segments?.length || charAdvance !== advance) return null
      const offsetX = startX + charIndex * advance * fontSize
      const offsetY = index * fontSize * 1.1
      for (const segment of segments) {
        minX = Math.min(
          minX,
          offsetX + (Math.min(segment.x1, segment.x2) - radius) * fontSize,
        )
        maxX = Math.max(
          maxX,
          offsetX + (Math.max(segment.x1, segment.x2) + radius) * fontSize,
        )
        // 現行knockout rendererのfont変換は縦座標をascenderの0.94倍にします。
        minY = Math.min(
          minY,
          offsetY -
            (Math.max(segment.y1, segment.y2) + radius) * 0.94 * fontSize,
        )
        maxY = Math.max(
          maxY,
          offsetY -
            (Math.min(segment.y1, segment.y2) - radius) * 0.94 * fontSize,
        )
      }
    }
  }
  const padding = element.knockout_padding
  const pads = {
    left: padding?.left ?? fontSize * 0.5,
    right: padding?.right ?? fontSize * 0.5,
    top: padding?.top ?? fontSize * 0.3,
    bottom: padding?.bottom ?? fontSize * 0.3,
  }
  if (Object.values(pads).some((value) => !Number.isFinite(value) || value < 0))
    return null
  const width = maxX - minX + pads.left + pads.right
  const height = maxY - minY + pads.top + pads.bottom
  const alignment = element.anchor_alignment ?? "center"
  const left = alignment.endsWith("_left")
    ? 0
    : alignment.endsWith("_right")
      ? -width
      : -width / 2
  const top = alignment.startsWith("top_")
    ? 0
    : alignment.startsWith("bottom_")
      ? -height
      : -height / 2
  return { minX: left, maxX: left + width, minY: top, maxY: top + height }
}

const transformTextBounds = (
  element: PcbSilkscreenText,
  bounds: PcbBounds,
): PcbBounds => {
  const { anchor_position } = element
  const rotation = ((element.ccw_rotation ?? 0) * Math.PI) / 180
  const cos = Math.cos(rotation)
  const sin = Math.sin(rotation)
  const mirror = element.layer === "bottom" || element.is_mirrored === true
  const points = [
    { x: bounds.minX, y: bounds.minY },
    { x: bounds.maxX, y: bounds.minY },
    { x: bounds.maxX, y: bounds.maxY },
    { x: bounds.minX, y: bounds.maxY },
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
