import { expect, test } from "bun:test"
import {
  schematic_arc,
  schematic_circle,
  schematic_line,
  schematic_path,
  schematic_rect,
} from "circuit-json"
import { convertCircuitJsonToSchematicSvg } from "circuit-to-svg"
import { compose, rotateDEG, translate } from "transformation-matrix"
import { transformSchematicElements } from "../index"

test("mixed schematic primitives stay together after rotation and translation", () => {
  const symbol = [
    schematic_line.parse({
      type: "schematic_line",
      schematic_line_id: "left_stem",
      x1: -0.7,
      y1: 0,
      x2: -0.5,
      y2: 0,
    }),
    schematic_line.parse({
      type: "schematic_line",
      schematic_line_id: "right_stem",
      x1: 0.7,
      y1: 0,
      x2: 0.5,
      y2: 0,
    }),
    schematic_path.parse({
      type: "schematic_path",
      schematic_path_id: "body",
      points: [
        { x: -0.5, y: 0 },
        { x: 0.5, y: 0 },
      ],
    }),
    schematic_rect.parse({
      type: "schematic_rect",
      schematic_rect_id: "rect",
      center: { x: -0.2, y: 0 },
      width: 0.3,
      height: 0.2,
    }),
    schematic_circle.parse({
      type: "schematic_circle",
      schematic_circle_id: "circle",
      center: { x: 0.2, y: 0 },
      radius: 0.12,
    }),
    schematic_arc.parse({
      type: "schematic_arc",
      schematic_arc_id: "arc",
      center: { x: 0.2, y: 0 },
      radius: 0.2,
      start_angle_degrees: 0,
      end_angle_degrees: 90,
    }),
  ]
  expect(convertCircuitJsonToSchematicSvg(symbol)).toMatchSvgSnapshot(
    import.meta.path,
    "before",
  )
  transformSchematicElements(symbol, compose(translate(3, -2), rotateDEG(270)))
  expect(convertCircuitJsonToSchematicSvg(symbol)).toMatchSvgSnapshot(
    import.meta.path,
    "after",
  )
})
