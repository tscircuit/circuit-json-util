import { expect, test } from "bun:test"
import { type SchematicPort, schematic_port } from "circuit-json"
import { compose, rotateDEG, scale, translate } from "transformation-matrix"
import { transformSchematicElement } from "../index"

const directions = ["up", "down", "left", "right"] as const

test.each([
  ["translation", translate(10, -5), [11, -3], directions],
  ["quarter turn", rotateDEG(90), [-2, 1], ["left", "right", "down", "up"]],
  [
    "clockwise quarter turn",
    rotateDEG(-90),
    [2, -1],
    ["right", "left", "up", "down"],
  ],
  ["half turn", rotateDEG(180), [-1, -2], ["down", "up", "right", "left"]],
  [
    "horizontal reflection",
    scale(-1, 1),
    [-1, 2],
    ["up", "down", "right", "left"],
  ],
  [
    "vertical reflection",
    scale(1, -1),
    [1, -2],
    ["down", "up", "left", "right"],
  ],
  [
    "translated and rotated reflection",
    compose(translate(10, 20), rotateDEG(90), scale(2, -3)),
    [16, 22],
    ["right", "left", "down", "up"],
  ],
] as const)(
  "keeps port position and facing consistent through %s",
  (_, matrix, center, facing) => {
    for (const [index, direction] of directions.entries()) {
      const port: SchematicPort = schematic_port.parse({
        type: "schematic_port",
        schematic_port_id: "schematic_port_1",
        schematic_component_id: "schematic_component_1",
        source_port_id: "source_port_1",
        center: { x: 1, y: 2 },
        facing_direction: direction,
      })

      expect(transformSchematicElement(port, matrix)).toBe(port)

      expect(port.center.x).toBeCloseTo(center[0])
      expect(port.center.y).toBeCloseTo(center[1])
      expect(port.facing_direction).toBe(facing[index])
      expect(port.source_port_id).toBe("source_port_1")
    }
  },
)

test("reflects a port without adding an unspecified facing direction", () => {
  const port = schematic_port.parse({
    type: "schematic_port",
    schematic_port_id: "schematic_port_1",
    schematic_component_id: "schematic_component_1",
    source_port_id: "source_port_1",
    center: { x: 1, y: 2 },
  })

  transformSchematicElement(port, scale(1, -1))

  expect(port.center).toEqual({ x: 1, y: -2 })
  expect(port.facing_direction).toBeUndefined()
})
