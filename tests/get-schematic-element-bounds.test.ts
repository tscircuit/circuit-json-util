import { expect, test } from "bun:test"
import type {
  SchematicComponent,
  SchematicNetLabel,
  SchematicTrace,
} from "circuit-json"
import {
  type SchematicElementBounds,
  getSchematicElementBounds,
} from "../lib/get-schematic-element-bounds"

const expectBoundsToBeCloseTo = (
  actual: SchematicElementBounds | null,
  expected: SchematicElementBounds,
) => {
  expect(actual).not.toBeNull()
  expect(actual!.minX).toBeCloseTo(expected.minX)
  expect(actual!.minY).toBeCloseTo(expected.minY)
  expect(actual!.maxX).toBeCloseTo(expected.maxX)
  expect(actual!.maxY).toBeCloseTo(expected.maxY)
  expect(actual!.width).toBeCloseTo(expected.width)
  expect(actual!.height).toBeCloseTo(expected.height)
  expect(actual!.center.x).toBeCloseTo(expected.center.x)
  expect(actual!.center.y).toBeCloseTo(expected.center.y)
}

const makeNetLabel = (
  anchorSide: SchematicNetLabel["anchor_side"],
  anchorPosition?: { x: number; y: number },
): SchematicNetLabel => ({
  type: "schematic_net_label",
  schematic_net_label_id: `label_${anchorSide}`,
  source_net_id: "source_net_0",
  center: { x: 4, y: 5 },
  anchor_position: anchorPosition,
  anchor_side: anchorSide,
  text: "VCC",
})

test("getSchematicElementBounds computes component bounds", () => {
  const component = {
    type: "schematic_component",
    schematic_component_id: "component_0",
    center: { x: 2, y: -3 },
    size: { width: 4, height: 6 },
    is_box_with_pins: true,
  } as SchematicComponent

  expectBoundsToBeCloseTo(getSchematicElementBounds(component), {
    minX: 0,
    minY: -6,
    maxX: 4,
    maxY: 0,
    width: 4,
    height: 6,
    center: { x: 2, y: -3 },
  })
})

test.each([
  [
    "left",
    {
      minX: 1,
      minY: 1.9,
      maxX: 1.48,
      maxY: 2.1,
      width: 0.48,
      height: 0.2,
      center: { x: 1.24, y: 2 },
    },
  ],
  [
    "right",
    {
      minX: 0.52,
      minY: 1.9,
      maxX: 1,
      maxY: 2.1,
      width: 0.48,
      height: 0.2,
      center: { x: 0.76, y: 2 },
    },
  ],
  [
    "top",
    {
      minX: 0.9,
      minY: 1.52,
      maxX: 1.1,
      maxY: 2,
      width: 0.2,
      height: 0.48,
      center: { x: 1, y: 1.76 },
    },
  ],
  [
    "bottom",
    {
      minX: 0.9,
      minY: 2,
      maxX: 1.1,
      maxY: 2.48,
      width: 0.2,
      height: 0.48,
      center: { x: 1, y: 2.24 },
    },
  ],
] as const)("computes %s-anchored net label bounds", (side, expected) => {
  expectBoundsToBeCloseTo(
    getSchematicElementBounds(makeNetLabel(side, { x: 1, y: 2 })),
    expected,
  )
})

test("uses a net label's center when anchor_position is absent", () => {
  expectBoundsToBeCloseTo(getSchematicElementBounds(makeNetLabel("top")), {
    minX: 3.9,
    minY: 4.76,
    maxX: 4.1,
    maxY: 5.24,
    width: 0.2,
    height: 0.48,
    center: { x: 4, y: 5 },
  })
})

test("computes trace bounds from edges and junctions with trace width", () => {
  const trace: SchematicTrace = {
    type: "schematic_trace",
    schematic_trace_id: "trace_0",
    edges: [
      {
        from: { x: -2, y: 1 },
        to: { x: 3, y: 4 },
      },
    ],
    junctions: [{ x: 1, y: -1 }],
  }

  expectBoundsToBeCloseTo(getSchematicElementBounds(trace), {
    minX: -2.05,
    minY: -1.05,
    maxX: 3.05,
    maxY: 4.05,
    width: 5.1,
    height: 5.1,
    center: { x: 0.5, y: 1.5 },
  })
})

test("returns null for an empty trace", () => {
  const trace: SchematicTrace = {
    type: "schematic_trace",
    schematic_trace_id: "trace_0",
    edges: [],
    junctions: [],
  }

  expect(getSchematicElementBounds(trace)).toBeNull()
})
