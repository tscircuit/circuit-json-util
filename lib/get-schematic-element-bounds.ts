import type {
  SchematicComponent,
  SchematicNetLabel,
  SchematicTrace,
} from "circuit-json"

export type SchematicElementWithBounds =
  | SchematicComponent
  | SchematicNetLabel
  | SchematicTrace

export interface SchematicElementBounds {
  minX: number
  minY: number
  maxX: number
  maxY: number
  width: number
  height: number
  center: {
    x: number
    y: number
  }
}

const SCHEMATIC_TRACE_WIDTH = 0.1
const SCHEMATIC_NET_LABEL_FONT_SIZE = 0.18
const SCHEMATIC_NET_LABEL_HEIGHT = 0.2

const createBounds = ({
  minX,
  minY,
  maxX,
  maxY,
}: {
  minX: number
  minY: number
  maxX: number
  maxY: number
}): SchematicElementBounds => {
  const width = maxX - minX
  const height = maxY - minY

  return {
    minX,
    minY,
    maxX,
    maxY,
    width,
    height,
    center: {
      x: minX + width / 2,
      y: minY + height / 2,
    },
  }
}

const getSchematicNetLabelTextWidth = (text: string): number => {
  const characterWidth = 0.12 * (SCHEMATIC_NET_LABEL_FONT_SIZE / 0.18)
  const horizontalPadding = 0.12 * (SCHEMATIC_NET_LABEL_FONT_SIZE / 0.18)

  return text.length * characterWidth + horizontalPadding
}

const getSchematicNetLabelBounds = (
  netLabel: SchematicNetLabel,
): SchematicElementBounds => {
  const labelLength = getSchematicNetLabelTextWidth(netLabel.text)
  const anchor = netLabel.anchor_position

  if (!anchor) {
    const isVertical =
      netLabel.anchor_side === "top" || netLabel.anchor_side === "bottom"
    const width = isVertical ? SCHEMATIC_NET_LABEL_HEIGHT : labelLength
    const height = isVertical ? labelLength : SCHEMATIC_NET_LABEL_HEIGHT

    return createBounds({
      minX: netLabel.center.x - width / 2,
      minY: netLabel.center.y - height / 2,
      maxX: netLabel.center.x + width / 2,
      maxY: netLabel.center.y + height / 2,
    })
  }

  switch (netLabel.anchor_side) {
    case "left":
      return createBounds({
        minX: anchor.x,
        minY: anchor.y - SCHEMATIC_NET_LABEL_HEIGHT / 2,
        maxX: anchor.x + labelLength,
        maxY: anchor.y + SCHEMATIC_NET_LABEL_HEIGHT / 2,
      })
    case "right":
      return createBounds({
        minX: anchor.x - labelLength,
        minY: anchor.y - SCHEMATIC_NET_LABEL_HEIGHT / 2,
        maxX: anchor.x,
        maxY: anchor.y + SCHEMATIC_NET_LABEL_HEIGHT / 2,
      })
    case "top":
      return createBounds({
        minX: anchor.x - SCHEMATIC_NET_LABEL_HEIGHT / 2,
        minY: anchor.y - labelLength,
        maxX: anchor.x + SCHEMATIC_NET_LABEL_HEIGHT / 2,
        maxY: anchor.y,
      })
    case "bottom":
      return createBounds({
        minX: anchor.x - SCHEMATIC_NET_LABEL_HEIGHT / 2,
        minY: anchor.y,
        maxX: anchor.x + SCHEMATIC_NET_LABEL_HEIGHT / 2,
        maxY: anchor.y + labelLength,
      })
  }
}

/**
 * Returns the axis-aligned bounds of a schematic component, net label, or
 * trace. Trace bounds include the rendered trace width. An empty trace has no
 * drawable geometry and returns null.
 */
export const getSchematicElementBounds = (
  element: SchematicElementWithBounds,
): SchematicElementBounds | null => {
  if (element.type === "schematic_component") {
    return createBounds({
      minX: element.center.x - element.size.width / 2,
      minY: element.center.y - element.size.height / 2,
      maxX: element.center.x + element.size.width / 2,
      maxY: element.center.y + element.size.height / 2,
    })
  }

  if (element.type === "schematic_net_label") {
    return getSchematicNetLabelBounds(element)
  }

  if (element.edges.length === 0 && element.junctions.length === 0) return null

  let minX = Number.POSITIVE_INFINITY
  let minY = Number.POSITIVE_INFINITY
  let maxX = Number.NEGATIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY
  const includePoint = (point: { x: number; y: number }) => {
    minX = Math.min(minX, point.x)
    minY = Math.min(minY, point.y)
    maxX = Math.max(maxX, point.x)
    maxY = Math.max(maxY, point.y)
  }

  // Passing all coordinates as function arguments exceeds some JavaScript
  // engines' argument limits for long traces. Accumulate bounds instead.
  for (const edge of element.edges) {
    includePoint(edge.from)
    includePoint(edge.to)
  }
  for (const junction of element.junctions) includePoint(junction)

  const halfTraceWidth = SCHEMATIC_TRACE_WIDTH / 2
  return createBounds({
    minX: minX - halfTraceWidth,
    minY: minY - halfTraceWidth,
    maxX: maxX + halfTraceWidth,
    maxY: maxY + halfTraceWidth,
  })
}
