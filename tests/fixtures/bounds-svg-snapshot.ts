import { getSvgFromGraphicsObject } from "graphics-debug"

const rotate = (params: {
  x: number
  y: number
  ccwRotationDegrees: number
}) => {
  const { x, y, ccwRotationDegrees } = params
  const t = (ccwRotationDegrees * Math.PI) / 180
  const c = Math.cos(t)
  const s = Math.sin(t)
  return { x: x * c - y * s, y: x * s + y * c }
}

// Draws the rotated component outline (blue) and the computed bounds box (red)
// so a reviewer can see whether the bounds actually enclose the component.
// Rendered with graphics-debug, the standard tscircuit way to snapshot debug
// geometry.
export const renderBoundsSvg = (params: {
  component: {
    center: { x: number; y: number }
    width: number
    height: number
    rotation: number
  }
  bounds: { minX: number; minY: number; maxX: number; maxY: number }
}) => {
  const { component, bounds } = params
  const { center, width, height, rotation } = component

  const componentOutline = (
    [
      [-width / 2, -height / 2],
      [width / 2, -height / 2],
      [width / 2, height / 2],
      [-width / 2, height / 2],
    ] as const
  ).map(([x, y]) => {
    const r = rotate({ x, y, ccwRotationDegrees: rotation })
    return { x: center.x + r.x, y: center.y + r.y }
  })

  const boundsOutline = [
    { x: bounds.minX, y: bounds.minY },
    { x: bounds.maxX, y: bounds.minY },
    { x: bounds.maxX, y: bounds.maxY },
    { x: bounds.minX, y: bounds.maxY },
  ]

  return getSvgFromGraphicsObject({
    lines: [
      {
        points: [...boundsOutline, boundsOutline[0]!],
        strokeColor: "#dc2626",
        strokeWidth: 2,
        label: "bounds",
      },
      {
        points: [...componentOutline, componentOutline[0]!],
        strokeColor: "#1d4ed8",
        strokeWidth: 2,
        label: "component",
      },
    ],
  })
}
