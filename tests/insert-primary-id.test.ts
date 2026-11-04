import { expect, test } from "bun:test"
import type { AnyCircuitElement, PcbTrace } from "circuit-json"
import { cju } from "../index"

const typecheckInsertPrimaryId = () => {
  const db = cju([])
  db.pcb_trace.insert({ route: [] })
  db.pcb_trace.insert({ pcb_trace_id: "pcb_trace_from_solver", route: [] })
  // @ts-expect-error insert rejects a primary id for another table.
  db.pcb_trace.insert({ pcb_via_id: "pcb_via_1", route: [] })

  const unparsedVia = cju.unparsed([]).pcb_via.insert({
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

test("insert preserves usable primary ids and generates collision-free ids", () => {
  const circuitJson: AnyCircuitElement[] = [
    {
      type: "pcb_trace",
      pcb_trace_id: "pcb_trace_router__section_9",
      route: [],
    },
    {
      type: "pcb_trace",
      pcb_trace_id: "pcb_trace_007",
      route: [],
    },
  ]
  const db = cju(circuitJson)

  expect(db.pcb_trace.insert({ route: [] }).pcb_trace_id).toBe("pcb_trace_0")

  const arbitraryIdTrace: PcbTrace = db.pcb_trace.insert({
    pcb_trace_id: "autorouter-output-main",
    route: [],
  })
  expect(arbitraryIdTrace.pcb_trace_id).toBe("autorouter-output-main")
  const normalizedTableType = db.pcb_trace.insert({
    type: "pcb_via",
    pcb_trace_id: "table-type-is-authoritative",
    route: [],
  } as never)
  expect(normalizedTableType.type).toBe("pcb_trace")

  expect(
    db.pcb_trace.insert({ pcb_trace_id: "pcb_trace_7", route: [] })
      .pcb_trace_id,
  ).toBe("pcb_trace_7")

  const lengthBeforeDuplicate = circuitJson.length
  const editCountBeforeDuplicate = db.editCount
  expect(() =>
    db.pcb_trace.insert({
      pcb_trace_id: "autorouter-output-main",
      route: [],
    }),
  ).toThrow(
    'Cannot insert pcb_trace: primary ID "autorouter-output-main" is already used by pcb_trace (pcb_trace_id)',
  )
  expect(circuitJson).toHaveLength(lengthBeforeDuplicate)
  expect(db.editCount).toBe(editCountBeforeDuplicate)

  const viaWithSharedId = db.pcb_via.insert({
    pcb_via_id: "shared-primary-id",
    x: 0,
    y: 0,
    outer_diameter: 0.6,
    hole_diameter: 0.3,
    layers: ["top", "bottom"],
  })
  const traceWithCrossTypeSharedId = db.pcb_trace.insert({
    pcb_trace_id: "shared-primary-id",
    route: [],
  })
  expect(db.pcb_via.get("shared-primary-id")).toBe(viaWithSharedId)
  expect(db.pcb_trace.get("shared-primary-id")).toBe(traceWithCrossTypeSharedId)

  expect(db.pcb_trace.insert({ route: [] }).pcb_trace_id).toBe("pcb_trace_8")
  expect(
    db.pcb_trace.insert({ pcb_trace_id: "", route: [] }).pcb_trace_id,
  ).toBe("pcb_trace_9")
  expect(
    db.pcb_trace.insert({ pcb_trace_id: undefined, route: [] }).pcb_trace_id,
  ).toBe("pcb_trace_10")
  expect(
    db.pcb_trace.insert({ pcb_trace_id: null, route: [] } as never)
      .pcb_trace_id,
  ).toBe("pcb_trace_11")

  // Root insertion deliberately replaces IDs supplied by simulation engines.
  const rootInsertedTrace = db.insert({
    type: "pcb_trace",
    pcb_trace_id: "pcb_trace_400",
    route: [],
  })
  expect((rootInsertedTrace as PcbTrace).pcb_trace_id).toBe("pcb_trace_12")
  const [secondRootInsertedTrace, thirdRootInsertedTrace] = db.insertAll([
    {
      type: "pcb_trace",
      pcb_trace_id: "pcb_trace_999",
      route: [],
    },
    {
      type: "pcb_trace",
      pcb_trace_id: "pcb_trace_999",
      route: [],
    },
  ])
  expect((secondRootInsertedTrace as PcbTrace).pcb_trace_id).toBe(
    "pcb_trace_13",
  )
  expect((thirdRootInsertedTrace as PcbTrace).pcb_trace_id).toBe("pcb_trace_14")
  expect(
    db.pcb_trace.insert({ pcb_trace_id: "pcb_trace_15", route: [] })
      .pcb_trace_id,
  ).toBe("pcb_trace_15")
  expect(db.pcb_trace.insert({ route: [] }).pcb_trace_id).toBe("pcb_trace_16")

  const stateBeforeInvalidId = [...circuitJson]
  const editCountBeforeInvalidId = db.editCount
  expect(() =>
    db.pcb_trace.insert({ pcb_trace_id: 123, route: [] } as never),
  ).toThrow(
    "insert requires pcb_trace_id to be a non-empty string when provided",
  )
  expect(circuitJson).toEqual(stateBeforeInvalidId)
  expect(db.editCount).toBe(editCountBeforeInvalidId)
  expect(db.pcb_trace.insert({ route: [] }).pcb_trace_id).toBe("pcb_trace_17")
  expect(typeof typecheckInsertPrimaryId).toBe("function")
})

test("failed validation does not reserve an explicit or generated id", () => {
  const circuitJson: AnyCircuitElement[] = []
  const db = cju(circuitJson, { validateInserts: true })

  expect(() =>
    db.pcb_port.insert({
      pcb_port_id: "pcb_port_42",
      // @ts-expect-error validating the invalid layer shape is intentional.
      layers: "top",
      pcb_component_id: "",
      source_port_id: "source_port_0",
      x: 0,
      y: 0,
    }),
  ).toThrow()
  expect(() =>
    db.pcb_port.insert({
      // @ts-expect-error validating the invalid layer shape is intentional.
      layers: "top",
      pcb_component_id: "",
      source_port_id: "source_port_0",
      x: 0,
      y: 0,
    }),
  ).toThrow()

  expect(circuitJson).toHaveLength(0)
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
