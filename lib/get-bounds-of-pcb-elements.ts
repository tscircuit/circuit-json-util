import type { AnyCircuitElement } from "circuit-json"

const mergeBounds = (
  currentBounds: {
    minX: number
    minY: number
    maxX: number
    maxY: number
  },
  nextBounds: {
    minX: number
    minY: number
    maxX: number
    maxY: number
  },
) => ({
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

export const getBoundsOfPcbElements = (
  elements: AnyCircuitElement[],
): { minX: number; minY: number; maxX: number; maxY: number } => {
  let minX = Number.POSITIVE_INFINITY
  let minY = Number.POSITIVE_INFINITY
  let maxX = Number.NEGATIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY

  for (const elm of elements) {
    if (!elm.type.startsWith("pcb_")) continue

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

    if (elm.type === "pcb_hole" && elm.hole_shape === "circle") {
      const holeBounds = getCircleBounds(elm.x, elm.y, elm.hole_diameter)
      minX = Math.min(minX, holeBounds.minX)
      minY = Math.min(minY, holeBounds.minY)
      maxX = Math.max(maxX, holeBounds.maxX)
      maxY = Math.max(maxY, holeBounds.maxY)
      continue
    }

    if (elm.type === "pcb_plated_hole") {
      let platedHoleBounds:
        | {
            minX: number
            minY: number
            maxX: number
            maxY: number
          }
        | undefined

      if ("outer_diameter" in elm && typeof elm.outer_diameter === "number") {
        platedHoleBounds = getCircleBounds(elm.x, elm.y, elm.outer_diameter)
      } else if (
        "hole_diameter" in elm &&
        typeof elm.hole_diameter === "number"
      ) {
        platedHoleBounds = getCircleBounds(elm.x, elm.y, elm.hole_diameter)
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

      if (platedHoleBounds) {
        minX = Math.min(minX, platedHoleBounds.minX)
        minY = Math.min(minY, platedHoleBounds.minY)
        maxX = Math.max(maxX, platedHoleBounds.maxX)
        maxY = Math.max(maxY, platedHoleBounds.maxY)
        continue
      }
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
    } else if (elm.type === "pcb_courtyard_rect") {
      const halfW = elm.width / 2
      const halfH = elm.height / 2
      minX = Math.min(minX, elm.center.x - halfW)
      minY = Math.min(minY, elm.center.y - halfH)
      maxX = Math.max(maxX, elm.center.x + halfW)
      maxY = Math.max(maxY, elm.center.y + halfH)
    } else if (elm.type === "pcb_courtyard_circle") {
      minX = Math.min(minX, elm.center.x - elm.radius)
      minY = Math.min(minY, elm.center.y - elm.radius)
      maxX = Math.max(maxX, elm.center.x + elm.radius)
      maxY = Math.max(maxY, elm.center.y + elm.radius)
    } else if (elm.type === "pcb_courtyard_outline") {
      for (const point of elm.outline) {
        minX = Math.min(minX, point.x)
        minY = Math.min(minY, point.y)
        maxX = Math.max(maxX, point.x)
        maxY = Math.max(maxY, point.y)
      }
    } else if (elm.type === "pcb_courtyard_polygon") {
      for (const point of elm.points) {
        minX = Math.min(minX, point.x)
        minY = Math.min(minY, point.y)
        maxX = Math.max(maxX, point.x)
        maxY = Math.max(maxY, point.y)
      }
    }
  }

  return { minX, minY, maxX, maxY }
}
