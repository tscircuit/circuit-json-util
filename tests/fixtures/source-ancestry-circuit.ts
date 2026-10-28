import {
  type AnyCircuitElement,
  pcb_board,
  pcb_trace,
  pcb_via,
  source_group,
  source_trace,
} from "circuit-json"

export type SourceAncestry =
  | "absent"
  | "omitted"
  | "missing"
  | "missing_parent"
  | "cycle"
  | "valid_parent"
  | "valid"

export interface SourceAncestryOptions {
  source: SourceAncestry
  boardCount: 0 | 1 | 2
  physicalSubcircuitId?: string
  missingPhysicalParent?: "group" | "component"
}

export const makeSourceAncestryCircuit = (
  options: SourceAncestryOptions,
): AnyCircuitElement[] => {
  const circuit: AnyCircuitElement[] = []
  for (const side of ["A", "B"].slice(0, options.boardCount)) {
    circuit.push(
      pcb_board.parse({
        type: "pcb_board",
        pcb_board_id: `board_${side}`,
        subcircuit_id: `subcircuit_${side}`,
        center: { x: side === "A" ? 0 : 20, y: 0 },
        width: 10,
        height: 10,
        thickness: 1.6,
        num_layers: 2,
        min_via_hole_diameter: side === "A" ? 0.4 : 0.5,
        min_via_pad_diameter: side === "A" ? 0.8 : 1,
      }),
    )
  }
  if (options.source !== "absent") {
    circuit.push(
      source_trace.parse({
        type: "source_trace",
        source_trace_id: "source_trace_A",
        connected_source_port_ids: [],
        connected_source_net_ids: [],
        subcircuit_id:
          options.source === "valid"
            ? "subcircuit_A"
            : options.source === "omitted"
              ? undefined
              : options.source === "missing"
                ? "missing"
                : "child_A",
      }),
    )
  }
  if (
    options.source === "missing_parent" ||
    options.source === "cycle" ||
    options.source === "valid_parent"
  ) {
    circuit.push(
      source_group.parse({
        type: "source_group",
        source_group_id: "source_group_A",
        subcircuit_id: "child_A",
        is_subcircuit: true,
        parent_subcircuit_id:
          options.source === "cycle"
            ? "child_A"
            : options.source === "valid_parent"
              ? "subcircuit_A"
              : "missing_parent",
      }),
    )
  }
  circuit.push(
    source_trace.parse({
      type: "source_trace",
      source_trace_id: "source_trace_B",
      subcircuit_id: "subcircuit_B",
      connected_source_port_ids: [],
      connected_source_net_ids: [],
    }),
    pcb_trace.parse({
      type: "pcb_trace",
      pcb_trace_id: "trace_A",
      source_trace_id: "source_trace_A",
      subcircuit_id: options.physicalSubcircuitId,
      pcb_group_id:
        options.missingPhysicalParent === "group" ? "missing_group" : undefined,
      pcb_component_id:
        options.missingPhysicalParent === "component"
          ? "missing_component"
          : undefined,
      route: [
        {
          route_type: "via",
          x: 0,
          y: 0,
          from_layer: "top",
          to_layer: "bottom",
        },
      ],
    }),
    pcb_via.parse({
      type: "pcb_via",
      pcb_via_id: "via_direct",
      source_trace_id: "source_trace_A",
      subcircuit_id: options.physicalSubcircuitId,
      pcb_group_id:
        options.missingPhysicalParent === "group" ? "missing_group" : undefined,
      pcb_trace_id:
        options.missingPhysicalParent === "component"
          ? "missing_trace"
          : undefined,
      x: 2,
      y: 0,
      layers: ["top", "bottom"],
      hole_diameter: 0.4,
      outer_diameter: 0.8,
    }),
    pcb_via.parse({
      type: "pcb_via",
      pcb_via_id: "via_indirect",
      pcb_trace_id: "trace_A",
      source_trace_id: "source_trace_B",
      x: 4,
      y: 0,
      layers: ["top", "bottom"],
      hole_diameter: 0.4,
      outer_diameter: 0.8,
    }),
  )
  return circuit
}

export const sourceAncestryCases: Array<{
  name: string
  options: SourceAncestryOptions
  expectedOwner?: "board_A" | "board_B"
}> = []
for (const source of [
  "absent",
  "omitted",
  "missing",
  "missing_parent",
  "cycle",
  "valid_parent",
  "valid",
] as const) {
  for (const boardCount of [1, 2] as const) {
    sourceAncestryCases.push({
      name: `${boardCount} board(s), source ${source}`,
      options: { source, boardCount },
      expectedOwner:
        boardCount === 1 || source === "valid" || source === "valid_parent"
          ? "board_A"
          : undefined,
    })
  }
}
sourceAncestryCases.push(
  { name: "no board", options: { source: "valid", boardCount: 0 } },
  {
    name: "explicit physical board wins",
    options: {
      source: "valid",
      boardCount: 2,
      physicalSubcircuitId: "subcircuit_B",
    },
    expectedOwner: "board_B",
  },
  ...([1, 2] as const).map((boardCount) => ({
    name: `${boardCount} board(s), unresolved explicit physical subcircuit`,
    options: {
      source: "valid" as const,
      boardCount,
      physicalSubcircuitId: "missing",
    },
  })),
  ...([1, 2] as const).flatMap((boardCount) =>
    (["group", "component"] as const).map((missingPhysicalParent) => ({
      name: `${boardCount} board(s), unresolved explicit physical ${missingPhysicalParent}`,
      options: { source: "valid" as const, boardCount, missingPhysicalParent },
    })),
  ),
)
