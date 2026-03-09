export type DrcCategory = "netlist" | "placement" | "routing" | "unknown"

type DrcLike = {
  type?: string
  error_type?: string
  warning_type?: string
}

const NETLIST_TYPES = new Set(["source_pin_must_be_connected_error"])

const PLACEMENT_TYPES = new Set([
  "pcb_placement_error",
  "pcb_component_outside_board_error",
  "pcb_footprint_overlap_error",
  "pcb_connector_not_in_accessible_orientation_warning",
])

const ROUTING_TYPES = new Set([
  "pcb_port_not_connected_error",
  "pcb_trace_missing_error",
  "pcb_trace_error",
  "pcb_via_clearance_error",
])

export const categorizeErrorOrWarning = (
  value: string | DrcLike,
): DrcCategory => {
  const drcType =
    typeof value === "string"
      ? value
      : (value.error_type ?? value.warning_type ?? value.type)

  if (!drcType) return "unknown"

  if (NETLIST_TYPES.has(drcType)) return "netlist"
  if (PLACEMENT_TYPES.has(drcType)) return "placement"
  if (ROUTING_TYPES.has(drcType)) return "routing"

  return "unknown"
}
