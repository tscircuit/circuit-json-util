import { expect, test } from "bun:test"
import { getBoundsOfPcbElements } from "lib/get-bounds-of-pcb-elements"
import type { AnyCircuitElement } from "circuit-json"

test("getBoundsOfPcbElements includes hole_with_polygon_pad copper outline (circuit-json-util#155)", () => {
  const elements: AnyCircuitElement[] = [
    {
      type: "pcb_plated_hole",
      pcb_plated_hole_id: "poly_hole_1",
      shape: "hole_with_polygon_pad",
      x: 0,
      y: 0,
      hole_shape: "circle",
      hole_diameter: 1,
      hole_offset_x: 4,
      hole_offset_y: 0,
      pad_outline: [
        { x: -3, y: -0.5 },
        { x: 3, y: -0.5 },
        { x: 3, y: 0.5 },
        { x: -3, y: 0.5 },
      ],
      layers: ["top", "bottom"],
    },
  ]

  const bounds = getBoundsOfPcbElements(elements)

  // Pad outline spans x from -3 to +3, hole offset is at +4 with diameter 1 (drill spans 3.5 to 4.5).
  // Total bounds should cover -3 to 4.5 on x, and -0.5 to 0.5 on y.
  expect(bounds.minX).toBeLessThanOrEqual(-3)
  expect(bounds.maxX).toBeGreaterThanOrEqual(4.5)
  expect(bounds.minY).toBeLessThanOrEqual(-0.5)
  expect(bounds.maxY).toBeGreaterThanOrEqual(0.5)
})
