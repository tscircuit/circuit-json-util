import { pcb_via, type AnyCircuitElement } from "circuit-json"
import { createBoardOwnerMap } from "./create-board-owner-map"

/** Convert legacy route vias into physical geometry before rendering.
 * Coordinates remain board-space millimetres; the input is not mutated.
 * Caller-supplied defaults are used only when route and board dimensions are absent.
 */
export function normalizePcbTraceVias({
  circuitJson,
  defaultViaDimensions,
}: {
  circuitJson: readonly AnyCircuitElement[]
  defaultViaDimensions: { holeDiameter: number; outerDiameter: number }
}): AnyCircuitElement[] {
  const normalized = [...circuitJson]
  const boardOwners = createBoardOwnerMap(normalized)
  const vias = normalized.filter((element) => element.type === "pcb_via")
  for (const trace of circuitJson) {
    if (trace.type !== "pcb_trace") continue
    const board = boardOwners.get(trace.pcb_trace_id)
    for (const [routeIndex, point] of trace.route.entries()) {
      if (point.route_type !== "via") continue
      if (
        vias.some(
          (via) =>
            boardOwners.get(via.pcb_via_id) === board &&
            via.x === point.x &&
            via.y === point.y &&
            via.layers.includes(point.from_layer) &&
            via.layers.includes(point.to_layer),
        )
      )
        continue
      const stack = [
        "top",
        ...Array.from(
          { length: Math.max(0, (board?.num_layers ?? 2) - 2) },
          (_, index) => `inner${index + 1}`,
        ),
        "bottom",
      ]
      const fromLayerIndex = stack.indexOf(point.from_layer)
      const toLayerIndex = stack.indexOf(point.to_layer)
      const layers =
        fromLayerIndex < 0 || toLayerIndex < 0
          ? [point.from_layer, point.to_layer]
          : stack.slice(
              Math.min(fromLayerIndex, toLayerIndex),
              Math.max(fromLayerIndex, toLayerIndex) + 1,
            )
      if (
        fromLayerIndex >= 0 &&
        toLayerIndex >= 0 &&
        fromLayerIndex > toLayerIndex
      )
        layers.reverse()
      const baseViaId = `${trace.pcb_trace_id}_route_via_${routeIndex}`
      let viaId = baseViaId
      let suffix = 0
      while (vias.some((via) => via.pcb_via_id === viaId)) {
        viaId = `${baseViaId}_${++suffix}`
      }
      const via = pcb_via.parse({
        type: "pcb_via",
        pcb_via_id: viaId,
        pcb_trace_id: trace.pcb_trace_id,
        pcb_group_id: trace.pcb_group_id,
        subcircuit_id: trace.subcircuit_id,
        x: point.x,
        y: point.y,
        hole_diameter:
          point.hole_diameter ??
          board?.min_via_hole_diameter ??
          defaultViaDimensions.holeDiameter,
        outer_diameter:
          point.outer_diameter ??
          board?.min_via_pad_diameter ??
          defaultViaDimensions.outerDiameter,
        layers,
        from_layer: point.from_layer,
        to_layer: point.to_layer,
        tented_on_top: point.tented_on_top,
        tented_on_bottom: point.tented_on_bottom,
      })
      normalized.push(via)
      vias.push(via)
      boardOwners.set(via.pcb_via_id, board)
    }
  }
  return normalized
}
