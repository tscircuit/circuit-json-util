import { expect, test } from "bun:test"
import {
  schematic_arc,
  schematic_circle,
  schematic_path,
  schematic_rect,
} from "circuit-json"
import { compose, rotateDEG, scale, translate } from "transformation-matrix"
import { transformSchematicElement } from "../index"

test("schematic paths receive translation without a rotation", () => {
  const path = schematic_path.parse({
    type: "schematic_path",
    points: [
      { x: 1, y: 2 },
      { x: 3, y: 4 },
    ],
  })
  transformSchematicElement(path, translate(10, 20))
  expect(path.points).toEqual([
    { x: 11, y: 22 },
    { x: 13, y: 24 },
  ])
})

test("schematic paths follow half-turn placement", () => {
  const path = schematic_path.parse({
    type: "schematic_path",
    points: [{ x: 1, y: 2 }],
  })
  transformSchematicElement(path, compose(translate(10, 20), rotateDEG(180)))
  expect(path.points[0]!.x).toBeCloseTo(9)
  expect(path.points[0]!.y).toBeCloseTo(18)
})

test("schematic path vertices follow rotation and translation", () => {
  const path = schematic_path.parse({
    type: "schematic_path",
    points: [
      { x: 1, y: 2 },
      { x: 3, y: 4 },
    ],
  })
  transformSchematicElement(path, compose(translate(10, 20), rotateDEG(90)))
  expect(path.points[0]!.x).toBeCloseTo(8)
  expect(path.points[0]!.y).toBeCloseTo(21)
  expect(path.points[1]!.x).toBeCloseTo(6)
  expect(path.points[1]!.y).toBeCloseTo(23)
})

test("schematic rectangles rotate their centers and local orientation", () => {
  const rect = schematic_rect.parse({
    type: "schematic_rect",
    center: { x: 1, y: 2 },
    width: 4,
    height: 2,
    rotation: 30,
  })
  transformSchematicElement(rect, compose(translate(10, 20), rotateDEG(90)))
  expect(rect.center.x).toBeCloseTo(8)
  expect(rect.center.y).toBeCloseTo(21)
  expect(rect.rotation).toBeCloseTo(-60)
  expect(rect.width).toBeCloseTo(4)
  expect(rect.height).toBeCloseTo(2)
})

test("schematic circles move and preserve radius under rigid placement", () => {
  const circle = schematic_circle.parse({
    type: "schematic_circle",
    center: { x: 1, y: 2 },
    radius: 2,
  })
  transformSchematicElement(circle, compose(translate(10, 20), rotateDEG(90)))
  expect(circle.center.x).toBeCloseTo(8)
  expect(circle.center.y).toBeCloseTo(21)
  expect(circle.radius).toBeCloseTo(2)
})

test("schematic arc endpoints rotate with their center", () => {
  const arc = schematic_arc.parse({
    type: "schematic_arc",
    center: { x: 1, y: 2 },
    radius: 2,
    start_angle_degrees: 0,
    end_angle_degrees: 90,
    direction: "clockwise",
  })
  transformSchematicElement(arc, compose(translate(10, 20), rotateDEG(90)))
  expect(arc.center.x).toBeCloseTo(8)
  expect(arc.center.y).toBeCloseTo(21)
  expect(arc.start_angle_degrees).toBeCloseTo(-90)
  expect(arc.end_angle_degrees).toBeCloseTo(0)
  expect(arc.direction).toBe("clockwise")
})

test("reflected schematic arcs reverse direction and preserve endpoint geometry", () => {
  const arc = schematic_arc.parse({
    type: "schematic_arc",
    center: { x: 1, y: 2 },
    radius: 2,
    start_angle_degrees: 30,
    end_angle_degrees: 150,
    direction: "clockwise",
  })
  transformSchematicElement(arc, scale(-1, 1))
  expect(arc.center).toEqual({ x: -1, y: 2 })
  expect(arc.start_angle_degrees).toBeCloseTo(150)
  expect(arc.end_angle_degrees).toBeCloseTo(30)
  expect(arc.direction).toBe("counterclockwise")
})

test("uniform scaling changes schematic circle radius", () => {
  const circle = schematic_circle.parse({
    type: "schematic_circle",
    center: { x: 1, y: 2 },
    radius: 2,
  })
  transformSchematicElement(circle, scale(3))
  expect(circle.center).toEqual({ x: 3, y: 6 })
  expect(circle.radius).toBeCloseTo(6)
})

test("schematic arc transforms preserve a full turn", () => {
  const arc = schematic_arc.parse({
    type: "schematic_arc",
    center: { x: 1, y: 2 },
    radius: 2,
    start_angle_degrees: 0,
    end_angle_degrees: 360,
  })
  transformSchematicElement(arc, rotateDEG(90))
  expect(arc.start_angle_degrees).toBeCloseTo(-90)
  expect(arc.end_angle_degrees).toBeCloseTo(270)
})
