import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { cju } from "../index"

test("a subtree primary id update invalidates the parent registry", () => {
  const circuitJson: AnyCircuitElement[] = [
    {
      type: "pcb_trace",
      pcb_trace_id: "old-subtree-id",
      route: [],
      subcircuit_id: "sub-a",
    },
  ]
  const rootDb = cju(circuitJson)

  rootDb.pcb_trace.insert({
    pcb_trace_id: "root-registry-sentinel",
    route: [],
  })
  const subtreeDb = rootDb.subtree({ subcircuit_id: "sub-a" })
  subtreeDb.pcb_trace.update("old-subtree-id", {
    pcb_trace_id: "new-subtree-id",
  })

  expect(() =>
    rootDb.pcb_trace.insert({
      pcb_trace_id: "new-subtree-id",
      route: [],
    }),
  ).toThrow(
    'Cannot insert pcb_trace: primary ID "new-subtree-id" is already used by pcb_trace (pcb_trace_id)',
  )
  expect(
    rootDb.pcb_trace.insert({
      pcb_trace_id: "old-subtree-id",
      route: [],
    }).pcb_trace_id,
  ).toBe("old-subtree-id")
})
