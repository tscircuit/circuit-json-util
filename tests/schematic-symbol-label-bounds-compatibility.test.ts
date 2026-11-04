import { expect, test } from "bun:test"
import { schematic_net_label } from "circuit-json"
import { getSchematicElementBounds } from "../lib/get-schematic-element-bounds"

test("plain-text width changes preserve existing symbol-label bounds", () => {
  const cases = [
    {
      side: "left",
      direction: "right",
      anchored: [2, 2.9, 2.48, 3.1],
      centered: [3.76, 4.9, 4.24, 5.1],
    },
    {
      side: "right",
      direction: "left",
      anchored: [1.52, 2.9, 2, 3.1],
      centered: [3.76, 4.9, 4.24, 5.1],
    },
    {
      side: "top",
      direction: "down",
      anchored: [1.9, 2.52, 2.1, 3],
      centered: [3.9, 4.76, 4.1, 5.24],
    },
    {
      side: "bottom",
      direction: "up",
      anchored: [1.9, 3, 2.1, 3.48],
      centered: [3.9, 4.76, 4.1, 5.24],
    },
  ] as const
  for (const { side, direction, anchored, centered } of cases) {
    for (const symbol of ["ground", "vcc"]) {
      for (const useAnchor of [true, false]) {
        const label = schematic_net_label.parse({
          type: "schematic_net_label",
          schematic_net_label_id: "label",
          source_net_id: "net",
          center: { x: 4, y: 5 },
          anchor_position: useAnchor ? { x: 2, y: 3 } : undefined,
          anchor_side: side,
          text: symbol === "ground" ? "GND" : "VCC",
          symbol_name: `${symbol}_${direction}`,
        })
        const bounds = getSchematicElementBounds(label)
        if (!bounds) throw new Error("Label bounds are required")
        const actual = [bounds.minX, bounds.minY, bounds.maxX, bounds.maxY]
        const expected = useAnchor ? anchored : centered
        actual.forEach((value, i) => expect(value).toBeCloseTo(expected[i]!, 8))
      }
    }
  }
})
