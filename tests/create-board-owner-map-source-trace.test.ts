import { expect, test } from "bun:test"
import {
  type AnyCircuitElement,
  pcb_board,
  pcb_trace,
  pcb_via,
  source_trace,
} from "circuit-json"
import { createBoardOwnerMap } from "../index"

const makeCircuit = () => {
  const boardA = pcb_board.parse({
    type: "pcb_board",
    pcb_board_id: "board_A",
    subcircuit_id: "subcircuit_A",
    center: { x: 0, y: 0 },
    width: 10,
    height: 10,
    thickness: 1.6,
    num_layers: 2,
    min_via_hole_diameter: 0.4,
    min_via_pad_diameter: 0.8,
  })
  const boardB = pcb_board.parse({
    ...boardA,
    pcb_board_id: "board_B",
    subcircuit_id: "subcircuit_B",
    center: { x: 20, y: 0 },
  })
  const trace = pcb_trace.parse({
    type: "pcb_trace",
    pcb_trace_id: "trace_A",
    source_trace_id: "source_trace_A",
    route: [
      { route_type: "via", x: 0, y: 0, from_layer: "top", to_layer: "bottom" },
    ],
  })
  const via = pcb_via.parse({
    type: "pcb_via",
    pcb_via_id: "via_B",
    source_trace_id: "source_trace_B",
    x: 20,
    y: 0,
    layers: ["top", "bottom"],
    hole_diameter: 0.4,
    outer_diameter: 0.8,
  })
  const circuit: AnyCircuitElement[] = [boardA, boardB]
  for (const side of ["A", "B"]) {
    circuit.push(
      source_trace.parse({
        type: "source_trace",
        source_trace_id: `source_trace_${side}`,
        subcircuit_id: `subcircuit_${side}`,
        connected_source_port_ids: [],
        connected_source_net_ids: [],
      }),
    )
  }
  circuit.push(trace, via)
  return { circuit, boardA, boardB, trace, via }
}

test.each([false, true])(
  "source traces identify physical trace and via owners (reversed: %s)",
  (reversed) => {
    const { circuit, boardA, boardB } = makeCircuit()
    const owners = createBoardOwnerMap(reversed ? circuit.reverse() : circuit)
    expect(owners.get("trace_A")).toBe(boardA)
    expect(owners.get("via_B")).toBe(boardB)
  },
)

test("explicit physical ownership takes priority over source trace ownership", () => {
  const { circuit, boardB, trace, via } = makeCircuit()
  circuit.push(
    pcb_trace.parse({
      ...trace,
      pcb_trace_id: "trace_override",
      subcircuit_id: "subcircuit_B",
    }),
    pcb_via.parse({
      ...via,
      pcb_via_id: "via_override",
      source_trace_id: "source_trace_A",
      pcb_trace_id: "trace_override",
    }),
  )
  const owners = createBoardOwnerMap(circuit)
  expect(owners.get("trace_override")).toBe(boardB)
  expect(owners.get("via_override")).toBe(boardB)
})

test("missing source traces retain the existing single-board fallback", () => {
  const { boardA, boardB, trace, via } = makeCircuit()
  const owners = createBoardOwnerMap([boardA, trace, via])
  expect(owners.get("trace_A")).toBe(boardA)
  expect(owners.get("via_B")).toBe(boardA)
  const panelOwners = createBoardOwnerMap([boardA, boardB, trace, via])
  expect(panelOwners.get("trace_A")).toBeUndefined()
  expect(panelOwners.get("via_B")).toBeUndefined()
})
