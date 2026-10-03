import { expect, test } from "bun:test"
import { findBoundsAndCenter } from "lib/find-bounds-and-center"
import type { AnyCircuitElement } from "circuit-json"

test("findBoundsAndCenter handles unrouted pcb_trace and schematic_trace without throwing (circuit-json-util#128)", () => {
  const elements: AnyCircuitElement[] = [
    {
      type: "pcb_trace",
      pcb_trace_id: "trace_1",
      source_trace_id: "source_trace_1",
    } as any,
    {
      type: "schematic_trace",
      schematic_trace_id: "sch_trace_1",
      source_trace_id: "source_trace_1",
    } as any,
  ]

  expect(() => findBoundsAndCenter(elements)).not.toThrow()
  const result = findBoundsAndCenter(elements)
  expect(result.width).toBe(0)
  expect(result.height).toBe(0)
})
