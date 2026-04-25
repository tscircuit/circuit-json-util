import type { AnyCircuitElement } from "circuit-json"
import { getSchematicGroupSize } from "../lib/get-schematic-group-size"
import { test, expect } from "bun:test"

const makeCircuitJson = (): AnyCircuitElement[] => [
  {
    type: "source_group",
    source_group_id: "g1",
  } as any,
  {
    type: "source_group",
    source_group_id: "g2",
    parent_source_group_id: "g1",
  } as any,
  {
    type: "schematic_component",
    schematic_component_id: "sc1",
    source_component_id: "scomp1",
    source_group_id: "g1",
    center: { x: 0, y: 0 },
    width: 2,
    height: 2,
  } as any,
  {
    type: "schematic_component",
    schematic_component_id: "sc2",
    source_component_id: "scomp2",
    source_group_id: "g2",
    center: { x: 6, y: 0 },
    width: 2,
    height: 2,
  } as any,
]

test("getSchematicGroupSize returns width and height for a group with components", () => {
  const circuitJson = makeCircuitJson()
  const size = getSchematicGroupSize(circuitJson, "g1")

  expect(size).not.toBeNull()
  // sc1 at x=0 with width=2 → x span [-1, 1]
  // sc2 at x=6 with width=2 → x span [5, 7]
  // total width = 7 - (-1) = 8
  expect(size!.width).toBeCloseTo(8)
  // both at y=0 with height=2 → y span [-1, 1]
  expect(size!.height).toBeCloseTo(2)
  // center x = (-1 + 7) / 2 = 3
  expect(size!.center.x).toBeCloseTo(3)
  expect(size!.center.y).toBeCloseTo(0)
})

test("getSchematicGroupSize returns size for nested group only (g2)", () => {
  const circuitJson = makeCircuitJson()
  const size = getSchematicGroupSize(circuitJson, "g2")

  expect(size).not.toBeNull()
  // sc2 at x=6 with width=2 → x span [5, 7], width=2
  expect(size!.width).toBeCloseTo(2)
  expect(size!.height).toBeCloseTo(2)
  expect(size!.center.x).toBeCloseTo(6)
})

test("getSchematicGroupSize returns null when group has no schematic elements", () => {
  const circuitJson: AnyCircuitElement[] = [
    {
      type: "source_group",
      source_group_id: "empty_group",
    } as any,
  ]

  const size = getSchematicGroupSize(circuitJson, "empty_group")
  expect(size).toBeNull()
})
