import { rotatePoint, toRadians } from "./geometry"
import type { CopperShape, Point } from "./types"

export const getRotatedTranslatedPoints = ({
  points,
  center,
  rotationDegrees,
}: {
  points: Point[]
  center: Point
  rotationDegrees: number
}): Point[] => {
  const angleRadians = toRadians(rotationDegrees)
  return points.map((point) => {
    const rotatedPoint = rotatePoint(point, angleRadians)
    return {
      x: center.x + rotatedPoint.x,
      y: center.y + rotatedPoint.y,
    }
  })
}

export const getRoundedRectShapes = ({
  center,
  width,
  height,
  radius,
  rotationDegrees,
}: {
  center: Point
  width: number
  height: number
  radius: number
  rotationDegrees: number
}): CopperShape[] => {
  const cornerRadius = Math.max(0, Math.min(radius, width / 2, height / 2))
  if (cornerRadius === 0) {
    return [
      {
        kind: "rect",
        centerX: center.x,
        centerY: center.y,
        width,
        height,
        rotationDegrees,
      },
    ]
  }

  const shapes: CopperShape[] = []
  if (width > cornerRadius * 2) {
    shapes.push({
      kind: "rect",
      centerX: center.x,
      centerY: center.y,
      width: width - cornerRadius * 2,
      height,
      rotationDegrees,
    })
  }
  if (height > cornerRadius * 2) {
    shapes.push({
      kind: "rect",
      centerX: center.x,
      centerY: center.y,
      width,
      height: height - cornerRadius * 2,
      rotationDegrees,
    })
  }

  const cornerCenters = getRotatedTranslatedPoints({
    points: [
      { x: -width / 2 + cornerRadius, y: -height / 2 + cornerRadius },
      { x: width / 2 - cornerRadius, y: -height / 2 + cornerRadius },
      { x: width / 2 - cornerRadius, y: height / 2 - cornerRadius },
      { x: -width / 2 + cornerRadius, y: height / 2 - cornerRadius },
    ],
    center,
    rotationDegrees,
  })
  for (const cornerCenter of cornerCenters) {
    shapes.push({
      kind: "circle",
      x: cornerCenter.x,
      y: cornerCenter.y,
      radius: cornerRadius,
    })
  }
  return shapes
}
