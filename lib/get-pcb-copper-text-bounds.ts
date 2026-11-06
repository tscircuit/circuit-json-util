import { lineAlphabet } from "@tscircuit/alphabet"
import {
  distance,
  type NinePointAnchor,
  type PcbCopperText,
} from "circuit-json"
import type { PcbBounds } from "./get-bounds-of-pcb-elements"

const CHAR_WIDTH = 1.0
const CHAR_SPACING = 0.2
const LINE_HEIGHT = 1.4
const FONT_SCALE = 0.53
const STROKE_WIDTH_RATIO = 0.15

interface PathSegment {
  x1: number
  y1: number
  x2: number
  y2: number
}

const VALID_ALIGNMENTS = new Set<NinePointAnchor>([
  "center",
  "top_left",
  "top_center",
  "top_right",
  "center_left",
  "center_right",
  "bottom_left",
  "bottom_center",
  "bottom_right",
])

const getHorizontalAnchorPosition = (
  anchorAlignment: NinePointAnchor,
  bounds: Pick<PcbBounds, "minX" | "maxX">,
): number => {
  if (
    anchorAlignment === "top_left" ||
    anchorAlignment === "center_left" ||
    anchorAlignment === "bottom_left"
  ) {
    return bounds.minX
  }

  if (
    anchorAlignment === "top_right" ||
    anchorAlignment === "center_right" ||
    anchorAlignment === "bottom_right"
  ) {
    return bounds.maxX
  }

  return (bounds.minX + bounds.maxX) / 2
}

const getVerticalAnchorPosition = (
  anchorAlignment: NinePointAnchor,
  bounds: Pick<PcbBounds, "minY" | "maxY">,
): number => {
  if (
    anchorAlignment === "top_left" ||
    anchorAlignment === "top_center" ||
    anchorAlignment === "top_right"
  ) {
    return bounds.minY
  }

  if (
    anchorAlignment === "bottom_left" ||
    anchorAlignment === "bottom_center" ||
    anchorAlignment === "bottom_right"
  ) {
    return bounds.maxY
  }

  return (bounds.minY + bounds.maxY) / 2
}

const getAnchorOffsetForBounds = (
  anchorAlignment: NinePointAnchor,
  bounds: PcbBounds,
): { x: number; y: number } => ({
  x: -getHorizontalAnchorPosition(anchorAlignment, bounds),
  y: -getVerticalAnchorPosition(anchorAlignment, bounds),
})

const getLineWidth = (
  line: string,
  charAdvance: number,
  spaceAdvance: number,
  trailingSpacing: number,
): number => {
  let width = 0
  for (const char of line) {
    width += char === " " ? spaceAdvance : charAdvance
  }
  return width > 0 ? width - trailingSpacing : 0
}

export const getPcbCopperTextBounds = (
  element: PcbCopperText,
): PcbBounds | null => {
  if (typeof element.text !== "string" || !element.text) return null
  if (element.font !== undefined && element.font !== "tscircuit2024")
    return null

  const anchor = element.anchor_position
  if (
    !anchor ||
    typeof anchor.x !== "number" ||
    typeof anchor.y !== "number" ||
    !Number.isFinite(anchor.x) ||
    !Number.isFinite(anchor.y)
  ) {
    return null
  }

  const rawFontSize =
    element.font_size === undefined
      ? 0.2
      : typeof element.font_size === "number"
        ? element.font_size
        : distance.parse(element.font_size)
  if (
    typeof rawFontSize !== "number" ||
    !Number.isFinite(rawFontSize) ||
    rawFontSize <= 0
  ) {
    return null
  }

  const rotationDegrees = element.ccw_rotation ?? 0
  if (!Number.isFinite(rotationDegrees)) return null

  const anchorAlignment: NinePointAnchor = element.anchor_alignment ?? "center"
  if (!VALID_ALIGNMENTS.has(anchorAlignment)) return null

  const scaledFontSize = rawFontSize * FONT_SCALE
  const charAdvance = (CHAR_WIDTH + CHAR_SPACING) * scaledFontSize
  const spaceAdvance = (CHAR_WIDTH + CHAR_SPACING) * scaledFontSize * 0.6
  const trailingSpacing = CHAR_SPACING * scaledFontSize
  const lineHeight = scaledFontSize * LINE_HEIGHT

  const textLines = element.text.split("\n")
  const totalHeight = textLines.length * lineHeight
  const lineWidths = textLines.map((line) =>
    getLineWidth(line, charAdvance, spaceAdvance, trailingSpacing),
  )

  const baseSegments: PathSegment[] = []
  let y = -totalHeight / 2

  for (let lineIndex = 0; lineIndex < textLines.length; lineIndex++) {
    const line = textLines[lineIndex] ?? ""
    const lineWidth = lineWidths[lineIndex] ?? 0
    let x = -lineWidth / 2

    for (const char of line) {
      if (char === " ") {
        x += spaceAdvance
        continue
      }

      const charSegments = lineAlphabet[char as keyof typeof lineAlphabet]
      if (charSegments) {
        for (const segment of charSegments) {
          baseSegments.push({
            x1: x + segment.x1 * scaledFontSize,
            y1: y + (1 - segment.y1) * scaledFontSize,
            x2: x + segment.x2 * scaledFontSize,
            y2: y + (1 - segment.y2) * scaledFontSize,
          })
        }
      }

      x += charAdvance
    }

    y += lineHeight
  }

  if (baseSegments.length === 0) return null

  let baseMinX = Number.POSITIVE_INFINITY
  let baseMinY = Number.POSITIVE_INFINITY
  let baseMaxX = Number.NEGATIVE_INFINITY
  let baseMaxY = Number.NEGATIVE_INFINITY
  for (const segment of baseSegments) {
    baseMinX = Math.min(baseMinX, segment.x1, segment.x2)
    baseMinY = Math.min(baseMinY, segment.y1, segment.y2)
    baseMaxX = Math.max(baseMaxX, segment.x1, segment.x2)
    baseMaxY = Math.max(baseMaxY, segment.y1, segment.y2)
  }

  const baseBounds: PcbBounds = {
    minX: baseMinX,
    minY: baseMinY,
    maxX: baseMaxX,
    maxY: baseMaxY,
  }
  const anchorOffset = getAnchorOffsetForBounds(anchorAlignment, baseBounds)
  const anchoredBounds: PcbBounds = {
    minX: baseBounds.minX + anchorOffset.x,
    minY: baseBounds.minY + anchorOffset.y,
    maxX: baseBounds.maxX + anchorOffset.x,
    maxY: baseBounds.maxY + anchorOffset.y,
  }

  const layerName = element.layer ?? "top"
  const applyMirror =
    layerName === "bottom" ? true : element.is_mirrored === true
  const radians = (rotationDegrees * Math.PI) / 180
  const cosine = Math.cos(radians)
  const sine = Math.sin(radians)

  const transformLocalPoint = (lx: number, ly: number) => {
    const mx = applyMirror ? -lx : lx
    const my = -ly
    return {
      x: anchor.x + mx * cosine - my * sine,
      y: anchor.y + mx * sine + my * cosine,
    }
  }

  if (element.is_knockout) {
    const padLeft = element.knockout_padding?.left ?? scaledFontSize * 0.5
    const padRight = element.knockout_padding?.right ?? scaledFontSize * 0.5
    const padTop = element.knockout_padding?.top ?? scaledFontSize * 0.3
    const padBottom = element.knockout_padding?.bottom ?? scaledFontSize * 0.3
    if (![padLeft, padRight, padTop, padBottom].every(Number.isFinite)) {
      return null
    }

    const rectX = anchoredBounds.minX - padLeft
    const rectY = anchoredBounds.minY - padTop
    const rectW = anchoredBounds.maxX - anchoredBounds.minX + padLeft + padRight
    const rectH = anchoredBounds.maxY - anchoredBounds.minY + padTop + padBottom
    const knockoutBounds: PcbBounds = {
      minX: rectX,
      minY: rectY,
      maxX: rectX + rectW,
      maxY: rectY + rectH,
    }
    const knockoutAnchorOffset = getAnchorOffsetForBounds(
      anchorAlignment,
      knockoutBounds,
    )
    const alignedRectX = rectX + knockoutAnchorOffset.x
    const alignedRectY = rectY + knockoutAnchorOffset.y

    let minX = Number.POSITIVE_INFINITY
    let minY = Number.POSITIVE_INFINITY
    let maxX = Number.NEGATIVE_INFINITY
    let maxY = Number.NEGATIVE_INFINITY

    for (const lx of [alignedRectX, alignedRectX + rectW]) {
      for (const ly of [alignedRectY, alignedRectY + rectH]) {
        const pt = transformLocalPoint(lx, ly)
        minX = Math.min(minX, pt.x)
        minY = Math.min(minY, pt.y)
        maxX = Math.max(maxX, pt.x)
        maxY = Math.max(maxY, pt.y)
      }
    }

    return { minX, minY, maxX, maxY }
  }

  const strokeRadius = (scaledFontSize * STROKE_WIDTH_RATIO) / 2
  let minX = Number.POSITIVE_INFINITY
  let minY = Number.POSITIVE_INFINITY
  let maxX = Number.NEGATIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY

  for (const segment of baseSegments) {
    const p1 = transformLocalPoint(
      segment.x1 + anchorOffset.x,
      segment.y1 + anchorOffset.y,
    )
    const p2 = transformLocalPoint(
      segment.x2 + anchorOffset.x,
      segment.y2 + anchorOffset.y,
    )
    minX = Math.min(minX, p1.x - strokeRadius, p2.x - strokeRadius)
    minY = Math.min(minY, p1.y - strokeRadius, p2.y - strokeRadius)
    maxX = Math.max(maxX, p1.x + strokeRadius, p2.x + strokeRadius)
    maxY = Math.max(maxY, p1.y + strokeRadius, p2.y + strokeRadius)
  }

  return { minX, minY, maxX, maxY }
}
