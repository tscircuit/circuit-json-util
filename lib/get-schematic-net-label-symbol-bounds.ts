import type { SchematicNetLabel } from "circuit-json"
import { type SchSymbol, symbols } from "schematic-symbols"
import { getSchematicSymbolLabelTextWidth } from "./get-schematic-symbol-label-text-width"

interface Bounds {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

/**
 * Bounds of a named net label's symbol primitives, excluding strokes and text.
 * Keep the registry shared with renderers through the schematic-symbols peer.
 */
export const getSchematicNetLabelSymbolBounds = (
  label: SchematicNetLabel & { display_superscript?: string },
): Bounds | null => {
  const name = label.symbol_name
  if (!name || !label.text || !Object.hasOwn(symbols, name)) return null
  const symbol = symbols[name as keyof typeof symbols] as SchSymbol | undefined
  if (!symbol) return null

  let minX = Number.POSITIVE_INFINITY
  let minY = Number.POSITIVE_INFINITY
  let maxX = Number.NEGATIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY
  let pathMinX = Number.POSITIVE_INFINITY
  let pathMinY = Number.POSITIVE_INFINITY
  let pathMaxY = Number.NEGATIVE_INFINITY
  const include = (x: number, y: number) => {
    minX = Math.min(minX, x)
    minY = Math.min(minY, y)
    maxX = Math.max(maxX, x)
    maxY = Math.max(maxY, y)
  }

  for (const primitive of symbol.primitives) {
    if (primitive.type === "path") {
      for (const point of primitive.points) {
        include(point.x, point.y)
        pathMinX = Math.min(pathMinX, point.x)
        pathMinY = Math.min(pathMinY, point.y)
        pathMaxY = Math.max(pathMaxY, point.y)
      }
    } else if (primitive.type === "circle") {
      include(primitive.x - primitive.radius, primitive.y - primitive.radius)
      include(primitive.x + primitive.radius, primitive.y + primitive.radius)
    } else if (primitive.type === "box") {
      // The symbol renderer places the box at its top-left screen coordinate.
      include(primitive.x, primitive.y)
      include(primitive.x + primitive.width, primitive.y - primitive.height)
    }
  }
  if (!Number.isFinite(minX)) return null

  // Symbol names already encode orientation. anchor_side only affects the
  // inferred connection position; it must not rotate the symbol a second time.
  const connection = symbol.ports[0] ?? {
    x: pathMinX,
    y: (pathMinY + pathMaxY) / 2,
  }
  if (!Number.isFinite(connection.x) || !Number.isFinite(connection.y))
    return null

  let anchor = label.anchor_position
  if (!anchor) {
    const text = label.text.startsWith("N_") ? label.text.slice(2) : label.text
    const textWidth = getSchematicSymbolLabelTextWidth(text)
    const superscriptWidth = label.display_superscript
      ? 0.08 +
        getSchematicSymbolLabelTextWidth(label.display_superscript) * 0.65
      : 0
    const halfLength =
      ((textWidth + superscriptWidth + 0.9 + 0.06 * text.length) * 0.18) / 2
    const dx =
      label.anchor_side === "left" ? 1 : label.anchor_side === "right" ? -1 : 0
    const dy =
      label.anchor_side === "bottom" ? 1 : label.anchor_side === "top" ? -1 : 0
    anchor = {
      x: label.center.x - dx * halfLength,
      y: label.center.y - dy * halfLength,
    }
  }

  const dx = anchor.x - connection.x
  const dy = anchor.y - connection.y
  return { minX: minX + dx, minY: minY + dy, maxX: maxX + dx, maxY: maxY + dy }
}
