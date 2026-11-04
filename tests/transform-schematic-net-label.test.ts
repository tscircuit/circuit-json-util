import { expect, test } from "bun:test"
import type { AnyCircuitElement, SchematicNetLabel } from "circuit-json"
import { rotateDEG, scale, translate } from "transformation-matrix"
import { repositionSchematicGroupTo } from "../lib/reposition-schematic-group"
import { transformSchematicElement } from "../lib/transform-soup-elements"

const makeLabel = (
  overrides: Partial<SchematicNetLabel> = {},
): SchematicNetLabel => ({
  type: "schematic_net_label",
  schematic_net_label_id: "label_1",
  source_net_id: "net_1",
  center: { x: 2, y: 3 },
  anchor_position: { x: 1, y: 3 },
  anchor_side: "left",
  text: "VCC",
  ...overrides,
})

test("translation moves a net label's center and explicit anchor together", () => {
  const label = makeLabel({ is_movable: false })
  const result = transformSchematicElement(label, translate(10, -5))

  expect(result).toBe(label)
  expect(label.center).toEqual({ x: 12, y: -2 })
  expect(label.anchor_position).toEqual({ x: 11, y: -2 })
  expect(label.anchor_side).toBe("left")
  expect(label.text).toBe("VCC")
  expect(label.source_net_id).toBe("net_1")
  expect(label.is_movable).toBe(false)
})

test("translation preserves an implicit anchor and a symbol name", () => {
  const label = makeLabel({ symbol_name: "vcc_up", anchor_side: "bottom" })
  delete label.anchor_position

  transformSchematicElement(label, translate(-2, 4))

  expect(label.center).toEqual({ x: 0, y: 7 })
  expect("anchor_position" in label).toBe(false)
  expect(label.symbol_name).toBe("vcc_up")
  expect(label.anchor_side).toBe("bottom")
})

test("repositioning a group moves its connected net label only", () => {
  const label = makeLabel()
  const unrelatedLabel = makeLabel({
    schematic_net_label_id: "label_2",
    source_net_id: "net_2",
    center: { x: 100, y: 100 },
  })
  const circuitJson: AnyCircuitElement[] = [
    { type: "source_group", source_group_id: "group_1" },
    {
      type: "source_net",
      source_net_id: "net_1",
      name: "VCC",
      member_source_group_ids: ["group_1"],
    },
    label,
    unrelatedLabel,
  ]

  repositionSchematicGroupTo(circuitJson, "group_1", { x: 12, y: -2 })

  expect(label.center.x).toBeCloseTo(12)
  expect(label.center.y).toBeCloseTo(-2)
  expect(label.anchor_position!.x).toBeCloseTo(11)
  expect(label.anchor_position!.y).toBeCloseTo(-2)
  expect(unrelatedLabel.center).toEqual({ x: 100, y: 100 })
  expect(unrelatedLabel.anchor_position).toEqual({ x: 1, y: 3 })
})

test.each([
  ["counterclockwise quarter turn", rotateDEG(90), [-3, 2], [-3, 1], "bottom"],
  ["clockwise quarter turn", rotateDEG(-90), [3, -2], [3, -1], "top"],
  ["half turn", rotateDEG(180), [-2, -3], [-1, -3], "right"],
  ["horizontal reflection", scale(-1, 1), [-2, 3], [-1, 3], "right"],
  ["vertical reflection", scale(1, -1), [2, -3], [1, -3], "left"],
] as const)(
  "transforms a label through a %s",
  (_, matrix, center, anchor, side) => {
    const label = makeLabel()

    transformSchematicElement(label, matrix)

    expect(label.center.x).toBeCloseTo(center[0])
    expect(label.center.y).toBeCloseTo(center[1])
    expect(label.anchor_position!.x).toBeCloseTo(anchor[0])
    expect(label.anchor_position!.y).toBeCloseTo(anchor[1])
    expect(label.anchor_side).toBe(side)
  },
)

test("rotates an implicit symbol anchor without renaming its glyph", () => {
  const label = makeLabel({ symbol_name: "vcc_up", anchor_side: "bottom" })
  delete label.anchor_position

  transformSchematicElement(label, rotateDEG(90))

  expect(label.center.x).toBeCloseTo(-3)
  expect(label.center.y).toBeCloseTo(2)
  expect(label.anchor_side).toBe("right")
  expect("anchor_position" in label).toBe(false)
  expect(label.symbol_name).toBe("vcc_up")
})
