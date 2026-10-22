import { lineAlphabet } from "@tscircuit/alphabet"
import type { AnyCircuitElement } from "circuit-json"
import type { PcbBounds } from "./get-bounds-of-pcb-elements"

type AlphabetKey = keyof typeof lineAlphabet

const CHAR_WIDTH = 1.0
const CHAR_SPACING = 0.2
const LINE_HEIGHT = 1.4
const FONT_SCALE = 0.53

export function getPcbTextBounds(elm: AnyCircuitElement): PcbBounds | null {
  if (elm.type !== "pcb_copper_text" && elm.type !== "pcb_silkscreen_text") {
    return null
  }

  const text = (elm as any).text
  if (!text || typeof text !== "string") return null

  const rawAnchor =
    ("anchor_position" in elm && (elm as any).anchor_position) ||
    ("position" in elm && (elm as any).position) ||
    ("x" in elm && "y" in elm
      ? { x: (elm as any).x, y: (elm as any).y }
      : undefined)

  if (
    !rawAnchor ||
    typeof rawAnchor.x !== "number" ||
    typeof rawAnchor.y !== "number"
  ) {
    return null
  }

  const anchor = { x: Number(rawAnchor.x), y: Number(rawAnchor.y) }

  const rawFontSize = (elm as any).font_size
  const fontSizeNum =
    typeof rawFontSize === "number"
      ? rawFontSize
      : typeof rawFontSize === "string"
        ? parseFloat(rawFontSize) || 0.2
        : 0.2

  const scaledFontSize = fontSizeNum * FONT_SCALE
  const charAdvance = (CHAR_WIDTH + CHAR_SPACING) * scaledFontSize
  const spaceAdvance = (CHAR_WIDTH + CHAR_SPACING) * scaledFontSize * 0.6
  const trailingSpacing = CHAR_SPACING * scaledFontSize
  const lineHeight = scaledFontSize * LINE_HEIGHT
  const strokeWidth = scaledFontSize * 0.15
  const strokeRadius = strokeWidth / 2

  const textLines = text.split("\n")
  const totalHeight = textLines.length * lineHeight
  const lineWidths = textLines.map((line) => {
    let w = 0
    for (const char of line) {
      w += char === " " ? spaceAdvance : charAdvance
    }
    return w > 0 ? w - trailingSpacing : 0
  })

  const baseSegments: Array<{
    x1: number
    y1: number
    x2: number
    y2: number
  }> = []
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

      const charLines = lineAlphabet[char as AlphabetKey]
      if (charLines) {
        for (const segment of charLines) {
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

  let bMinX = Number.POSITIVE_INFINITY
  let bMinY = Number.POSITIVE_INFINITY
  let bMaxX = Number.NEGATIVE_INFINITY
  let bMaxY = Number.NEGATIVE_INFINITY
  for (const seg of baseSegments) {
    bMinX = Math.min(bMinX, seg.x1, seg.x2)
    bMinY = Math.min(bMinY, seg.y1, seg.y2)
    bMaxX = Math.max(bMaxX, seg.x1, seg.x2)
    bMaxY = Math.max(bMaxY, seg.y1, seg.y2)
  }
  const baseBounds = { minX: bMinX, minY: bMinY, maxX: bMaxX, maxY: bMaxY }

  const align = (elm as any).anchor_alignment ?? "center"
  const getH = (b: { minX: number; maxX: number }) => {
    if (align.includes("left")) return b.minX
    if (align.includes("right")) return b.maxX
    return (b.minX + b.maxX) / 2
  }
  const getV = (b: { minY: number; maxY: number }) => {
    if (align.startsWith("top")) return b.minY
    if (align.startsWith("bottom")) return b.maxY
    return (b.minY + b.maxY) / 2
  }

  const rotDeg =
    "ccw_rotation" in elm && typeof (elm as any).ccw_rotation === "number"
      ? (elm as any).ccw_rotation
      : "rotation" in elm && typeof (elm as any).rotation === "number"
        ? (elm as any).rotation
        : 0
  const theta = (rotDeg * Math.PI) / 180
  const cosT = Math.cos(theta)
  const sinT = Math.sin(theta)

  const isBottom = "layer" in elm && (elm as any).layer === "bottom"
  const applyMirror = isBottom
    ? true
    : Boolean("is_mirrored" in elm && (elm as any).is_mirrored)

  if ("is_knockout" in elm && (elm as any).is_knockout) {
    const pad =
      ("knockout_padding" in elm && (elm as any).knockout_padding) || {}
    const padL = pad.left ?? scaledFontSize * 0.5
    const padR = pad.right ?? scaledFontSize * 0.5
    const padT = pad.top ?? scaledFontSize * 0.3
    const padB = pad.bottom ?? scaledFontSize * 0.3

    const rectX = baseBounds.minX - padL
    const rectY = baseBounds.minY - padT
    const rectW = baseBounds.maxX - baseBounds.minX + padL + padR
    const rectH = baseBounds.maxY - baseBounds.minY + padT + padB

    const kBounds = {
      minX: rectX,
      minY: rectY,
      maxX: rectX + rectW,
      maxY: rectY + rectH,
    }
    const offX = -getH(kBounds)
    const offY = -getV(kBounds)
    const ax = rectX + offX
    const ay = rectY + offY

    const corners = [
      { x: ax, y: -ay },
      { x: ax + rectW, y: -ay },
      { x: ax + rectW, y: -(ay + rectH) },
      { x: ax, y: -(ay + rectH) },
    ]

    const pts = corners.map((c) => {
      const cx = applyMirror ? -c.x : c.x
      return {
        x: anchor.x + cx * cosT - c.y * sinT,
        y: anchor.y + cx * sinT + c.y * cosT,
      }
    })

    return {
      minX: Math.min(...pts.map((p) => p.x)),
      minY: Math.min(...pts.map((p) => p.y)),
      maxX: Math.max(...pts.map((p) => p.x)),
      maxY: Math.max(...pts.map((p) => p.y)),
    }
  }

  const offX = -getH(baseBounds)
  const offY = -getV(baseBounds)

  let minX = Number.POSITIVE_INFINITY
  let minY = Number.POSITIVE_INFINITY
  let maxX = Number.NEGATIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY

  for (const seg of baseSegments) {
    for (const pt of [
      { x: seg.x1 + offX, y: -(seg.y1 + offY) },
      { x: seg.x2 + offX, y: -(seg.y2 + offY) },
    ]) {
      const px = applyMirror ? -pt.x : pt.x
      const rx = anchor.x + px * cosT - pt.y * sinT
      const ry = anchor.y + px * sinT + pt.y * cosT
      minX = Math.min(minX, rx - strokeRadius)
      maxX = Math.max(maxX, rx + strokeRadius)
      minY = Math.min(minY, ry - strokeRadius)
      maxY = Math.max(maxY, ry + strokeRadius)
    }
  }

  return { minX, minY, maxX, maxY }
}
