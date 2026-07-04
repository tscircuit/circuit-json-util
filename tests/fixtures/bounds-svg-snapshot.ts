import { getSvgFromGraphicsObject } from "graphics-debug"

// Draws the computed bounds box (red) and the rotated component (blue) so a
// reviewer can see whether the bounds actually enclose the component. Uses
// graphics-debug's builtin rect rotation (ccwRotationDegrees) rather than
// hand-rolled corner math.
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

  return getSvgFromGraphicsObject({
    rects: [
      {
        center: {
          x: (bounds.minX + bounds.maxX) / 2,
          y: (bounds.minY + bounds.maxY) / 2,
        },
        width: bounds.maxX - bounds.minX,
        height: bounds.maxY - bounds.minY,
        fill: "#fee2e2",
        stroke: "#dc2626",
        label: "bounds",
      },
      {
        center: component.center,
        width: component.width,
        height: component.height,
        ccwRotationDegrees: component.rotation,
        fill: "#93c5fd",
        stroke: "#1d4ed8",
        label: "component",
      },
    ],
  })
}
