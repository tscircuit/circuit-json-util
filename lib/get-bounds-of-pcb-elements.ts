import type { AnyCircuitElement } from "circuit-json"

type Bounds = { minX: number; minY: number; maxX: number; maxY: number }

const getRotatedBoundingHalfExtents = (
  halfWidth: number,
  halfHeight: number,
  rotationDegrees: number,
): { halfX: number; halfY: number } => {
  const angle = (rotationDegrees * Math.PI) / 180
  const cos = Math.abs(Math.cos(angle))
  const sin = Math.abs(Math.sin(angle))
  return {
    halfX: halfWidth * cos + halfHeight * sin,
    halfY: halfWidth * sin + halfHeight * cos,
  }
}

const getBoundsFromCenterAndHalfExtents = (
  x: number,
  y: number,
  halfX: number,
  halfY: number,
): Bounds => ({
  minX: x - halfX,
  minY: y - halfY,
  maxX: x + halfX,
  maxY: y + halfY,
})

const unionBounds = (a: Bounds, b: Bounds): Bounds => ({
  minX: Math.min(a.minX, b.minX),
  minY: Math.min(a.minY, b.minY),
  maxX: Math.max(a.maxX, b.maxX),
  maxY: Math.max(a.maxY, b.maxY),
})

const getPlatedHoleBounds = (elm: AnyCircuitElement): Bounds | null => {
  if (elm.type !== "pcb_plated_hole") return null

  if (elm.shape === "circle") {
    return getBoundsFromCenterAndHalfExtents(
      elm.x,
      elm.y,
      elm.outer_diameter / 2,
      elm.outer_diameter / 2,
    )
  }

  if (elm.shape === "oval" || elm.shape === "pill") {
    const { halfX, halfY } = getRotatedBoundingHalfExtents(
      elm.outer_width / 2,
      elm.outer_height / 2,
      elm.ccw_rotation,
    )

    return getBoundsFromCenterAndHalfExtents(elm.x, elm.y, halfX, halfY)
  }

  if (
    elm.shape === "circular_hole_with_rect_pad" ||
    elm.shape === "pill_hole_with_rect_pad" ||
    elm.shape === "rotated_pill_hole_with_rect_pad"
  ) {
    const rectRotation =
      elm.shape === "rotated_pill_hole_with_rect_pad"
        ? elm.rect_ccw_rotation
        : elm.shape === "circular_hole_with_rect_pad"
          ? (elm.rect_ccw_rotation ?? 0)
          : 0

    const rectHalfExtents = getRotatedBoundingHalfExtents(
      elm.rect_pad_width / 2,
      elm.rect_pad_height / 2,
      rectRotation,
    )

    let bounds = getBoundsFromCenterAndHalfExtents(
      elm.x,
      elm.y,
      rectHalfExtents.halfX,
      rectHalfExtents.halfY,
    )

    if (elm.shape === "circular_hole_with_rect_pad") {
      const holeBounds = getBoundsFromCenterAndHalfExtents(
        elm.x + elm.hole_offset_x,
        elm.y + elm.hole_offset_y,
        elm.hole_diameter / 2,
        elm.hole_diameter / 2,
      )
      bounds = unionBounds(bounds, holeBounds)
    }

    if (elm.shape === "pill_hole_with_rect_pad") {
      const holeBounds = getBoundsFromCenterAndHalfExtents(
        elm.x + elm.hole_offset_x,
        elm.y + elm.hole_offset_y,
        elm.hole_width / 2,
        elm.hole_height / 2,
      )
      bounds = unionBounds(bounds, holeBounds)
    }

    if (elm.shape === "rotated_pill_hole_with_rect_pad") {
      const holeHalfExtents = getRotatedBoundingHalfExtents(
        elm.hole_width / 2,
        elm.hole_height / 2,
        elm.hole_ccw_rotation,
      )
      const holeBounds = getBoundsFromCenterAndHalfExtents(
        elm.x + elm.hole_offset_x,
        elm.y + elm.hole_offset_y,
        holeHalfExtents.halfX,
        holeHalfExtents.halfY,
      )
      bounds = unionBounds(bounds, holeBounds)
    }

    return bounds
  }

  if (elm.shape === "hole_with_polygon_pad") {
    const rotation = ((elm.ccw_rotation ?? 0) * Math.PI) / 180
    const cos = Math.cos(rotation)
    const sin = Math.sin(rotation)

    const transformedPoints = elm.pad_outline.map((point) => ({
      x: elm.x + point.x * cos - point.y * sin,
      y: elm.y + point.x * sin + point.y * cos,
    }))

    const firstPoint = transformedPoints[0]
    if (!firstPoint) return null

    let bounds: Bounds = {
      minX: firstPoint.x,
      minY: firstPoint.y,
      maxX: firstPoint.x,
      maxY: firstPoint.y,
    }

    for (const point of transformedPoints) {
      bounds.minX = Math.min(bounds.minX, point.x)
      bounds.minY = Math.min(bounds.minY, point.y)
      bounds.maxX = Math.max(bounds.maxX, point.x)
      bounds.maxY = Math.max(bounds.maxY, point.y)
    }

    return bounds
  }

  return null
}

export const getBoundsOfPcbElements = (
  elements: AnyCircuitElement[],
): { minX: number; minY: number; maxX: number; maxY: number } => {
  let minX = Number.POSITIVE_INFINITY
  let minY = Number.POSITIVE_INFINITY
  let maxX = Number.NEGATIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY

  for (const elm of elements) {
    if (!elm.type.startsWith("pcb_")) continue

    const platedHoleBounds = getPlatedHoleBounds(elm)
    if (platedHoleBounds) {
      minX = Math.min(minX, platedHoleBounds.minX)
      minY = Math.min(minY, platedHoleBounds.minY)
      maxX = Math.max(maxX, platedHoleBounds.maxX)
      maxY = Math.max(maxY, platedHoleBounds.maxY)
      continue
    }

    // Handle polygon-shaped SMT pads with points array
    if (
      elm.type === "pcb_smtpad" &&
      elm.shape === "polygon" &&
      Array.isArray(elm.points)
    ) {
      for (const point of elm.points) {
        minX = Math.min(minX, point.x)
        minY = Math.min(minY, point.y)
        maxX = Math.max(maxX, point.x)
        maxY = Math.max(maxY, point.y)
      }
      continue
    }

    let centerX: number | undefined
    let centerY: number | undefined

    let width: number | undefined
    let height: number | undefined

    if ("x" in elm && "y" in elm) {
      centerX = Number((elm as any).x)
      centerY = Number((elm as any).y)
    }

    if ("outer_diameter" in elm) {
      width = Number((elm as any).outer_diameter)
      height = Number((elm as any).outer_diameter)
    }

    if ("width" in elm) {
      width = Number((elm as any).width)
    }

    if ("height" in elm) {
      height = Number((elm as any).height)
    }

    if ("center" in elm) {
      // @ts-ignore
      centerX = elm.center.x
      // @ts-ignore
      centerY = elm.center.y
    }

    if (centerX !== undefined && centerY !== undefined) {
      minX = Math.min(minX, centerX)
      minY = Math.min(minY, centerY)
      maxX = Math.max(maxX, centerX)
      maxY = Math.max(maxY, centerY)

      if (width !== undefined && height !== undefined) {
        minX = Math.min(minX, centerX - width / 2)
        minY = Math.min(minY, centerY - height / 2)
        maxX = Math.max(maxX, centerX + width / 2)
        maxY = Math.max(maxY, centerY + height / 2)
      }

      if ("radius" in elm) {
        minX = Math.min(minX, centerX - elm.radius)
        minY = Math.min(minY, centerY - elm.radius)
        maxX = Math.max(maxX, centerX + elm.radius)
        maxY = Math.max(maxY, centerY + elm.radius)
      }
    } else if (elm.type === "pcb_trace") {
      for (const point of elm.route) {
        // TODO add trace thickness support
        minX = Math.min(minX, point.x)
        minY = Math.min(minY, point.y)
        maxX = Math.max(maxX, point.x)
        maxY = Math.max(maxY, point.y)
      }
    }
  }

  return { minX, minY, maxX, maxY }
}
