import { expect, test } from "bun:test"
import type { AnyCircuitElement, PcbTrace } from "circuit-json"
import { cjuIndexed } from "../index"

const typecheckIndexedInsertPrimaryId = () => {
  const unparsedVia = cjuIndexed.unparsed([]).pcb_via.insert({
    pcb_via_id: "pcb_via_from_input",
    x: "1mm",
    y: "2mm",
    layers: ["top", "bottom"],
  })
  const inputFriendlyX: string | number = unparsedVia.x
  const guaranteedPrimaryId: string = unparsedVia.pcb_via_id
  expect(inputFriendlyX).toBe("1mm")
  expect(guaranteedPrimaryId).toBe("pcb_via_from_input")
}

const allIndexes = {
  byId: true,
  byType: true,
  byRelation: true,
  bySubcircuit: true,
  byCustomField: ["route_order_index"],
}

test("cjuIndexed preserves table primary ids and updates its indexes", () => {
  const circuitJson: AnyCircuitElement[] = [
    {
      type: "pcb_trace",
      pcb_trace_id: "pcb_trace_router__section_9",
      route: [],
    },
    {
      type: "pcb_trace",
      pcb_trace_id: "pcb_trace_004",
      route: [],
    },
  ]
  const db = cjuIndexed(circuitJson, { indexConfig: allIndexes })

  expect(db.pcb_trace.insert({ route: [] }).pcb_trace_id).toBe("pcb_trace_0")

  const arbitraryIdTrace: PcbTrace = db.pcb_trace.insert({
    pcb_trace_id: "autorouter-output-main",
    route_order_index: 42,
    subcircuit_id: "sub-a",
    route: [],
  })
  const generatedPatternTrace = db.pcb_trace.insert({
    pcb_trace_id: "pcb_trace_4",
    route: [],
  })

  expect(db.pcb_trace.get("autorouter-output-main")).toBe(arbitraryIdTrace)
  expect(db.pcb_trace.get("pcb_trace_4")).toBe(generatedPatternTrace)
  expect(db.pcb_trace.getWhere({ route_order_index: 42 })).toBe(
    arbitraryIdTrace,
  )
  expect(db.pcb_trace.getWhere({ subcircuit_id: "sub-a" })).toBe(
    arbitraryIdTrace,
  )
  expect(db.pcb_trace.list()).toContain(arbitraryIdTrace)

  const traceErrorWithSharedId = db.pcb_trace_error.insert({
    pcb_trace_error_id: "autorouter-output-main",
    pcb_trace_id: "autorouter-output-main",
    source_trace_id: "source_trace_0",
    pcb_component_ids: [],
    pcb_port_ids: [],
    error_type: "pcb_trace_error",
    message: "intentional cross-type identity reuse",
  })
  expect(db.pcb_trace_error.get("autorouter-output-main")).toBe(
    traceErrorWithSharedId,
  )
  expect(db.pcb_trace.get("autorouter-output-main")).toBe(arbitraryIdTrace)

  expect(db.pcb_trace.insert({ route: [] }).pcb_trace_id).toBe("pcb_trace_5")
  expect(
    db.pcb_trace.insert({ pcb_trace_id: "", route: [] }).pcb_trace_id,
  ).toBe("pcb_trace_6")
  expect(
    db.pcb_trace.insert({ pcb_trace_id: undefined, route: [] }).pcb_trace_id,
  ).toBe("pcb_trace_7")
  expect(
    db.pcb_trace.insert({ pcb_trace_id: null, route: [] } as never)
      .pcb_trace_id,
  ).toBe("pcb_trace_8")

  const listBeforeDuplicate = db.pcb_trace.list()
  const editCountBeforeDuplicate = db.editCount
  expect(() =>
    db.pcb_trace.insert({
      pcb_trace_id: "pcb_trace_4",
      route: [],
    }),
  ).toThrow(
    'Cannot insert pcb_trace: primary ID "pcb_trace_4" is already used by pcb_trace (pcb_trace_id)',
  )
  expect(db.pcb_trace.list()).toEqual(listBeforeDuplicate)
  expect(db.pcb_trace.get("pcb_trace_4")).toBe(generatedPatternTrace)
  expect(db.editCount).toBe(editCountBeforeDuplicate)

  expect(() =>
    db.pcb_trace.insert({ pcb_trace_id: false, route: [] } as never),
  ).toThrow(
    "insert requires pcb_trace_id to be a non-empty string when provided",
  )
  expect(db.pcb_trace.list()).toEqual(listBeforeDuplicate)
  expect(db.editCount).toBe(editCountBeforeDuplicate)
  expect(db.pcb_trace.insert({ route: [] }).pcb_trace_id).toBe("pcb_trace_9")
  expect(typeof typecheckIndexedInsertPrimaryId).toBe("function")
})

test("cjuIndexed validation failure leaves IDs and indexes unchanged", () => {
  const circuitJson: AnyCircuitElement[] = []
  const db = cjuIndexed(circuitJson, {
    validateInserts: true,
    indexConfig: allIndexes,
  })

  expect(() =>
    db.pcb_port.insert({
      pcb_port_id: "pcb_port_20",
      // @ts-expect-error validating the invalid layer shape is intentional.
      layers: "top",
      pcb_component_id: "",
      source_port_id: "source_port_0",
      x: 0,
      y: 0,
    }),
  ).toThrow()
  expect(circuitJson).toHaveLength(0)
  expect(db.pcb_port.list()).toHaveLength(0)
  expect(db.pcb_port.get("pcb_port_20")).toBeNull()
  expect(db.editCount).toBe(0)

  expect(
    db.pcb_port.insert({
      layers: ["top"],
      pcb_component_id: "",
      source_port_id: "source_port_0",
      x: 0,
      y: 0,
    }).pcb_port_id,
  ).toBe("pcb_port_0")
})
