import type { AnyCircuitElement } from "circuit-json"

export interface PcbBounds {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

const mergeBounds = (
  currentBounds: PcbBounds,
  nextBounds: PcbBounds,
): PcbBounds => ({
  minX: Math.min(currentBounds.minX, nextBounds.minX),
  minY: Math.min(currentBounds.minY, nextBounds.minY),
  maxX: Math.max(currentBounds.maxX, nextBounds.maxX),
  maxY: Math.max(currentBounds.maxY, nextBounds.maxY),
})

const getCircleBounds = (x: number, y: number, diameter: number) => {
  const radius = diameter / 2
  return {
    minX: x - radius,
    minY: y - radius,
    maxX: x + radius,
    maxY: y + radius,
  }
}

const getRotatedRectBounds = (
  x: number,
  y: number,
  width: number,
  height: number,
  rotationDegrees: number,
) => {
  const halfWidth = width / 2
  const halfHeight = height / 2
  const theta = (rotationDegrees * Math.PI) / 180
  const cosTheta = Math.cos(theta)
  const sinTheta = Math.sin(theta)

  const corners = [
    { x: -halfWidth, y: -halfHeight },
    { x: halfWidth, y: -halfHeight },
    { x: halfWidth, y: halfHeight },
    { x: -halfWidth, y: halfHeight },
  ].map((corner) => ({
    x: x + corner.x * cosTheta - corner.y * sinTheta,
    y: y + corner.x * sinTheta + corner.y * cosTheta,
  }))

  return {
    minX: Math.min(...corners.map((corner) => corner.x)),
    minY: Math.min(...corners.map((corner) => corner.y)),
    maxX: Math.max(...corners.map((corner) => corner.x)),
    maxY: Math.max(...corners.map((corner) => corner.y)),
  }
}

const getRotatedOvalBounds = (
  x: number,
  y: number,
  width: number,
  height: number,
  rotationDegrees: number,
) => {
  const radiusX = width / 2
  const radiusY = height / 2
  const theta = (rotationDegrees * Math.PI) / 180
  const cosTheta = Math.cos(theta)
  const sinTheta = Math.sin(theta)
  const halfWidth = Math.hypot(radiusX * cosTheta, radiusY * sinTheta)
  const halfHeight = Math.hypot(radiusX * sinTheta, radiusY * cosTheta)

  return {
    minX: x - halfWidth,
    minY: y - halfHeight,
    maxX: x + halfWidth,
    maxY: y + halfHeight,
  }
}

const getRotatedPillBounds = (
  x: number,
  y: number,
  width: number,
  height: number,
  rotationDegrees: number,
) => {
  const radius = Math.min(width, height) / 2
  const halfLineLength = Math.max(width, height) / 2 - radius
  const theta = (rotationDegrees * Math.PI) / 180
  const axis =
    width >= height ? { x: halfLineLength, y: 0 } : { x: 0, y: halfLineLength }
  const rotatedAxis = {
    x: axis.x * Math.cos(theta) - axis.y * Math.sin(theta),
    y: axis.x * Math.sin(theta) + axis.y * Math.cos(theta),
  }
  const halfWidth = Math.abs(rotatedAxis.x) + radius
  const halfHeight = Math.abs(rotatedAxis.y) + radius

  return {
    minX: x - halfWidth,
    minY: y - halfHeight,
    maxX: x + halfWidth,
    maxY: y + halfHeight,
  }
}

const getBoundsFromPoints = (
  points: Array<{ x: number; y: number }>,
): PcbBounds | null => {
  if (points.length === 0) return null

  return {
    minX: Math.min(...points.map((point) => point.x)),
    minY: Math.min(...points.map((point) => point.y)),
    maxX: Math.max(...points.map((point) => point.x)),
    maxY: Math.max(...points.map((point) => point.y)),
  }
}

const getRoutePoints = (route: unknown): Array<{ x: number; y: number }> => {
  if (!Array.isArray(route)) return []

  return route.flatMap((point): Array<{ x: number; y: number }> => {
    if (!point || typeof point !== "object") return []
    if (
      "x" in point &&
      "y" in point &&
      typeof point.x === "number" &&
      typeof point.y === "number"
    ) {
      return [{ x: point.x, y: point.y }]
    }

    if ("start" in point && "end" in point) {
      const positions = [point.start, point.end]
      return positions.filter(
        (position): position is { x: number; y: number } =>
          Boolean(
            position &&
              typeof position === "object" &&
              "x" in position &&
              "y" in position &&
              typeof position.x === "number" &&
              typeof position.y === "number",
          ),
      )
    }

    return []
  })
}

/** Returns the axis-aligned bounds of one drawable PCB element. */
export const getPcbElementBounds = (
  elm: AnyCircuitElement,
): PcbBounds | null => {
  if (!elm.type.startsWith("pcb_")) return null

  if (
    elm.type === "pcb_smtpad" &&
    elm.shape === "polygon" &&
    Array.isArray(elm.points)
  ) {
    return getBoundsFromPoints(elm.points)
  }

  if (elm.type === "pcb_hole" && elm.hole_shape === "circle") {
    return getCircleBounds(elm.x, elm.y, elm.hole_diameter)
  }

  if (elm.type === "pcb_plated_hole") {
    let platedHoleBounds: PcbBounds | undefined

    if ("outer_diameter" in elm && typeof elm.outer_diameter === "number") {
      platedHoleBounds = getCircleBounds(elm.x, elm.y, elm.outer_diameter)
    } else if (
      "hole_diameter" in elm &&
      typeof elm.hole_diameter === "number"
    ) {
      platedHoleBounds = getCircleBounds(elm.x, elm.y, elm.hole_diameter)
    }

    if (
      (elm.shape === "oval" || elm.shape === "pill") &&
      typeof elm.outer_width === "number" &&
      typeof elm.outer_height === "number"
    ) {
      const getOuterBounds =
        elm.shape === "pill" ? getRotatedPillBounds : getRotatedOvalBounds
      platedHoleBounds = getOuterBounds(
        elm.x,
        elm.y,
        elm.outer_width,
        elm.outer_height,
        elm.ccw_rotation ?? 0,
      )
    }

    if (
      elm.shape === "hole_with_polygon_pad" &&
      Array.isArray(elm.pad_outline) &&
      elm.pad_outline.length > 0
    ) {
      // pad_outline is relative to the hole position and rotated by ccw_rotation
      const rotation = ((elm.ccw_rotation ?? 0) * Math.PI) / 180
      const cos = Math.cos(rotation)
      const sin = Math.sin(rotation)
      const outlineBounds = getBoundsFromPoints(
        elm.pad_outline.map((point) => ({
          x: elm.x + point.x * cos - point.y * sin,
          y: elm.y + point.x * sin + point.y * cos,
        })),
      )
      if (outlineBounds) {
        platedHoleBounds = platedHoleBounds
          ? mergeBounds(platedHoleBounds, outlineBounds)
          : outlineBounds
      }
    }

    if (
      "rect_pad_width" in elm &&
      typeof elm.rect_pad_width === "number" &&
      "rect_pad_height" in elm &&
      typeof elm.rect_pad_height === "number"
    ) {
      const rectBounds = getRotatedRectBounds(
        elm.x,
        elm.y,
        elm.rect_pad_width,
        elm.rect_pad_height,
        "rect_ccw_rotation" in elm ? (elm.rect_ccw_rotation ?? 0) : 0,
      )
      platedHoleBounds = platedHoleBounds
        ? mergeBounds(platedHoleBounds, rectBounds)
        : rectBounds
    }

    if ("hole_diameter" in elm && typeof elm.hole_diameter === "number") {
      const drillBounds = getCircleBounds(
        elm.x +
          ("hole_offset_x" in elm ? ((elm.hole_offset_x as number) ?? 0) : 0),
        elm.y +
          ("hole_offset_y" in elm ? ((elm.hole_offset_y as number) ?? 0) : 0),
        elm.hole_diameter,
      )
      platedHoleBounds = platedHoleBounds
        ? mergeBounds(platedHoleBounds, drillBounds)
        : drillBounds
    }

    if (platedHoleBounds) return platedHoleBounds
  }

  const elementRecord = elm as unknown as Record<string, unknown>
  const routeBounds = getBoundsFromPoints(getRoutePoints(elementRecord.route))
  if (routeBounds) return routeBounds

  const outlineBounds = getBoundsFromPoints(
    getRoutePoints(elementRecord.outline),
  )
  if (outlineBounds) return outlineBounds

  const pointsBounds = getBoundsFromPoints(getRoutePoints(elementRecord.points))
  if (pointsBounds) return pointsBounds

  let centerX: number | undefined
  let centerY: number | undefined

  let width: number | undefined
  let height: number | undefined

  if ("x" in elm && "y" in elm) {
    centerX = Number(elm.x)
    centerY = Number(elm.y)
  }

  if ("outer_diameter" in elm) {
    width = Number(elm.outer_diameter)
    height = Number(elm.outer_diameter)
  }

  if ("width" in elm) {
    width = Number(elm.width)
  }

  if ("height" in elm) {
    height = Number(elm.height)
  }

  if (
    "center" in elm &&
    elm.center &&
    typeof elm.center === "object" &&
    "x" in elm.center &&
    "y" in elm.center
  ) {
    centerX = Number(elm.center.x)
    centerY = Number(elm.center.y)
  }

  let rotation = 0
  if ("rotation" in elm && typeof elm.rotation === "number") {
    rotation = elm.rotation
  }
  if ("ccw_rotation" in elm && typeof elm.ccw_rotation === "number") {
    rotation = elm.ccw_rotation
  }

  if (centerX !== undefined && centerY !== undefined) {
    if (width !== undefined && height !== undefined) {
      return rotation
        ? getRotatedRectBounds(centerX, centerY, width, height, rotation)
        : {
            minX: centerX - width / 2,
            minY: centerY - height / 2,
            maxX: centerX + width / 2,
            maxY: centerY + height / 2,
          }
    }

    if ("radius" in elm && typeof elm.radius === "number") {
      return getCircleBounds(centerX, centerY, elm.radius * 2)
    }

    return { minX: centerX, minY: centerY, maxX: centerX, maxY: centerY }
  }

  const anchoredPoint = [elementRecord.anchor_position, elementRecord.position]
    .filter((position): position is { x: number; y: number } =>
      Boolean(
        position &&
          typeof position === "object" &&
          "x" in position &&
          "y" in position &&
          typeof position.x === "number" &&
          typeof position.y === "number",
      ),
    )
    .at(0)

  return anchoredPoint
    ? {
        minX: anchoredPoint.x,
        minY: anchoredPoint.y,
        maxX: anchoredPoint.x,
        maxY: anchoredPoint.y,
      }
    : null
}

export const getBoundsOfPcbElements = (
  elements: AnyCircuitElement[],
): PcbBounds => {
  let bounds: PcbBounds = {
    minX: Number.POSITIVE_INFINITY,
    minY: Number.POSITIVE_INFINITY,
    maxX: Number.NEGATIVE_INFINITY,
    maxY: Number.NEGATIVE_INFINITY,
  }

  for (const element of elements) {
    const elementBounds = getPcbElementBounds(element)
    if (elementBounds) bounds = mergeBounds(bounds, elementBounds)
  }

  return bounds
}

/** Returns PCB elements whose axis-aligned bounds intersect the given bounds. */
export const getPcbElementsWithinBounds = (
  elements: AnyCircuitElement[],
  bounds: PcbBounds,
): AnyCircuitElement[] =>
  elements.filter((element) => {
    const elementBounds = getPcbElementBounds(element)
    if (!elementBounds) return false

    return (
      elementBounds.minX <= bounds.maxX &&
      elementBounds.maxX >= bounds.minX &&
      elementBounds.minY <= bounds.maxY &&
      elementBounds.maxY >= bounds.minY
    )
  })
