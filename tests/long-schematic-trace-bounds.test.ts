import { test, expect } from "bun:test"
import { getSchematicElementBounds } from "lib/get-schematic-element-bounds"
import type { SchematicTrace } from "circuit-json"

const makeTrace = (segments: number): SchematicTrace => ({
  type: "schematic_trace",
  schematic_trace_id: "trace",
  edges: Array.from({ length: segments }, (_, i) => ({
    from: { x: i, y: i % 2 },
    to: { x: i + 1, y: (i + 1) % 2 },
  })),
  junctions: [],
})

test("long schematic trace (100k segments) bounds in Node without RangeError", () => {
  const trace = makeTrace(100_000)
  const bounds = getSchematicElementBounds(trace)
  expect(bounds).not.toBeNull()
  expect(bounds!.minX).toBe(-0.05)
  expect(bounds!.maxX).toBe(100_000 + 0.05)
})

test("junction-only trace bounds", () => {
  const trace: SchematicTrace = {
    type: "schematic_trace",
    schematic_trace_id: "trace",
    edges: [],
    junctions: [{ x: 3, y: 4 }],
  }
  const bounds = getSchematicElementBounds(trace)
  expect(bounds).not.toBeNull()
  expect(bounds!.minX).toBe(3 - 0.05)
  expect(bounds!.maxX).toBe(3 + 0.05)
  expect(bounds!.minY).toBe(4 - 0.05)
  expect(bounds!.maxY).toBe(4 + 0.05)
})

test("empty trace still returns null", () => {
  const trace: SchematicTrace = {
    type: "schematic_trace",
    schematic_trace_id: "trace",
    edges: [],
    junctions: [],
  }
  expect(getSchematicElementBounds(trace)).toBeNull()
})
