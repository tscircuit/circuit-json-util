export type Point = { x: number; y: number }

export type Circle = { kind: "circle"; x: number; y: number; radius: number }

export type Rect = {
  kind: "rect"
  centerX: number
  centerY: number
  width: number
  height: number
  rotationDegrees: number
}

export type Polygon = { kind: "polygon"; points: Point[] }

export type CopperShape = Circle | Rect | Polygon
