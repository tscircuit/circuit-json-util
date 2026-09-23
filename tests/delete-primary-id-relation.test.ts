import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { cju, cjuIndexed } from "../index"

const makeCircuitJson = (): AnyCircuitElement[] => [
  {
    type: "pcb_trace_error",
    pcb_trace_error_id: "pcb_trace_0",
    error_type: "pcb_trace_error",
    message: "trace error intentionally references the trace ID",
    pcb_trace_id: "pcb_trace_0",
    source_trace_id: "source_trace_0",
    pcb_component_ids: [],
    pcb_port_ids: [],
  },
  {
    type: "pcb_trace",
    pcb_trace_id: "pcb_trace_0",
    route: [],
  },
]

test("table delete ignores another element type's relation and primary IDs", () => {
  for (const getDb of [
    (circuitJson: AnyCircuitElement[]) => cju(circuitJson),
    (circuitJson: AnyCircuitElement[]) => cjuIndexed(circuitJson),
  ]) {
    const circuitJson = makeCircuitJson()
    const db = getDb(circuitJson)

    db.pcb_trace.delete("pcb_trace_0")

    expect(db.pcb_trace.get("pcb_trace_0")).toBeFalsy()
    expect(db.pcb_trace_error.get("pcb_trace_0")).toBeTruthy()
    expect(
      db.pcb_trace.insert({ pcb_trace_id: "pcb_trace_0", route: [] })
        .pcb_trace_id,
    ).toBe("pcb_trace_0")
  }
})
