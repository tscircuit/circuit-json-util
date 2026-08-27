import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { cju, cjuIndexed } from "../index"

test("cju and cjuIndexed share primary id reservations and counters", () => {
  const circuitJson: AnyCircuitElement[] = []
  const regularDb = cju(circuitJson)
  const indexedDb = cjuIndexed(circuitJson, {
    indexConfig: { byId: true, byType: true },
  })

  regularDb.pcb_trace.insert({ pcb_trace_id: "pcb_trace_100", route: [] })

  const indexedEditCountBeforeDuplicate = indexedDb.editCount
  expect(() =>
    indexedDb.pcb_trace.insert({
      pcb_trace_id: "pcb_trace_100",
      route: [],
    }),
  ).toThrow(
    'Cannot insert pcb_trace: primary ID "pcb_trace_100" is already used by pcb_trace (pcb_trace_id)',
  )
  expect(indexedDb.editCount).toBe(indexedEditCountBeforeDuplicate)

  const indexedTrace = indexedDb.pcb_trace.insert({ route: [] })
  expect(indexedTrace.pcb_trace_id).toBe("pcb_trace_101")
  expect(indexedDb.pcb_trace.get("pcb_trace_101")).toBe(indexedTrace)

  indexedDb.pcb_trace.insert({ pcb_trace_id: "pcb_trace_200", route: [] })

  const regularTrace = regularDb.pcb_trace.insert({ route: [] })
  expect(regularTrace.pcb_trace_id).toBe("pcb_trace_201")

  circuitJson.push({
    type: "pcb_trace",
    pcb_trace_id: "pcb_trace_300",
    route: [],
  })
  const traceAfterExternalPush = regularDb.pcb_trace.insert({ route: [] })
  expect(traceAfterExternalPush.pcb_trace_id).toBe("pcb_trace_301")
  expect(
    circuitJson
      .filter((element) => element.type === "pcb_trace")
      .map((trace) => trace.pcb_trace_id),
  ).toEqual([
    "pcb_trace_100",
    "pcb_trace_101",
    "pcb_trace_200",
    "pcb_trace_201",
    "pcb_trace_300",
    "pcb_trace_301",
  ])
})
